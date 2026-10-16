-- Seed A as revision 1 in ISOLATED D1 only; record B as unpublished immutable historical variant.
-- No EPUBs, reading progress, notes, private user data, or tokens.
CREATE TABLE IF NOT EXISTS bl2_layout_archived_variants (
 archive_id TEXT PRIMARY KEY, canonical_revision INTEGER NOT NULL, canonical_sha256 TEXT NOT NULL,
 historical_sha256 TEXT NOT NULL, patch_json TEXT NOT NULL CHECK(json_valid(patch_json)),
 source_backup_sha256 TEXT NOT NULL, disposition TEXT NOT NULL CHECK(disposition='historical_nonpublished'),
 archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS bl2_archive_protect_update BEFORE UPDATE ON bl2_layout_archived_variants
BEGIN SELECT RAISE(ABORT,'historical archive immutable'); END;
CREATE TRIGGER IF NOT EXISTS bl2_archive_protect_delete BEFORE DELETE ON bl2_layout_archived_variants
BEGIN SELECT RAISE(ABORT,'historical archive immutable'); END;
UPDATE bl2_published_layout
 SET revision=1, json='{"version":7,"architecture":"reception-library-virtual-reading","assetScale":1,"worldScale":2,"app":"Biblioteca Lúdica II v0.4.9","roomSizes":{"hall":{"tilesW":24,"tilesH":24,"cropLeft":0,"cropTop":0},"archive":{"tilesW":44,"tilesH":26,"cropLeft":0,"cropTop":0}},"rooms":{"hall":[{"id":"h-counter","kind":"counter","x":220,"y":260,"w":320,"h":76,"solid":true},{"id":"h-table","kind":"table","x":512,"y":592,"w":204,"h":58,"solid":true},{"id":"user-mv9ym902-2","kind":"shelf","x":416,"y":448,"w":296,"h":96,"solid":true,"assetKey":"estante_baixa","shelfCategory":"geral","shelfName":"teste999","functional":true}],"archive":[{"id":"a-shelf-1","kind":"shelf","x":160,"y":226,"w":192,"h":96,"solid":true,"assetKey":"estante_alta","shelfCategory":"filosofia","shelfName":"Estante Frontal — Teste","functional":true},{"id":"l-shelf-1","kind":"shelf","x":1170,"y":242,"w":176,"h":96,"solid":true,"assetKey":"estante_lateral","shelfCategory":"geral","shelfName":"Estante Lateral — Teste","functional":true},{"id":"r-shelf-2","kind":"shelf","x":844,"y":570,"w":216,"h":96,"solid":true,"assetKey":"estante_baixa","shelfCategory":"historia","shelfName":"Estante Baixa — Teste","functional":true},{"id":"a-desk","kind":"table","x":610,"y":590,"w":110,"h":58,"solid":true},{"id":"r-table","kind":"table","x":360,"y":610,"w":186,"h":84,"solid":true}]},"doors":{"hall":[{"id":"D-01","side":"west","x":54,"y":384,"width":96}],"archive":[{"id":"D-01-R","side":"east","x":1354,"y":390,"width":96},{"id":"D-READ","side":"north","x":640,"y":224,"width":96}]},"npcs":{"hall":null,"archive":{"id":"archive-librarian","x":938,"y":132}},"interactionModes":{"h-counter":"both","a-shelf-1":"both","a-shelf-2":"highlight","a-shelf-3":"indicator","a-shelf-4":"none","r-table":"both","h-table":"none","user-mv9ym902-2":"both","l-shelf-1":"both","r-shelf-2":"both","a-desk":"both"},"scene":{"hall":[],"archive":[]}}', sha256='f5dca6f869db6508c8b55f75bcc60c51a2b96379e636e36665df23f1b4ff63ee', updated_at=CURRENT_TIMESTAMP
 WHERE id='official' AND revision=0 AND json IS NULL;
INSERT INTO bl2_layout_archived_variants
 (archive_id,canonical_revision,canonical_sha256,historical_sha256,patch_json,source_backup_sha256,disposition)
 VALUES ('B-2026-10-16',1,'f5dca6f869db6508c8b55f75bcc60c51a2b96379e636e36665df23f1b4ff63ee','21c20b2321a08c4eb146608baca34c74af9c18ff14fd640ad82fa27afe5d0743','{"room":"hall","objectId":"user-mv9ym902-2","changes":{"x":240,"y":384,"shelfName":"teste m11"},"baseOfficialRevision":1}','4a42409ea560215041f95b7a0cbf4e516f844d9665f437055965b8bf1bc97a2c','historical_nonpublished');
