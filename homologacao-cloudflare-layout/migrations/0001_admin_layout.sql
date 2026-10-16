-- BL2 staging isolated layout only
CREATE TABLE IF NOT EXISTS bl2_published_layout (
 id TEXT PRIMARY KEY CHECK(id='official'),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
 json TEXT,
 sha256 TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO bl2_published_layout (id,revision,json,sha256) VALUES('official',0,NULL,NULL);
CREATE TABLE IF NOT EXISTS bl2_layout_history (
 revision INTEGER PRIMARY KEY,
 json TEXT NOT NULL,
 sha256 TEXT NOT NULL,
 saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS bl2_layout_audit AFTER UPDATE OF revision ON bl2_published_layout
WHEN NEW.id='official' AND NEW.revision > OLD.revision
BEGIN INSERT INTO bl2_layout_history(revision,json,sha256) VALUES(NEW.revision,NEW.json,NEW.sha256); END;
