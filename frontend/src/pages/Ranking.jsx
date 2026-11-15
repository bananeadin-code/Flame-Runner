import { useMemo, useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { href } from "../lib/route";
import { AREA_LABEL, FUEL_CLASS_LABEL, OUTCOME_LABEL, QUANTITY_LABEL, VARIABLE_LABEL, label, num, year } from "../lib/format";
import { pick, tr } from "../lib/i18n";
import { pageTitle, RANK_IDS } from "../lib/pages";
import { HARDWARE, SCENARIO_TEXT } from "../content/narrative";
import { Link } from "../components/Link";
import { AreaFilter, AskButton, Page, ScenarioSelect } from "../components/Layout";
import { Card, ErrorBox, Loading, Note, SectionTitle, Tag } from "../components/ui";

const PART_LABEL = {
  oxygen: ["Cercanía de oxígeno", "Oxygen proximity"],
  envelope: ["Pruebas dentro del escenario", "Tests within the scenario"],
  evidence: ["Hallazgos verificados", "Verified findings"],
  pressure: ["Cercanía de presión", "Pressure proximity"],
  flight: ["Vuelo frente a tierra", "Flight versus ground"],
};

const MAX_COMPARE = 4;

const range = (low, high, scale = 1, unit = "") =>
  low == null ? "—" : low === high ? `${num(low * scale, 0)}${unit}` : `${num(low * scale, 0)}–${num(high * scale, 0)}${unit}`;

function RankTabs({ route }) {
  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {RANK_IDS.map((id) => (
        <Link key={id} to={id} className={`rounded-full border px-4 py-1.5 text-sm transition ${id === route ? "border-rojo bg-rojo text-white" : "border-linea hover:border-noche"}`}>
          {pageTitle(id)}
        </Link>
      ))}
    </div>
  );
}

function ScenarioBar() {
  const { scenario, scenarioId } = useApp();
  const note = SCENARIO_TEXT[scenarioId]?.notes;
  return (
    <div className="my-6 space-y-4 rounded-xl border border-linea bg-claro/50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ScenarioSelect showLabel />
        <AreaFilter />
      </div>
      {scenario && (
        <p className="text-sm text-gris-oscuro">
          {num(scenario.o2_fraction * 100, 1)} % O₂ · {num(scenario.pressure_kpa)} kPa · {num(scenario.gravity_g, undefined, 3)} g
          {note && ` · ${pick(note)}`}
        </p>
      )}
    </div>
  );
}

function HardwareTag({ id }) {
  if (!id || !HARDWARE[id]) return null;
  return <Tag>{pick(HARDWARE[id].name)}</Tag>;
}

