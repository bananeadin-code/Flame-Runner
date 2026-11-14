import math
import re
import sqlite3
import threading
import time
from collections import Counter
from datetime import date
from typing import Literal

import anthropic
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .api import AREAS, fts_query, scenario_or_404
from .config import settings
from .db import get_db
from .limits import limiter

router = APIRouter(prefix="/api")

MAX_FINDINGS = 12
MAX_PAGES = 4
LOCAL_COOLDOWN_S = 60
FALLBACK_BETA = "server-side-fallback-2026-07-01"
STOPWORDS = {"the", "and", "for", "with", "what", "how", "does", "are", "was", "were", "this", "that", "from", "into",
             "which", "when", "where", "why", "about", "than", "then", "there", "their", "they", "have", "has"}

REWRITE_SYSTEM = """Rewrite the user's question as a short English keyword query for searching NASA microgravity combustion documents.
Translate to English if needed, keep technical terms, add one or two close synonyms. Reply with the keywords only, at most 15 words, no punctuation."""

ANSWER_SYSTEM = """You are the assistant of a spacecraft fire safety dashboard built on NASA microgravity combustion research.

Answer only with the numbered sources provided in the user message. Each source is a verified finding or a page excerpt from a NASA document.
- Cite every claim with the source number in square brackets, like [2] or [1][4].
- If the sources do not answer the question, say so plainly and suggest what data would be needed. Never use outside knowledge and never invent numbers.
- When a mission scenario is given, explain how the evidence applies to it and point out when the evidence comes from different conditions (for example microgravity tests versus lunar gravity, or 21% versus 34% oxygen).
- Answer in the same language as the user's question, clearly and concisely, in at most about 250 words."""


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    scenario: str | None = None
    area: str | None = Field(None, pattern=f"^({'|'.join(AREAS)})$")
    history: list[Turn] = Field(default_factory=list, max_length=6)


class LLMUnavailable(Exception):
    pass


def terms(text: str) -> list[str]:
    return [w[:7] for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2 and w not in STOPWORDS]


class FindingIndex:
    def __init__(self):
        self.lock = threading.Lock()
        self.items: list[dict] | None = None

    def load(self, db: sqlite3.Connection) -> list[dict]:
        with self.lock:
            if self.items is None:
                rows = db.execute(
                    """SELECT f.id, f.accession, f.statement, f.safety_area, f.finding_type, f.confidence,
                              c.quote, p.page_no, d.id AS document_id, d.title AS document_title
                       FROM findings f JOIN citations c ON c.finding_id = f.id AND c.verified = 1
                       JOIN pages p ON p.id = c.page_id JOIN documents d ON d.id = p.document_id""").fetchall()
                self.items = [dict(r) | {"terms": Counter(terms(r["statement"] + " " + r["quote"]))} for r in rows]
                df = Counter(t for item in self.items for t in item["terms"])
                self.idf = {t: math.log(1 + len(self.items) / n) for t, n in df.items()}
            return self.items

    def search(self, db: sqlite3.Connection, query: str, area: str | None) -> list[dict]:
        items = self.load(db)
        wanted = set(terms(query))
        scored = []
        for item in items:
            if area and item["safety_area"] != area:
                continue
            score = sum(self.idf.get(t, 0) for t in wanted if t in item["terms"]) * (0.5 + (item["confidence"] or 0) / 2)
            if score > 0:
                scored.append((score, item))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [item for _, item in scored[:MAX_FINDINGS]]


finding_index = FindingIndex()


def search_pages(db: sqlite3.Connection, query: str) -> list[dict]:
    sql = """SELECT p.page_no, d.id AS document_id, d.title AS document_title, d.accession,
                    snippet(pages_fts, 0, '', '', '…', 60) AS excerpt
             FROM pages_fts JOIN pages p ON p.id = pages_fts.rowid JOIN documents d ON d.id = p.document_id
             WHERE pages_fts MATCH ? ORDER BY bm25(pages_fts) LIMIT ?"""
    for operator in ("AND", "OR"):
        expression = fts_query(query, operator)
        if expression:
            results = [dict(r) for r in db.execute(sql, (expression, MAX_PAGES)).fetchall()]
            if results:
                return results
    return []


class AnthropicBudget:
    def __init__(self):
        self.lock = threading.Lock()
        self.day, self.calls = date.today(), 0

    def take(self) -> None:
        with self.lock:
            if self.day != date.today():
                self.day, self.calls = date.today(), 0
            if self.calls >= settings.chat_daily_limit:
                raise LLMUnavailable("límite diario del respaldo alcanzado")
            self.calls += 1


anthropic_budget = AnthropicBudget()
anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key or None, max_retries=2)
local_down_until = 0.0


