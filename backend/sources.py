import re
from pathlib import PurePosixPath

PSI_INVESTIGATION = "https://psi.nasa.gov/physci/repo/data/investigations/{accession}"

NASA_URLS = {
    "advanced-combustion-via-microgravity-experiments-acme.pdf": "https://www.nasa.gov/wp-content/uploads/2025/07/advanced-combustion-via-microgravity-experiments-acme.pdf",
    "burning-and-suppression-of-solids-bass.pdf": "https://www.nasa.gov/wp-content/uploads/2025/07/burning-and-suppression-of-solids-bass.pdf",
    "dust-and-aerosol-measurement-feasibility-test-daft.pdf": "https://www.nasa.gov/wp-content/uploads/2025/07/dust-and-aerosol-measurement-feasibility-test-daft.pdf",
    "flame-extinguishment-experiment-flex.pdf": "https://www.nasa.gov/wp-content/uploads/2025/07/flame-extinguishment-experiment-flex.pdf",
    "smoke-aerosol-measurement-experiment-same.pdf": "https://www.nasa.gov/wp-content/uploads/2025/07/smoke-aerosol-measurement-experiment-same.pdf",
    "smoke-point-in-co-flow-experiment-spice.pdf": "https://www.nasa.gov/wp-content/uploads/2025/07/smoke-point-in-co-flow-experiment-spice.pdf",
    "spacecraft-fire-safety-demonstration-saffire.pdf": "https://www.nasa.gov/wp-content/uploads/2025/07/spacecraft-fire-safety-demonstration-saffire.pdf",
    "structure-liftoff-in-combustion-experiment-slice.pdf": "https://www.nasa.gov/wp-content/uploads/2025/07/structure-liftoff-in-combustion-experiment-slice.pdf",
    "np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf": "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
    "apollo_1.html": "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1",
    "apollo_13.html": "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13",
    "mir_fire_1997.html": "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/",
    "nasa_combustion_science.html": "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/",
    "researchers_guide_combustion.html": "https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/",
    "spinoff_fire_attire.html": "https://spinoff.nasa.gov/node/9918",
    "spinoff_fire_detector.html": "https://spinoff.nasa.gov/node/9407",
    "spinoff_firemans_air_tanks.html": "https://spinoff.nasa.gov/node/9582",
}

SOURCE_LABELS = {"psi": "NASA PSI", "nasa": "nasa.gov", "doi": "DOI"}


def psi_url(accession: str | None) -> str | None:
    return PSI_INVESTIGATION.format(accession=accession) if accession else None


def source_link(path: str | None, accession: str | None) -> dict:
    name = PurePosixPath(path or "").name
    if name in NASA_URLS:
        return {"source_url": NASA_URLS[name], "source_label": SOURCE_LABELS["nasa"]}
    url = psi_url(accession)
    return {"source_url": url, "source_label": SOURCE_LABELS["psi"] if url else None}


def doi_url(doi: str | None) -> str | None:
    if not doi:
        return None
    match = re.search(r"10\.\d{4,9}/\S+", doi)
    return f"https://doi.org/{match.group(0).rstrip('.,;')}" if match else None


def locate_quote(text: str, quote: str) -> dict | None:
    words = re.findall(r"\w+", quote)
    if not words:
        return None
    for size in (len(words), 12, 6):
        pattern = r"\W+".join(re.escape(w) for w in words[:size])
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            end = match.end() if size == len(words) else min(len(text), match.start() + len(quote))
            return {"start": match.start(), "end": end}
    return None