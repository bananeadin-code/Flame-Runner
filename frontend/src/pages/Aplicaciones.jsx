import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { pick, tr } from "../lib/i18n";
import { MEDIA } from "../content/media";
import { Link } from "../components/Link";
import { AskButton, CrossLink, Page } from "../components/Layout";
import { FindingCard } from "../components/FindingCard";
import { Card, ErrorBox, Figure, Loading, SectionTitle } from "../components/ui";

const EQUIPMENT = [
  {
    id: "mist",
    title: ["Extintores de agua nebulizada", "Water mist extinguishers"],
    text: [
      "Microgotas de agua que enfrían la llama sin dejar la cabina sin oxígeno ni saturar el soporte vital. Sustituyeron a los extintores de CO₂ en la ISS y su tecnología se aplica hoy en extintores terrestres.",
      "Fine water droplets that cool the flame without starving the cabin of oxygen or overloading life support. They replaced the CO₂ units on the ISS, and the technology is now used in extinguishers on Earth.",
    ],
    quotes: [
      {
        document_id: 5,
        page_no: 26,
        title: "Combustion in Reduced Gravity (NASA, 2015)",
        quote: "help design more effective mist fire-suppression systems to replace banned Halon systems",
      },
      {
        document_id: 97,
        page_no: 5,
        title: "SAFFIRE Objectives, Development and Status",
        quote: "Performance of low-momentum water mist suppression",
      },
    ],
    to: "prototipos",
  },
  {
    id: "detection",
    title: ["Detección de humo de nueva generación", "Next-generation smoke detection"],
    text: [
      "SAME y SAME-R midieron el tamaño real del humo en microgravedad; DAFT reutilizó uno de sus instrumentos para medir polvo. Son la base para detectores que distinguen humo de polvo y fallan menos.",
      "SAME and SAME-R measured the real size of smoke in microgravity; DAFT reused one of their instruments to measure dust. They underpin detectors that tell smoke from dust and raise fewer false alarms.",
    ],
    params: { area: "detection", q: "detector", limit: 2 },
    to: "sensores",
  },
  {
    id: "materials",
    title: ["Selección de materiales", "Material selection"],
    text: [
      "BASS, BASS-II y Saffire midieron cómo arden los materiales de cabina con poco flujo de aire. Sus resultados alimentan los criterios de inflamabilidad para elegir telas, plásticos y cables a bordo.",
      "BASS, BASS-II and Saffire measured how cabin materials burn in low airflow. Their results feed the flammability criteria used to choose fabrics, plastics and cables on board.",
    ],
    params: { area: "prevention", q: "flammability limit", limit: 2 },
    to: "viento",
  },
  {
    id: "modeling",
    title: ["Modelos predictivos de incendio", "Predictive fire models"],
    text: [
      "Las tablas de pruebas de PSI (oxígeno, presión, flujo, combustible y resultado) son datos de validación para modelos de inflamabilidad. Puedes descargarlas en CSV desde Resultados de pruebas y Mediciones.",
      "PSI test tables (oxygen, pressure, flow, fuel and outcome) are validation data for flammability models. You can download them as CSV from Test results and Measurements.",
    ],
    params: { q: "model", area: "fundamental", limit: 2 },
    to: "pruebas",
  },
];

const SPINOFFS = [
  {
    title: ["Trajes para bomberos", "Firefighter clothing"],
    text: ["Materiales y diseños derivados del programa Apolo, aplicados a un equipo integral para bomberos.", "Materials and designs derived from the Apollo program, applied to an integrated firefighter outfit."],
    document_id: 15,
    quote: "Project FIRES (Firefighter's Integrated Response Equipment System) involves applications of advanced materials and design concepts, derived from Apollo",
    url: "https://spinoff.nasa.gov/node/9918",
  },
  {
    title: ["Detector de incendios incipientes", "Incipient fire detector"],
    text: ["Un sensor de los transbordadores que distingue partículas de combustión del polvo y da menos falsas alarmas.", "A Space Shuttle sensor that tells combustion particles from dust and gives fewer false alarms."],
    document_id: 16,
    quote: "can discriminate between combustion particles and extraneous matters such as dust",
    url: "https://spinoff.nasa.gov/node/9407",
  },
  {
    title: ["Tanques de aire para bomberos", "Firefighter air tanks"],
    text: ["Tanques ligeros de fibra desarrollados con el Johnson Space Center: más aire con menos peso.", "Lightweight fiber-wrapped tanks developed with Johnson Space Center: more air for less weight."],
    document_id: 17,
    quote: "New backpack system weighs only 20 pounds for 30 minute air supply, 13 pounds less than conventional firefighting tanks.",
    url: "https://spinoff.nasa.gov/node/9582",
  },
];