function RankRow({ item, weights, selected, onToggle, full }) {
  return (
    <li className="rounded-xl border border-linea bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className={`font-serif text-3xl leading-none tabular-nums sm:text-4xl ${item.rank <= 3 ? "text-rojo" : "text-gris"}`}>{item.rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-xl">{item.acronym || item.accession}</h3>
            <small className="text-gris-oscuro">{item.accession}</small>
            <HardwareTag id={item.hardware} />
          </div>
          <p className="mt-1 text-sm text-gris-oscuro">{item.title}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-claro">
              <i className={`absolute inset-y-0 left-0 rounded-full ${item.rank <= 3 ? "bg-rojo" : "bg-azul"}`} style={{ width: `${item.score * 100}%` }} />
            </span>
            <b className="w-12 text-right text-sm tabular-nums">{num(item.score, 2)}</b>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-gris-oscuro">{tr("Dentro del escenario", "Within the scenario")}</dt>
              <dd className={item.tests_in_scenario ? "font-medium" : "font-medium text-rojo"}>
                {item.tests_in_scenario} / {item.tests} {tr("pruebas", "tests")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gris-oscuro">{tr("O₂ probado", "O₂ tested")}</dt>
              <dd className="font-medium">{range(item.o2_min, item.o2_max, 100, " %")}</dd>
            </div>
            <div>
              <dt className="text-xs text-gris-oscuro">{tr("Presión probada", "Pressure tested")}</dt>
              <dd className="font-medium">{range(item.pressure_min, item.pressure_max, 1, " kPa")}</dd>
            </div>
            <div>
              <dt className="text-xs text-gris-oscuro">{tr("Hallazgos verificados", "Verified findings")}</dt>
              <dd className="font-medium">{item.findings}</dd>
            </div>
          </dl>
          {full && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-gris-oscuro select-none">{tr("¿Por qué este puesto?", "Why this position?")}</summary>
              <ul className="mt-2 space-y-1">
                {Object.entries(item.parts).map(([key, value]) => (
                  <li key={key} className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[14rem_1fr_auto]">
                    <span>{pick(PART_LABEL[key])}</span>
                    <span className="relative hidden h-2 self-center overflow-hidden rounded-full bg-claro sm:block">
                      <i className="absolute inset-y-0 left-0 rounded-full bg-azul" style={{ width: `${value * 100}%` }} />
                    </span>
                    <span className="tabular-nums text-gris-oscuro">
                      {num(value, 2)} × {num(weights[key], 2)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link to="investigaciones" query={{ acc: item.accession }} className="font-medium text-azul hover:underline">
              {tr("Ver investigación", "View investigation")}
            </Link>
            <a href={item.psi_url} target="_blank" rel="noreferrer" className="font-medium text-azul hover:underline">
              NASA PSI ↗
            </a>
            <button onClick={() => onToggle(item.accession)} aria-pressed={selected} className={`font-medium hover:underline ${selected ? "text-rojo" : "text-azul"}`}>
              {selected ? tr("✓ En la comparación", "✓ In comparison") : tr("+ Comparar", "+ Compare")}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function Ranking() {
  const { scenario, scenarioId, area } = useApp();
  const { data, error, loading } = useApi("/api/ranking", { scenario: scenarioId, area: area || undefined });
  const [selected, setSelected] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const toggle = (acc) => setSelected((prev) => (prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc].slice(-MAX_COMPARE)));
  const list = data?.investigations || [];
  const visible = showAll ? list : list.slice(0, 10);
  return (
    <Page route="ranking">
      <RankTabs route="ranking" />
      <p className="max-w-3xl text-lg text-gris-oscuro sm:text-xl">
        {tr(
          "Las investigaciones de PSI ordenadas por lo útiles que son para el escenario de misión elegido: qué tan cerca probaron su oxígeno y presión, cuántas pruebas caen dentro, cuánta evidencia verificada aportan y si se hicieron en vuelo.",
          "PSI investigations ranked by how useful they are for the chosen mission scenario: how close they tested its oxygen and pressure, how many tests fall inside, how much verified evidence they provide and whether they flew.",
        )}
      </p>
      <ScenarioBar />
      {scenario?.gravity_g > 0 && (
        <p className="mb-6 rounded-lg border border-rojo/40 bg-rojo/5 p-4 text-sm">
          {tr(
            "Ninguna investigación de PSI se hizo en gravedad parcial. El ranking mide cercanía de oxígeno y presión; el comportamiento con la gravedad de este escenario queda acotado entre los resultados de 0 g y de 1 g.",
            "No PSI investigation was run in partial gravity. The ranking measures oxygen and pressure proximity; behavior under this scenario's gravity is bounded between the 0 g and 1 g results.",
          )}{" "}
          <Link to="riesgos" className="font-medium text-azul hover:underline">
            {tr("Ver gravedad parcial", "See partial gravity")}
          </Link>
        </p>
      )}
      <div className="mb-6">
        <AskButton question={tr(`¿Qué investigaciones son más relevantes para ${scenario?.name || "este escenario"} y por qué?`, `Which investigations are most relevant for ${scenario?.name || "this scenario"} and why?`)}>
          {tr("Pedir al asistente que explique el ranking", "Ask the assistant to explain the ranking")}
        </AskButton>
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <ol className="space-y-3">
            {visible.map((item) => (
              <RankRow key={item.accession} item={item} weights={data.weights} selected={selected.includes(item.accession)} onToggle={toggle} full />
            ))}
          </ol>
          {list.length > visible.length && (
            <button onClick={() => setShowAll(true)} className="mt-4 rounded-full border border-linea px-5 py-2 text-sm hover:border-noche">
              {tr(`Ver las ${list.length} investigaciones`, `Show all ${list.length} investigations`)}
            </button>
          )}
          <Note>
            {tr(
              `Puntuación = ${Object.entries(data.weights).map(([k, w]) => `${num(w, 2)} × ${pick(PART_LABEL[k]).toLowerCase()}`).join(" + ")}. Una prueba está dentro del escenario si su oxígeno está a ±3 puntos y su presión a ±15 %. Si eliges un área, solo cuentan los hallazgos de esa área.`,
              `Score = ${Object.entries(data.weights).map(([k, w]) => `${num(w, 2)} × ${pick(PART_LABEL[k]).toLowerCase()}`).join(" + ")}. A test is within the scenario if its oxygen is within ±3 points and its pressure within ±15 %. If you pick an area, only findings from that area count.`,
            )}
          </Note>
        </>
      )}
      {selected.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-noche p-4 text-white shadow-xl">
          <span className="text-sm">
            {tr("Para comparar", "To compare")}: <b>{selected.map((a) => list.find((i) => i.accession === a)?.acronym || a).join(" · ")}</b>
          </span>
          <a href={href("comparar", { ids: selected.join(",") })} className="rounded-full bg-rojo px-5 py-2 text-sm font-medium hover:bg-rojo/85">
            {tr("Comparar", "Compare")} ({selected.length}) →
          </a>
        </div>
      )}
    </Page>
  );
}

function overlap(ranges) {
  const valid = ranges.filter(Boolean);
  if (valid.length < 2) return null;
  const low = Math.max(...valid.map((r) => r[0]));
  const high = Math.min(...valid.map((r) => r[1]));
  return low <= high ? [low, high] : null;
}

function common(lists) {
  if (lists.length < 2) return [];
  return lists.reduce((acc, list) => acc.filter((x) => list.includes(x)));
}

function VariableList({ variables, status }) {
  const items = variables.filter((v) => v.status === status);
  if (!items.length) return <span className="text-gris-oscuro">—</span>;
  return (
    <ul className="space-y-1">
      {items.map((v) => (
        <li key={v.variable}>
          <b className="font-medium">{pick(VARIABLE_LABEL[v.variable])}</b>
          {status !== "not_recorded" && (
            <span className="text-gris-oscuro">
              {": "}
              {v.min !== undefined
                ? v.min === v.max
                  ? num(v.min)
                  : `${num(v.min)}–${num(v.max)} (${v.distinct} ${tr("valores", "values")})`
                : `${v.examples.slice(0, 3).map((x) => (v.variable === "outcome" ? label(OUTCOME_LABEL, x) : x)).join(", ")}${v.distinct > 3 ? ` +${v.distinct - 3}` : ""}`}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Comparar({ query }) {
  const { scenario } = useApp();
  const { data: all } = useApi("/api/investigations");
  const [ids, setIds] = useState(() => (query.ids ? query.ids.split(",").filter(Boolean) : ["PSI-20", "PSI-159", "PSI-69"]).slice(0, MAX_COMPARE));
  const key = ids.join(",");
  const { data, error, loading } = useApi(ids.length ? "/api/compare" : null, { ids: key });
  const items = data?.investigations || [];

  const toggle = (acc) => {
    const next = ids.includes(acc) ? ids.filter((a) => a !== acc) : [...ids, acc].slice(-MAX_COMPARE);
    setIds(next);
    window.history.replaceState(null, "", href("comparar", { ids: next.join(",") }));
  };

  const summary = useMemo(() => {
    if (items.length < 2) return null;
    const families = new Set(items.map((i) => i.hardware));
    return {
      hardware: families.size === 1 && items[0].hardware ? items[0].hardware : null,
      fuelClasses: common(items.map((i) => i.fuel_classes)),
      diluents: common(items.map((i) => i.diluents)),
      o2: overlap(items.map((i) => i.o2_range)),
      quantities: common(items.map((i) => i.quantities.map((q) => q.quantity))),
      varied: common(items.map((i) => i.variables.filter((v) => v.status === "varied").map((v) => v.variable))),
    };
  }, [items]);

  const rowsDef = [
    [tr("Hardware", "Hardware"), (i) => (i.hardware && HARDWARE[i.hardware] ? pick(HARDWARE[i.hardware].name) : "—")],
    [tr("Plataforma", "Platform"), (i) => `${i.platform || "—"} · ${i.project_type?.includes("Ground") ? tr("tierra", "ground") : tr("vuelo", "flight")}`],
    [tr("Área principal", "Main area"), (i) => label(AREA_LABEL, i.primary_area)],
    [tr("Periodo", "Period"), (i) => [...new Set([year(i.start_date), year(i.end_date)].filter(Boolean))].join("–") || "—"],
    [tr("Objetivo", "Objective"), (i) => <p className="line-clamp-6">{i.objective || "—"}</p>],
    [tr("Tipo de combustible", "Fuel type"), (i) => i.fuel_classes.map((f) => label(FUEL_CLASS_LABEL, f)).join(", ") || "—"],
    [tr("Combustibles y muestras", "Fuels and samples"), (i) => i.fuels.join(" · ") || "—"],
    [tr("Diluyentes", "Diluents"), (i) => i.diluents.join(", ") || "—"],
    [tr("Oxígeno", "Oxygen"), (i) => (i.o2_range ? range(i.o2_range[0], i.o2_range[1], 100, " %") : "—")],
    [tr("Presión", "Pressure"), (i) => (i.pressure_range ? range(i.pressure_range[0], i.pressure_range[1], 1, " kPa") : "—")],
    [tr("Flujo de aire", "Airflow"), (i) => (i.flow_range ? `${num(i.flow_range[0], 1)}–${num(i.flow_range[1], 1)} cm/s` : "—")],
    [tr("Pruebas tabuladas", "Tabulated tests"), (i) => i.tests],
    [tr("Qué varió entre pruebas", "What varied between tests"), (i) => <VariableList variables={i.variables} status="varied" />],
    [tr("Qué quedó fijo", "What stayed fixed"), (i) => <VariableList variables={i.variables} status="fixed" />],
    [tr("Magnitudes medidas", "Measured quantities"), (i) => i.quantities.slice(0, 6).map((q) => label(QUANTITY_LABEL, q.quantity)).join(" · ") || "—"],
    [tr("Hallazgos verificados", "Verified findings"), (i) => Object.entries(i.findings_by_area).map(([a, n]) => `${label(AREA_LABEL, a)} ${n}`).join(" · ") || "—"],
  ];

  return (
    <Page route="comparar">
      <RankTabs route="comparar" />
      <p className="max-w-3xl text-lg text-gris-oscuro sm:text-xl">
        {tr(
          "Elige hasta cuatro investigaciones para verlas lado a lado: hardware, combustibles, condiciones, qué variaron entre pruebas y qué midieron.",
          "Pick up to four investigations to see them side by side: hardware, fuels, conditions, what varied between tests and what they measured.",
        )}
      </p>
      <div className="my-6 flex flex-wrap gap-2" role="group" aria-label={tr("Investigaciones a comparar", "Investigations to compare")}>
        {(all || []).map((i) => (
          <button
            key={i.accession}
            onClick={() => toggle(i.accession)}
            aria-pressed={ids.includes(i.accession)}
            className={`rounded-full border px-3 py-1 text-sm transition ${ids.includes(i.accession) ? "border-azul bg-azul text-white" : "border-linea hover:border-noche"}`}
          >
            {i.acronym || i.accession}
          </button>
        ))}
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {items.length === 0 && !loading && <p className="text-gris-oscuro">{tr("Elige al menos una investigación.", "Pick at least one investigation.")}</p>}
      {summary && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card title={tr("En común", "In common")}>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {summary.hardware && <li>{tr("Mismo hardware", "Same hardware")}: {pick(HARDWARE[summary.hardware].name)}</li>}
              {summary.fuelClasses.length > 0 && <li>{tr("Tipo de combustible", "Fuel type")}: {summary.fuelClasses.map((f) => label(FUEL_CLASS_LABEL, f)).join(", ")}</li>}
              {summary.diluents.length > 0 && <li>{tr("Diluyentes", "Diluents")}: {summary.diluents.join(", ")}</li>}
              {summary.o2 && <li>{tr("Oxígeno probado en común", "Shared oxygen range")}: {range(summary.o2[0], summary.o2[1], 100, " %")}</li>}
              {summary.varied.length > 0 && <li>{tr("Todas variaron", "All varied")}: {summary.varied.map((v) => pick(VARIABLE_LABEL[v])).join(", ")}</li>}
              {summary.quantities.length > 0 && <li>{tr("Midieron", "Measured")}: {summary.quantities.map((q) => label(QUANTITY_LABEL, q)).join(", ")}</li>}
              {!summary.hardware && !summary.fuelClasses.length && !summary.diluents.length && !summary.o2 && !summary.varied.length && !summary.quantities.length && (
                <li>{tr("No comparten hardware, combustible ni rango de oxígeno.", "They share no hardware, fuel type or oxygen range.")}</li>
              )}
            </ul>
          </Card>
          <Card title={tr("Diferencias clave", "Key differences")}>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {!summary.hardware && <li>{tr("Hardware distinto", "Different hardware")}: {items.map((i) => `${i.acronym || i.accession} (${i.hardware && HARDWARE[i.hardware] ? pick(HARDWARE[i.hardware].name).split(" · ")[0] : "—"})`).join(", ")}</li>}
              {!summary.o2 && <li>{tr("Sus rangos de oxígeno no se solapan o no están registrados.", "Their oxygen ranges do not overlap or are not recorded.")}</li>}
              <li>
                {tr("Pruebas tabuladas", "Tabulated tests")}: {items.map((i) => `${i.acronym || i.accession} ${i.tests}`).join(" · ")}
              </li>
              {scenario && (
                <li>
                  {tr("Para", "For")} {scenario.name}: {tr("revisa su posición en el", "check their position in the")}{" "}
                  <Link to="ranking" className="text-azul hover:underline">
                    {tr("ranking", "ranking")}
                  </Link>
                </li>
              )}
            </ul>
          </Card>
        </div>
      )}
      {items.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left align-top text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-36 border-b border-linea bg-white p-3" />
                {items.map((i) => (
                  <th key={i.accession} className="border-b border-linea p-3 align-bottom font-medium">
                    <span className="block font-serif text-lg">{i.acronym || i.accession}</span>
                    <small className="font-normal text-gris-oscuro">{i.accession}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsDef.map(([name, render]) => (
                <tr key={name}>
                  <th className="sticky left-0 z-10 border-b border-linea bg-white p-3 align-top text-xs font-medium tracking-wide text-gris-oscuro uppercase">{name}</th>
                  {items.map((i) => (
                    <td key={i.accession} className="border-b border-linea p-3 align-top">
                      {render(i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {items.length >= 2 && (
        <div className="mt-8">
          <AskButton question={tr(`¿En qué se parecen y en qué se diferencian ${items.map((i) => i.acronym || i.accession).join(", ")}?`, `How are ${items.map((i) => i.acronym || i.accession).join(", ")} similar and how do they differ?`)}>
            {tr("Pedir al asistente una comparación", "Ask the assistant for a comparison")}
          </AskButton>
        </div>
      )}
      <SectionTitle sub={tr("Las investigaciones que comparten hardware tienen condiciones y mediciones parecidas, y son las más fáciles de comparar entre sí.", "Investigations that share hardware have similar conditions and measurements, and are the easiest to compare with each other.")}>
        {tr("Familias de hardware", "Hardware families")}
      </SectionTitle>
      <HardwareFamilies investigations={all || []} onPick={(members) => {
        setIds(members.slice(0, MAX_COMPARE));
        window.history.replaceState(null, "", href("comparar", { ids: members.slice(0, MAX_COMPARE).join(",") }));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }} />
    </Page>
  );
}

export function HardwareFamilies({ investigations, onPick, actionLabel }) {
  const byFamily = {};
  investigations.forEach((i) => {
    if (i.hardware) (byFamily[i.hardware] ||= []).push(i);
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.keys(HARDWARE)
        .filter((id) => byFamily[id])
        .map((id) => (
          <Card key={id} title={pick(HARDWARE[id].name)}>
            <p className="text-sm text-gris-oscuro">{pick(HARDWARE[id].text)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {byFamily[id].map((i) => (
                <Link key={i.accession} to="investigaciones" query={{ acc: i.accession }} className="rounded-full border border-linea px-2.5 py-0.5 text-xs hover:border-azul">
                  {i.acronym || i.accession}
                </Link>
              ))}
            </div>
            {onPick && byFamily[id].length > 1 && (
              <button onClick={() => onPick(byFamily[id].map((i) => i.accession))} className="mt-3 text-sm font-medium text-azul hover:underline">
                {actionLabel || tr("Comparar esta familia", "Compare this family")}
              </button>
            )}
          </Card>
        ))}
    </div>
  );
}
