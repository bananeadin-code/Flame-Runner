import { useMemo, useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { FINDING_TYPE_LABEL, FUEL_CLASS_LABEL, OUTCOME_LABEL, label, num } from "../lib/format";
import { COMPARACION } from "../content/narrative";
import { MEDIA } from "../content/media";
import { AskButton, CrossLink, MissionBar, Page } from "../components/Layout";
import { FindingCard } from "../components/FindingCard";
import { LegendDot, ScatterMap } from "../components/ScatterMap";
import { Bars, Card, Chip, ChipRow, ErrorBox, Figure, Kpi, KpiRow, Loading, Note, SectionTitle, Tag } from "../components/ui";

function Findings({ params, title, sub }) {
  const { scenarioId, area } = useApp();
  const { data, error, loading } = useApi("/api/findings", { scenario: scenarioId, area: area || undefined, ...params });
  return (
    <>
      <SectionTitle sub={sub}>{title}</SectionTitle>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && data.findings.length === 0 && <p className="text-gris-oscuro">No hay hallazgos con estos filtros.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.findings.map((f) => (
          <FindingCard key={f.id} finding={f} showScore />
        ))}
      </div>
    </>
  );
}

function testTitle(t) {
  return `${t.accession} · ${t.test_code || "prueba"} · ${t.fuel}${t.o2_min != null ? ` · ${num(t.o2_min * 100, 1)} % O₂` : ""}${t.pressure_kpa != null ? ` · ${num(t.pressure_kpa, 0)} kPa` : ""}${t.outcome ? ` · ${label(OUTCOME_LABEL, t.outcome)}` : ""}`;
}

export function Viento() {
  const { scenario, scenarioId } = useApp();
  const { data, error, loading } = useApi("/api/tests", { scenario: scenarioId });
  const withFlow = useMemo(
    () => (data?.tests || []).filter((t) => t.flow_min_cm_s != null && t.o2_min != null),
    [data],
  );
  const points = withFlow.map((t) => ({
    id: t.id,
    x: ((t.o2_min + t.o2_max) / 2) * 100,
    y: (t.flow_min_cm_s + t.flow_max_cm_s) / 2,
    highlight: t.in_scenario,
    title: `${testTitle(t)} · ${num(t.flow_min_cm_s, 1)} cm/s`,
  }));
  const byInvestigation = {};
  (data?.tests || []).filter((t) => t.flow_min_cm_s != null).forEach((t) => {
    byInvestigation[t.accession] = (byInvestigation[t.accession] || 0) + 1;
  });
  return (
    <Page route="viento" tabs>
      <div className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
        <p className="text-xl text-gris-oscuro">
          En microgravedad no hay convección: el único aire que llega a la llama es el de la ventilación. Con poco flujo algunos materiales se apagan solos; con más flujo, la llama crece. Estas son las pruebas reales con flujo medido.
        </p>
        <Figure media={MEDIA.propagacion} imgClassName="max-h-80" />
      </div>
      <MissionBar />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <Card title="Flujo de aire frente a oxígeno">
            <ScatterMap
              points={points}
              xDomain={[10, 45]}
              yDomain={[0, 40]}
              xLabel="Oxígeno (%)"
              yLabel="Velocidad del flujo (cm/s)"
              vline={scenario ? scenario.o2_fraction * 100 : null}
              legend={
                <>
                  <LegendDot>Prueba</LegendDot>
                  <LegendDot tone="rojo">Dentro del escenario</LegendDot>
                  <span>Línea azul: oxígeno del escenario</span>
                </>
              }
            />
          </Card>
          <Card title="Pruebas con flujo medido">
            <Bars items={Object.entries(byInvestigation).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: k, value: v }))} />
            <Note>{withFlow.length} pruebas tienen a la vez flujo y oxígeno medidos.</Note>
          </Card>
        </div>
      )}
      <Findings params={{ q: "flow", limit: 6 }} title="Lo que dicen los experimentos sobre el flujo" sub="Hallazgos verificados que mencionan el flujo de aire, ordenados para el escenario." />
      <CrossLink text="El flujo trae oxígeno. ¿Qué pasa cuando hay más?" to="oxigeno" button="Concentración de oxígeno" />
    </Page>
  );
}