function Quotes({ quotes }) {
  const { openSource } = useApp();
  return (
    <div className="mt-4 space-y-3">
      {quotes.map((q) => (
        <div key={q.quote} className="rounded-xl border border-linea p-4">
          <blockquote className="border-l-2 border-rojo pl-3 font-serif text-sm italic text-gris-oscuro">“{q.quote}”</blockquote>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-gris-oscuro">
              {q.title} · {tr("pág.", "p.")} {q.page_no}
            </span>
            <button onClick={() => openSource(q)} className="font-medium text-azul hover:underline">
              {tr("Ver en contexto", "View in context")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EquipmentEvidence({ params }) {
  const { scenarioId } = useApp();
  const { data, error, loading } = useApi("/api/findings", { scenario: scenarioId, ...params });
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data?.findings.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {data.findings.map((f) => (
        <FindingCard key={f.id} finding={f} compact />
      ))}
    </div>
  );
}

export function Aplicaciones() {
  const { openSource } = useApp();
  return (
    <Page route="aplicaciones">
      <div className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
        <p className="text-lg text-gris-oscuro sm:text-xl">
          {tr(
            "La investigación de combustión en microgravedad no se queda en el laboratorio: define los extintores, detectores y materiales de la próxima generación de naves y hábitats, y varias de esas tecnologías ya protegen a personas en la Tierra.",
            "Microgravity combustion research does not stay in the lab: it shapes the extinguishers, detectors and materials of the next generation of spacecraft and habitats, and several of those technologies already protect people on Earth.",
          )}
        </p>
        <Figure media={MEDIA.daft} />
      </div>
      <SectionTitle sub={tr("Cada tarjeta muestra los hallazgos verificados más relevantes para tu escenario.", "Each card shows the most relevant verified findings for your scenario.")}>
        {tr("Equipos de seguridad de nueva generación", "Next-generation safety equipment")}
      </SectionTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        {EQUIPMENT.map((e) => (
          <Card key={e.id} title={pick(e.title)}>
            <p className="text-sm text-gris-oscuro">{pick(e.text)}</p>
            {e.quotes ? <Quotes quotes={e.quotes} /> : <EquipmentEvidence params={e.params} />}
            <Link to={e.to} className="mt-4 inline-block text-sm font-medium text-azul hover:underline">
              {tr("Ver más", "See more")} →
            </Link>
          </Card>
        ))}
      </div>
      <SectionTitle sub={tr("Tecnologías de la NASA que pasaron a la protección contra incendios en la Tierra, según NASA Spinoff.", "NASA technologies that moved into fire protection on Earth, according to NASA Spinoff.")}>
        {tr("Aplicaciones en la Tierra", "Applications on Earth")}
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SPINOFFS.map((s) => (
          <Card key={s.document_id} title={pick(s.title)}>
            <p className="text-sm text-gris-oscuro">{pick(s.text)}</p>
            <blockquote className="mt-3 border-l-2 border-rojo pl-3 font-serif text-sm italic text-gris-oscuro">“{s.quote}”</blockquote>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <button onClick={() => openSource({ document_id: s.document_id, page_no: 1, quote: s.quote })} className="font-medium text-azul hover:underline">
                {tr("Ver en contexto", "View in context")}
              </button>
              <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-azul hover:underline">
                NASA Spinoff ↗
              </a>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-8 rounded-lg border border-linea bg-claro/50 p-4 text-sm text-gris-oscuro">
        {tr(
          "Fuera de alcance: los incendios de cohetes y propelentes. Dentro de un motor la combustión es tan rápida que casi no depende de la gravedad, y PSI no recoge esa investigación.",
          "Out of scope: rocket and propellant fires. Inside an engine combustion is so fast that it barely depends on gravity, and PSI does not cover that research.",
        )}
      </p>
      <div className="mt-8">
        <AskButton question={tr("¿Qué tecnologías contra incendios de la ISS tienen aplicación en la Tierra?", "Which ISS fire safety technologies have applications on Earth?")} />
      </div>
      <CrossLink text={tr("¿Qué investigación sirve más para tu misión?", "Which research matters most for your mission?")} to="ranking" button={tr("Ranking por escenario", "Ranking by scenario")} />
    </Page>
  );
}
