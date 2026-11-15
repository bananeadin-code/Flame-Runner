import { useMemo, useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { FINDING_TYPE_LABEL, FUEL_CLASS_LABEL, OUTCOME_LABEL, label, num } from "../lib/format";
import { COMPARACION } from "../content/narrative";
import { MEDIA } from "../content/media";
import { pick, tr } from "../lib/i18n";
import { AskButton, CrossLink, MissionBar, Page } from "../components/Layout";
import { FindingCard } from "../components/FindingCard";
import { LegendDot, ScatterMap } from "../components/ScatterMap";
import { Bars, Card, Chip, ChipRow, ErrorBox, Figure, Kpi, KpiRow, Loading, Note, SectionTitle, Tag } from "../components/ui";
import { Link } from "../components/Link";

function HighOxygen({ tests }) {
  const top = Math.max(...tests.map((t) => t.o2_max), 0);
  const rich = tests.filter((t) => t.o2_max >= 0.6);
  const byInvestigation = {};
  rich.forEach((t) => {
    byInvestigation[t.accession] = (byInvestigation[t.accession] || 0) + 1;
  });
  if (!rich.length) return null;
  return (
    <div className="mt-8 grid gap-6 rounded-xl bg-noche p-5 text-white sm:p-6 lg:grid-cols-[auto_1fr] lg:items-center">
      <div>
        <small className="text-xs tracking-wide text-azul-palido uppercase">{tr("Máximo probado en microgravedad", "Highest tested in microgravity")}</small>
        <b className="block font-serif text-5xl text-rojo">{num(top * 100, 0)} % O₂</b>
      </div>
      <div className="text-sm text-white/85">
        <p>
          {tr(
            `En ACME CFI-G la cámara se llenó de nitrógeno con un gas inflamable (por ejemplo propano) y del quemador esférico salía una mezcla de hasta 85 % de oxígeno: una llama «de dentro hacia afuera». Son las pruebas con más oxígeno de PSI (${rich.length} por encima del 60 %), muy por encima del 30–34 % previsto para la Luna.`,
            `In ACME CFI-G the chamber was filled with nitrogen and a flammable gas (for example propane), while a mixture of up to 85 % oxygen flowed from the spherical burner: an “inside-out” flame. These are the highest-oxygen tests in PSI (${rich.length} above 60 %), far above the 30–34 % planned for the Moon.`,
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(byInvestigation).map(([acc, n]) => (
            <Link key={acc} to="investigaciones" query={{ acc }} className="rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10">
              {acc} · {n} {tr("pruebas", "tests")}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Findings({ params, title, sub }) {
  const { scenarioId, area } = useApp();
  const { data, error, loading } = useApi("/api/findings", { scenario: scenarioId, area: area || undefined, ...params });
  return (
    <>
      <SectionTitle sub={sub}>{title}</SectionTitle>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && data.findings.length === 0 && <p className="text-gris-oscuro">{tr("No hay hallazgos con estos filtros.", "No findings match these filters.")}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.findings.map((f) => (
          <FindingCard key={f.id} finding={f} showScore />
        ))}
      </div>
    </>
  );
}

function testTitle(t) {
  return `${t.accession} · ${t.test_code || tr("prueba", "test")} · ${t.fuel}${t.o2_min != null ? ` · ${num(t.o2_min * 100, 1)} % O₂` : ""}${t.pressure_kpa != null ? ` · ${num(t.pressure_kpa, 0)} kPa` : ""}${t.outcome ? ` · ${label(OUTCOME_LABEL, t.outcome)}` : ""}`;
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
        <p className="text-lg text-gris-oscuro sm:text-xl">
          {tr(
            "En microgravedad no hay convección: el único aire que llega a la llama es el de la ventilación. Con poco flujo algunos materiales se apagan solos; con más flujo, la llama crece. Estas son las pruebas reales con flujo medido.",
            "In microgravity there is no convection: the only air reaching the flame comes from ventilation. At low flow some materials self-extinguish; with more flow, the flame grows. These are the real tests with measured flow.",
          )}
        </p>
        <Figure media={MEDIA.propagacion} imgClassName="max-h-80" />
      </div>
      <MissionBar />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card title={tr("Flujo de aire frente a oxígeno", "Airflow versus oxygen")}>
            <ScatterMap
              points={points}
              xDomain={[10, 45]}
              yDomain={[0, 40]}
              xLabel={tr("Oxígeno (%)", "Oxygen (%)")}
              yLabel={tr("Velocidad del flujo (cm/s)", "Flow velocity (cm/s)")}
              vline={scenario ? scenario.o2_fraction * 100 : null}
              legend={
                <>
                  <LegendDot>{tr("Prueba", "Test")}</LegendDot>
                  <LegendDot tone="rojo">{tr("Dentro del escenario", "Within the scenario")}</LegendDot>
                  <span>{tr("Línea azul: oxígeno del escenario", "Blue line: scenario oxygen")}</span>
                </>
              }
            />
          </Card>
          <Card title={tr("Pruebas con flujo medido", "Tests with measured flow")}>
            <Bars items={Object.entries(byInvestigation).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: k, value: v }))} />
            <Note>{tr(`${withFlow.length} pruebas tienen a la vez flujo y oxígeno medidos.`, `${withFlow.length} tests have both flow and oxygen measured.`)}</Note>
          </Card>
        </div>
      )}
      <Findings
        params={{ q: "flow", limit: 6 }}
        title={tr("Lo que dicen los experimentos sobre el flujo", "What the experiments say about flow")}
        sub={tr("Hallazgos verificados que mencionan el flujo de aire, ordenados para el escenario.", "Verified findings that mention airflow, ranked for the scenario.")}
      />
      <CrossLink text={tr("El flujo trae oxígeno. ¿Qué pasa cuando hay más?", "Flow brings oxygen. What happens when there is more?")} to="oxigeno" button={tr("Concentración de oxígeno", "Oxygen concentration")} />
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
        <p className="text-lg text-gris-oscuro sm:text-xl">
          {tr(
            "Las misiones a la Luna y Marte plantean cabinas con 34 % de oxígeno a baja presión. Mueve el control para ver cuántas pruebas reales existen con esa concentración y qué pasó en ellas.",
            "Missions to the Moon and Mars propose cabins with 34 % oxygen at low pressure. Move the slider to see how many real tests exist at that concentration and what happened in them.",
          )}
        </p>
        <Figure media={MEDIA.oxigeno} />
      </div>
      <MissionBar />
      <Card>
        <label className="block">
          <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="font-serif text-2xl">{o2} % {tr("de O₂", "O₂")}</span>
            {scenario && (
              <button onClick={() => setO2(Math.round(scenario.o2_fraction * 100))} className="text-sm text-azul hover:underline">
                {tr("Usar el del escenario", "Use the scenario value")} ({num(scenario.o2_fraction * 100, 1)} %)
              </button>
            )}
          </span>
          <input type="range" min="10" max="45" value={o2} onChange={(e) => setO2(Number(e.target.value))} className="mt-3 h-8 w-full accent-rojo" aria-label={tr("Concentración de oxígeno", "Oxygen concentration")} />
        </label>
        <p className="mt-2 text-sm text-gris-oscuro">
          {tr(
            "El aire normal tiene cerca de 21 %. Se cuentan las pruebas cuyo rango de oxígeno incluye el valor elegido (±1,5 puntos).",
            "Normal air is about 21 %. Tests are counted when their oxygen range includes the chosen value (±1.5 points).",
          )}
        </p>
      </Card>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={near.length} label={tr(`Pruebas cerca de ${o2} % O₂`, `Tests near ${o2} % O₂`)} tone={near.length ? "azul" : "rojo"} />
            <Kpi value={byClass.solid || 0} label={tr("Con materiales sólidos", "With solid materials")} tone={byClass.solid ? "" : "rojo"} />
            <Kpi value={byClass.droplet || 0} label={tr("Con gotas de combustible", "With fuel droplets")} />
            <Kpi value={byClass.gas || 0} label={tr("Con llamas de gas", "With gas flames")} />
          </KpiRow>
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card title={tr("Pruebas por oxígeno y presión", "Tests by oxygen and pressure")}>
              <ScatterMap
                points={points}
                xDomain={[10, 90]}
                yDomain={[0, 320]}
                xLabel={tr("Oxígeno (%)", "Oxygen (%)")}
                yLabel={tr("Presión (kPa)", "Pressure (kPa)")}
                vline={o2}
                marker={scenario ? { x: scenario.o2_fraction * 100, y: scenario.pressure_kpa, label: scenario.name } : null}
                legend={
                  <>
                    <LegendDot>{tr("Prueba", "Test")}</LegendDot>
                    <LegendDot tone="rojo">{tr("Cerca del O₂ elegido", "Near the chosen O₂")}</LegendDot>
                    <LegendDot tone="noche">{tr("Escenario de misión", "Mission scenario")}</LegendDot>
                  </>
                }
              />
            </Card>
            <Card title={tr("Resultado de esas pruebas", "Outcome of those tests")}>
              {Object.keys(outcomes).length ? (
                <Bars items={Object.entries(outcomes).map(([k, v]) => ({ key: k, label: label(OUTCOME_LABEL, k), value: v }))} />
              ) : (
                <p className="text-sm text-gris-oscuro">{tr("Las pruebas con este nivel de oxígeno no registran el resultado.", "Tests at this oxygen level do not record the outcome.")}</p>
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
      {data && <HighOxygen tests={tests} />}
      <Findings
        params={{ q: "oxygen", limit: 6 }}
        title={tr("Lo que dicen los experimentos sobre el oxígeno", "What the experiments say about oxygen")}
        sub={tr("Hallazgos verificados que mencionan el oxígeno, ordenados por cercanía al escenario.", "Verified findings that mention oxygen, ranked by closeness to the scenario.")}
      />
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
        <p className="text-lg text-gris-oscuro sm:text-xl">
          {tr(
            "Sin convección, el humo no sube al techo: se queda cerca del fuego y sus partículas son distintas. Los experimentos SAME, SAME-R y DAFT midieron cómo detectarlo a bordo.",
            "Without convection, smoke does not rise to the ceiling: it stays near the fire and its particles are different. The SAME, SAME-R and DAFT experiments measured how to detect it on board.",
          )}
        </p>
        <Figure media={MEDIA.hollin} />
      </div>
      <MissionBar showArea={false} />
      <ChipRow label={tr("Tipo de hallazgo", "Finding type")}>
        <Chip active={!type} onClick={() => setType("")} tone="azul">
          {tr("Todos", "All")}
        </Chip>
        {["quantitative", "qualitative", "gap"].map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)} tone="azul">
            {label(FINDING_TYPE_LABEL, t)}
          </Chip>
        ))}
      </ChipRow>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <p className="mb-4 text-sm text-gris-oscuro">
          {tr(`${data.total} hallazgos verificados de detección. Los más relevantes para el escenario:`, `${data.total} verified detection findings. The most relevant for the scenario:`)}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.findings.map((f) => (
          <FindingCard key={f.id} finding={f} showScore />
        ))}
      </div>
      <div className="mt-8">
        <AskButton question={tr("¿Cómo se detecta un incendio en una nave espacial y qué limitaciones tienen los detectores?", "How is a fire detected on a spacecraft and what are the limits of the detectors?")} />
      </div>
    </Page>
  );
}

