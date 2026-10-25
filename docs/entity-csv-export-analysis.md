# Project state and entity CSV exports

The active `EntitiesState` is stored as JSON in `Saved/current-project.json`. The app also creates JSON snapshots in `Backup` for destructive project changes. The full-project CSV parser and serializer remain available for importing legacy CSV files, but normal editing does not write a full-project CSV.

CSV files in `Export` are generated from the active state by `electron/main/entity-export-service.ts`. Their names use the configurable prefix from Settings. The title and person exports include their `Template` values; the main project CSV is not generated.

Older saved project CSVs remain readable. New saved projects are JSON. When an older CSV project is loaded, the app parses it, restores known lower-third assignments from the current title/person exports, then saves it as the active JSON state.

The legacy `Ultima Ora` CSV column and `hotTitle` row shape remain in import and migration code so older project files can still be read. They are not exposed as an editor tab and do not produce a separate Hot Titles export. The lower-third type `Ultima oră` remains available as a graphic style for ordinary titles and persons.
