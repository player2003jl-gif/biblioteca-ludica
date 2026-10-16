-- C1 experimental isolado. Sem tabelas nem dados do acervo oficial.
CREATE TABLE IF NOT EXISTS shelves (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO shelves(id, title, version)
VALUES ('c1-estante', 'Estante de demonstração C1', 1);
