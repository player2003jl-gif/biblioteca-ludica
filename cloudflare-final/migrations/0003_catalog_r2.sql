-- BL2 Cloudflare final: versioned catalog metadata + R2 asset registry.
CREATE TABLE IF NOT EXISTS bl2_catalog_state (
  id TEXT PRIMARY KEY CHECK(id='official'),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  json TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO bl2_catalog_state(id,revision,json,sha256)
VALUES('official',0,'{"version":1,"books":[]}','8a600869925f18d4bb9d94b548762668a0c0841c793351c00d642f677b0fb893');

CREATE TABLE IF NOT EXISTS bl2_catalog_history (
  revision INTEGER PRIMARY KEY,
  json TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS bl2_catalog_audit
AFTER UPDATE OF revision ON bl2_catalog_state
WHEN NEW.id='official' AND NEW.revision > OLD.revision
BEGIN
  INSERT INTO bl2_catalog_history(revision,json,sha256)
  VALUES(NEW.revision,NEW.json,NEW.sha256);
END;

CREATE TABLE IF NOT EXISTS bl2_assets (
  sha256 TEXT PRIMARY KEY,
  size INTEGER NOT NULL CHECK(size >= 0),
  media_type TEXT NOT NULL,
  original_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
