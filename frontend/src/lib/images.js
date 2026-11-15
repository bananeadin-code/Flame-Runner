import { ANSWER_IMAGES, MEDIA } from "../content/media";

const MAX_IMAGES = 3;

export function answerImages(answer) {
  if (!answer || answer.off_topic || !answer.cited?.length) return [];
  const words = (answer.search_query || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  const cited = answer.sources.filter((s) => s.cited && s.accession);
  return ANSWER_IMAGES.map(([id, accessions, keywords], order) => {
    const sources = cited.filter((s) => accessions.includes(s.accession)).length;
    const matches = keywords.filter((k) => words.some((w) => w.startsWith(k))).length;
    return { id, order, score: 2 * Math.min(sources, 2) + matches, sources, matches };
  })
    .filter((c) => c.matches > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, MAX_IMAGES)
    .map((c) => ({ id: c.id, ...MEDIA[c.id] }));
}
