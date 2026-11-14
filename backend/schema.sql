PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS investigations (
    accession        TEXT PRIMARY KEY,
    acronym          TEXT,
    title            TEXT NOT NULL,
    project_type     TEXT,
    platform         TEXT,
    primary_area     TEXT CHECK (primary_area IN ('prevention', 'detection', 'suppression', 'fundamental')),
    objective        TEXT,
    hypothesis       TEXT,
    approach         TEXT,
    research_impacts TEXT,
    start_date       TEXT,
    end_date         TEXT,
    source_json      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publications (
    id        INTEGER PRIMARY KEY,
    accession TEXT NOT NULL REFERENCES investigations(accession),
    title     TEXT NOT NULL,
    authors   TEXT,
    doi       TEXT,
    status    TEXT,
    UNIQUE (accession, title)
);

CREATE TABLE IF NOT EXISTS source_tables (
    id        INTEGER PRIMARY KEY,
    accession TEXT NOT NULL REFERENCES investigations(accession),
    file_name TEXT NOT NULL UNIQUE,
    sha256    TEXT NOT NULL,
    columns   TEXT NOT NULL,
    row_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS raw_rows (
    id        INTEGER PRIMARY KEY,
    table_id  INTEGER NOT NULL REFERENCES source_tables(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    data      TEXT NOT NULL,
    UNIQUE (table_id, row_index)
);

CREATE TABLE IF NOT EXISTS tests (
    id             INTEGER PRIMARY KEY,
    accession      TEXT NOT NULL REFERENCES investigations(accession),
    raw_row_id     INTEGER NOT NULL UNIQUE REFERENCES raw_rows(id) ON DELETE CASCADE,
    test_code      TEXT,
    test_date      TEXT,
    fuel           TEXT,
    fuel_class     TEXT CHECK (fuel_class IN ('solid', 'droplet', 'gas', 'aerosol')),
    configuration  TEXT,
    diluent        TEXT,
    o2_min         REAL,
    o2_max         REAL,
    pressure_kpa   REAL,
    flow_min_cm_s  REAL,
    flow_max_cm_s  REAL,
    ignited        INTEGER,
    outcome        TEXT,
    burn_time_s    REAL,
    is_approximate INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS measurements (
    test_id        INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    quantity       TEXT NOT NULL,
    value          REAL NOT NULL,
    unit           TEXT,
    is_approximate INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (test_id, quantity)
);

CREATE TABLE IF NOT EXISTS documents (
    id        INTEGER PRIMARY KEY,
    accession TEXT REFERENCES investigations(accession),
    path      TEXT NOT NULL UNIQUE,
    sha256    TEXT NOT NULL,
    doc_type  TEXT,
    title     TEXT,
    n_pages   INTEGER,
    relevance REAL,
    status    TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS pages (
    id          INTEGER PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_no     INTEGER NOT NULL,
    text        TEXT NOT NULL,
    UNIQUE (document_id, page_no)
);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(text, content='pages', content_rowid='id');

CREATE TABLE IF NOT EXISTS chunks (
    id        INTEGER PRIMARY KEY,
    page_id   INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    chunk_no  INTEGER NOT NULL,
    text      TEXT NOT NULL,
    embedding BLOB,
    UNIQUE (page_id, chunk_no)
);

CREATE TABLE IF NOT EXISTS findings (
    id           INTEGER PRIMARY KEY,
    accession    TEXT REFERENCES investigations(accession),
    statement    TEXT NOT NULL,
    safety_area  TEXT NOT NULL CHECK (safety_area IN ('prevention', 'detection', 'suppression', 'fundamental')),
    finding_type TEXT NOT NULL CHECK (finding_type IN ('quantitative', 'qualitative', 'gap')),
    quantity     TEXT,
    value        REAL,
    unit         TEXT,
    conditions   TEXT,
    confidence   REAL CHECK (confidence BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS citations (
    finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    quote      TEXT NOT NULL,
    verified   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (finding_id, page_id)
);

CREATE TABLE IF NOT EXISTS scenarios (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    o2_fraction  REAL NOT NULL,
    pressure_kpa REAL NOT NULL,
    gravity_g    REAL NOT NULL,
    description  TEXT
);

INSERT OR IGNORE INTO scenarios VALUES
    ('iss',          'ISS (nominal)',                    0.21,  101.3, 0.0,   'Atmósfera estándar a nivel del mar'),
    ('eva_staging',  'Preparación de EVA',               0.265, 70.3,  0.0,   '10.2 psia, usada antes de paseos espaciales'),
    ('lunar',        'Hábitat lunar (Artemis)',          0.34,  56.5,  0.165, 'Atmósfera de exploración recomendada: 8.2 psia, 34 % O2'),
    ('mars',         'Hábitat en Marte',                 0.34,  56.5,  0.38,  'Misma atmósfera de exploración, gravedad marciana');

CREATE INDEX IF NOT EXISTS idx_tests_accession ON tests(accession);
CREATE INDEX IF NOT EXISTS idx_tests_o2 ON tests(o2_min, o2_max);
CREATE INDEX IF NOT EXISTS idx_findings_area ON findings(safety_area);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);