export function Oxigeno() {
  const { scenario, scenarioId } = useApp();
  const [o2, setO2] = useState(34);
  const { data, error, loading } = useApi("/api/tests", { scenario: scenarioId });
  const tests = useMemo(() => (data?.tests || []).filter((t) => t.o2_min != null), [data]);
  const near = tests.filter((t) => t.o2_min * 100 - 1.5 <= o2 && o2 <= t.o2_max * 100 + 1.5);
  const points = tests
    .filter((t) => t.pressure_kpa != null)
    .map((t) => ({
      id: t.id,
      x: ((t.o2_min + t.o2_max) / 2) * 100,
      y: t.pressure_kpa,
      highlight: t.o2_min * 100 - 1.5 <= o2 && o2 <= t.o2_max * 100 + 1.5,
      title: testTitle(t),
    }));
  const byClass = {};
  near.forEach((t) => {
    byClass[t.fuel_class] = (byClass[t.fuel_class] || 0) + 1;
  });
  const outcomes = {};
  near.filter((t) => t.outcome).forEach((t) => {
    outcomes[t.outcome] = (outcomes[t.outcome] || 0) + 1;
  });
  return (
    <Page route="oxigeno" tabs>
      <div className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
        <p className="text-xl text-gris-oscuro">
          Las misiones a la Luna y Marte plantean cabinas con 34 % de oxígeno a baja presión. Mueve el control para ver cuántas pruebas reales existen con esa concentración y qué pasó en ellas.
        </p>
        <Figure media={MEDIA.oxigeno} />
      </div>
      <MissionBar />
      <Card>
        <label className="block">
          <span className="flex items-baseline justify-between">
            <span className="font-serif text-2xl">{o2} % de O₂</span>
            {scenario && (
              <button onClick={() => setO2(Math.round(scenario.o2_fraction * 100))} className="text-sm text-azul hover:underline">
                Usar el del escenario ({Math.round(scenario.o2_fraction * 1000) / 10} %)
              </button>
            )}
          </span>
          <input type="range" min="10" max="45" value={o2} onChange={(e) => setO2(Number(e.target.value))} className="mt-3 w-full accent-rojo" />
        </label>
        <p className="mt-2 text-sm text-gris-oscuro">El aire normal tiene cerca de 21 %. Se cuentan las pruebas cuyo rango de oxígeno incluye el valor elegido (±1,5 puntos).</p>
      </Card>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={near.length} label={`Pruebas cerca de ${o2} % O₂`} tone={near.length ? "azul" : "rojo"} />
            <Kpi value={byClass.solid || 0} label="Con materiales sólidos" tone={byClass.solid ? "" : "rojo"} />
            <Kpi value={byClass.droplet || 0} label="Con gotas de combustible" />
            <Kpi value={byClass.gas || 0} label="Con llamas de gas" />
          </KpiRow>
          <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
            <Card title="Pruebas por oxígeno y presión">
              <ScatterMap
                points={points}
                xDomain={[10, 90]}
                yDomain={[0, 320]}
                xLabel="Oxígeno (%)"
                yLabel="Presión (kPa)"
                vline={o2}
                marker={scenario ? { x: scenario.o2_fraction * 100, y: scenario.pressure_kpa, label: scenario.name } : null}
                legend={
                  <>
                    <LegendDot>Prueba</LegendDot>
                    <LegendDot tone="rojo">Cerca del O₂ elegido</LegendDot>
                    <LegendDot tone="noche">Escenario de misión</LegendDot>
                  </>
                }
              />
            </Card>
            <Card title="Resultado de esas pruebas">
              {Object.keys(outcomes).length ? (
                <Bars items={Object.entries(outcomes).map(([k, v]) => ({ key: k, label: label(OUTCOME_LABEL, k), value: v }))} />
              ) : (
                <p className="text-sm text-gris-oscuro">Las pruebas con este nivel de oxígeno no registran el resultado.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {Object.entries(byClass).map(([k, v]) => (
                  <Tag key={k}>
                    {label(FUEL_CLASS_LABEL, k)}: {v}
                  </Tag>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
      <Findings params={{ q: "oxygen", limit: 6 }} title="Lo que dicen los experimentos sobre el oxígeno" sub="Hallazgos verificados que mencionan el oxígeno, ordenados por cercanía al escenario." />
    </Page>
  );
}

export function Sensores() {
  const { scenarioId } = useApp();
  const [type, setType] = useState("");
  const { data, error, loading } = useApi("/api/findings", { scenario: scenarioId, area: "detection", type: type || undefined, limit: 12 });
  return (
    <Page route="sensores" tabs>
      <div className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
        <p className="text-xl text-gris-oscuro">
          Sin convección, el humo no sube al techo: se queda cerca del fuego y sus partículas son distintas. Los experimentos SAME, SAME-R y DAFT midieron cómo detectarlo a bordo.
        </p>
        <Figure media={MEDIA.hollin} />
      </div>
      <MissionBar showArea={false} />
      <ChipRow label="Tipo de hallazgo">
        <Chip active={!type} onClick={() => setType("")} tone="azul">
          Todos
        </Chip>
        {["quantitative", "qualitative", "gap"].map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)} tone="azul">
            {label(FINDING_TYPE_LABEL, t)}
          </Chip>
        ))}
      </ChipRow>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && <p className="mb-4 text-sm text-gris-oscuro">{data.total} hallazgos verificados de detección. Los más relevantes para el escenario:</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.findings.map((f) => (
          <FindingCard key={f.id} finding={f} showScore />
        ))}
      </div>
      <div className="mt-8">
        <AskButton question="¿Cómo se detecta un incendio en una nave espacial y qué limitaciones tienen los detectores?" />
      </div>
    </Page>
  );
}