export function Comparacion() {
  const [filter, setFilter] = useState("t");
  const rows = COMPARACION.filter((r) => filter === "t" || r[0] === filter);
  return (
    <Page route="comparacion" tabs>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <Figure media={MEDIA.velaTierra} imgClassName="aspect-[3/4] object-contain" />
        <Figure media={MEDIA.velaMicro} imgClassName="aspect-[3/4] object-contain" />
      </div>
      <ChipRow label={tr("Filtrar comparación", "Filter comparison")}>
        {[
          ["t", ["Todo", "All"]],
          ["s", ["Similitudes", "Similarities"]],
          ["d", ["Diferencias", "Differences"]],
        ].map(([k, t]) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
            {pick(t)}
          </Chip>
        ))}
      </ChipRow>
      <div className="overflow-x-auto rounded-xl border border-linea">
        <table className="w-full text-left text-sm">
          <thead className="bg-claro">
            <tr>
              <th className="p-3" />
              <th className="p-3 font-medium">{tr("Tierra", "Earth")}</th>
              <th className="p-3 font-medium">{tr("Espacio", "Space")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[1][0]} className="border-t border-linea">
                <td className="p-3">
                  <Tag tone={r[0] === "s" ? "azul" : "rojo"}>{r[0] === "s" ? tr("Igual", "Same") : tr("Distinto", "Different")}</Tag>
                  <b className="mt-1 block">{pick(r[1])}</b>
                </td>
                <td className="p-3">{pick(r[2])}</td>
                <td className="p-3">{pick(r[3])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Figure media={MEDIA.comparacion} className="mt-10" imgClassName="max-h-[480px] object-contain" />
      <div className="mt-8">
        <AskButton question={tr("¿En qué se diferencia una llama en microgravedad de una llama en la Tierra?", "How does a flame in microgravity differ from a flame on Earth?")} />
      </div>
    </Page>
  );
}
