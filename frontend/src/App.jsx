import { useState } from "react";
import { useRoute } from "./lib/route";
import { useApp } from "./state/context";
import { Header, Menu } from "./components/Layout";
import { PAGES } from "./lib/pages";
import { SearchPanel } from "./components/SearchPanel";
import { SourceViewer } from "./components/SourceViewer";
import Inicio from "./pages/Inicio";
import { Prototipos, Recomendacion, Riesgos } from "./pages/Mision";
import { Comparacion, Oxigeno, Sensores, Viento } from "./pages/Fuego";
import { Ambiente, Investigaciones, Mediciones, Pruebas, Publicaciones } from "./pages/Datos";
import { Historia, Intro } from "./pages/Historia";

const VIEWS = {
  inicio: Inicio,
  intro: Intro,
  riesgos: Riesgos,
  recomendacion: Recomendacion,
  prototipos: Prototipos,
  viento: Viento,
  oxigeno: Oxigeno,
  sensores: Sensores,
  comparacion: Comparacion,
  investigaciones: Investigaciones,
  pruebas: Pruebas,
  ambiente: Ambiente,
  mediciones: Mediciones,
  publicaciones: Publicaciones,
  historia: Historia,
};

export default function App() {
  const { route, query } = useRoute();
  const { search, source } = useApp();
  const [menu, setMenu] = useState(false);
  const name = PAGES[route] ? route : "inicio";
  const View = VIEWS[name];
  return (
    <>
      <Header route={name} onMenu={() => setMenu(true)} />
      <main key={name}>
        <View query={query} />
      </main>
      <footer className="bg-noche px-5 py-10 text-sm text-white/70 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 md:flex-row">
          <p>Datos: NASA Physical Sciences Informatics (PSI), Combustion Science. Imágenes: NASA. NASA Space Apps Challenge 2026 · Flame in Freefall.</p>
          <a href="https://psi.nasa.gov/physci/repo/" target="_blank" rel="noreferrer" className="hover:text-white">
            psi.nasa.gov ↗
          </a>
        </div>
      </footer>
      {menu && <Menu onClose={() => setMenu(false)} />}
      {search && <SearchPanel key={`${search.text}|${search.ask}`} />}
      {source && <SourceViewer key={`${source.document_id}-${source.page_no}-${source.quote}`} />}
    </>
  );
}