def ask_local(system: str, messages: list[dict], max_tokens: int) -> str:
    global local_down_until
    if not settings.local_llm_url or not settings.local_llm_model:
        raise LLMUnavailable("modelo local no configurado")
    if time.monotonic() < local_down_until:
        raise LLMUnavailable("modelo local en pausa tras un fallo reciente")
    headers = {"Authorization": f"Bearer {settings.local_llm_api_key}"} if settings.local_llm_api_key else {}
    try:
        response = httpx.post(
            f"{settings.local_llm_url}/chat/completions",
            headers=headers,
            timeout=httpx.Timeout(settings.local_llm_timeout, connect=5.0),
            json={"model": settings.local_llm_model, "max_tokens": max_tokens, "temperature": 0.2,
                  "messages": [{"role": "system", "content": system}, *messages]},
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        local_down_until = time.monotonic() + LOCAL_COOLDOWN_S
        raise LLMUnavailable(f"modelo local: {type(exc).__name__}") from exc


def ask_anthropic(system: str, messages: list[dict], max_tokens: int) -> str:
    anthropic_budget.take()
    model = settings.model_chat
    extra = {} if model.startswith("claude-haiku") else {"betas": [FALLBACK_BETA], "fallbacks": "default"}
    try:
        response = anthropic_client.beta.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            messages=messages,
            output_config={"effort": "low"},
            **extra,
        )
    except anthropic.APIError as exc:
        raise LLMUnavailable(f"Claude: {type(exc).__name__}") from exc
    if response.stop_reason == "refusal":
        raise LLMUnavailable("Claude rechazó la consulta")
    return "".join(b.text for b in response.content if b.type == "text").strip()


PROVIDERS = {"local": ask_local, "anthropic": ask_anthropic}


def ask(system: str, messages: list[dict], max_tokens: int) -> tuple[str, str]:
    order = [settings.chat_provider] + [p for p in PROVIDERS if p != settings.chat_provider]
    errors = []
    for name in order:
        try:
            return PROVIDERS[name](system, messages, max_tokens), name
        except LLMUnavailable as exc:
            errors.append(str(exc))
    raise HTTPException(503, "El asistente no está disponible ahora mismo: " + "; ".join(errors))


def render_sources(findings: list[dict], pages: list[dict]) -> tuple[str, list[dict]]:
    sources, blocks = [], []
    for f in findings:
        n = len(sources) + 1
        sources.append({"n": n, "kind": "finding", "finding_id": f["id"], "accession": f["accession"],
                        "statement": f["statement"], "quote": f["quote"], "safety_area": f["safety_area"],
                        "document_id": f["document_id"], "document_title": f["document_title"], "page_no": f["page_no"]})
        blocks.append(f"[{n}] Finding ({f['safety_area']}, {f['accession'] or 'general'}): {f['statement']}\n"
                      f"    Quote: \"{f['quote']}\" ({f['document_title']}, p. {f['page_no']})")
    for p in pages:
        n = len(sources) + 1
        sources.append({"n": n, "kind": "page", "accession": p["accession"], "quote": p["excerpt"],
                        "document_id": p["document_id"], "document_title": p["document_title"], "page_no": p["page_no"]})
        blocks.append(f"[{n}] Excerpt ({p['document_title']}, p. {p['page_no']}): {p['excerpt']}")
    return "\n".join(blocks), sources


@router.post("/chat")
@limiter.limit("8/minute;60/day")
def chat(request: Request, body: ChatRequest, db: sqlite3.Connection = Depends(get_db)) -> dict:
    scenario = scenario_or_404(db, body.scenario)
    query, provider = ask(REWRITE_SYSTEM, [{"role": "user", "content": body.question}], 100)
    findings = finding_index.search(db, f"{query} {body.question}", body.area)
    pages = search_pages(db, query)
    if not findings and not pages:
        return {"answer": "No encontré evidencia en la base de datos de la NASA para esa pregunta.",
                "sources": [], "cited": [], "provider": provider, "search_query": query}
    context, sources = render_sources(findings, pages)
    scenario_line = (f"Mission scenario: {scenario['name']} ({scenario['o2_fraction'] * 100:.1f}% O2, "
                     f"{scenario['pressure_kpa']} kPa, {scenario['gravity_g']} g)\n\n") if scenario else ""
    history = [t.model_dump() for t in body.history]
    messages = history + [{"role": "user", "content": f"{scenario_line}Sources:\n{context}\n\nQuestion: {body.question}"}]
    answer, provider = ask(ANSWER_SYSTEM, messages, 1200)
    cited = sorted({int(n) for n in re.findall(r"\[(\d+)\]", answer) if 0 < int(n) <= len(sources)})
    return {"answer": answer, "sources": sources, "cited": cited, "provider": provider, "search_query": query}