export function Comparacion() {
  const [filter, setFilter] = useState("t");
  const rows = COMPARACION.filter((r) => filter === "t" || r[0] === filter);
  return (
    <Page route="comparacion" tabs>
      <div className="grid gap-6 md:grid-cols-2">
        <Figure media={MEDIA.velaTierra} imgClassName="aspect-[3/4] object-contain" />
        <Figure media={MEDIA.velaMicro} imgClassName="aspect-[3/4] object-contain" />
      </div>
      <ChipRow label="Filtrar comparación">
        {[
          ["t", "Todo"],
          ["s", "Similitudes"],
          ["d", "Diferencias"],
        ].map(([k, t]) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
            {t}
          </Chip>
        ))}
      </ChipRow>
      <div className="overflow-x-auto rounded-xl border border-linea">
        <table className="w-full text-left text-sm">
          <thead className="bg-claro">
            <tr>
              <th className="p-3" />
              <th className="p-3 font-medium">Tierra</th>
              <th className="p-3 font-medium">Espacio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[1]} className="border-t border-linea">
                <td className="p-3">
                  <Tag tone={r[0] === "s" ? "azul" : "rojo"}>{r[0] === "s" ? "Igual" : "Distinto"}</Tag>
                  <b className="mt-1 block">{r[1]}</b>
                </td>
                <td className="p-3">{r[2]}</td>
                <td className="p-3">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Figure media={MEDIA.comparacion} className="mt-10" imgClassName="max-h-[480px] object-contain" />
      <div className="mt-8">
        <AskButton question="¿En qué se diferencia una llama en microgravedad de una llama en la Tierra?" />
      </div>
    </Page>
  );
}
