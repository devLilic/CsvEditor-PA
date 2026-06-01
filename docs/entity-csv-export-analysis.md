# Entity CSV export analysis

## Scop

Nota interna pentru integrarea unui export CSV separat per entity, fara schimbari de comportament in acest pas.

## Unde se scrie CSV integral

- Autosave-ul principal este in `src/features/csv-editor/hooks/useCsvAutosave.ts`.
  - `CsvEditorPage` monteaza `useCsvInitialization()` si `useCsvAutosave({ debounceMs: 800 })`.
  - `useCsvAutosave` observa `state.entities`.
  - La schimbare serializeaza tot `EntitiesState` cu `serializeCsv(...)`.
  - Apeleaza `csvService.write(csv)`.
  - `csvService.write` trimite IPC `writeCsv`.
  - In main process, `electron/main/csv-handlers.ts` trateaza `IPC_CHANNELS.CSV_WRITE` si scrie continutul in `workingCsvPath`.

- Proiect nou scrie CSV integral in `src/features/csv-editor/hooks/useEntities.ts`.
  - `startNewProject()` face backup prin `csvService.createBackup(...)`.
  - `resetToDefaultProject()` face `dispatch({ type: 'ENTITY_CLEAR_ALL', ... })`.
  - Apoi serializeaza noul proiect default si apeleaza `csvService.write(defaultProjectCsv)`.

- Load saved project scrie CSV integral in main process, in `electron/main/csv-project-handlers.ts`.
  - `loadCsvProjectIntoWorking(...)` citeste proiectul salvat.
  - Face backup pentru CSV-ul curent.
  - Apeleaza direct `fsp.writeFile(workingCsvPath, savedProjectContent, 'utf-8')`.
  - Renderer-ul primeste `content`, apoi `EditorHeader.handleProjectLoaded` face `dispatch({ type: 'CSV_LOADED', payload: parseCsv(content) })`.

- Salvarea unui proiect separat scrie un CSV integral in folderul de proiecte salvate.
  - `SavedProjectsModal` trimite `currentCsvContent={serializeCsv(state.entities)}`.
  - `savedProjectsService.saveCurrentAsProject(...)` trimite IPC.
  - `electron/main/csv-project-handlers.ts` scrie fisierul cu `fsp.writeFile(fullPath, payload.content, 'utf-8')`.

## Fluxuri identificate

1. Editare entitate
   - UI: `src/ui/components/EntityEditor.tsx`, `saveEntity()`.
   - Daca exista selectie: `updateEntity(selected.sectionId, selected.entityType, selected.id, payload)`.
   - Hook: `src/features/csv-editor/hooks/useEntities.ts`, `updateEntity(...)`.
   - Reducer: `src/features/csv-editor/state/csv.reducer.ts`, actiunea `ENTITY_UPDATE`.
   - Persistare curenta: indirect, prin `useCsvAutosave`, dupa schimbarea `state.entities`.

2. Add entitate
   - UI: `src/ui/components/EntityEditor.tsx`, `saveEntity()`.
   - In create mode: `addEntity(sectionId, editorEntityType, payload)`.
   - Hook: `src/features/csv-editor/hooks/useEntities.ts`, `addEntity(...)`.
   - Reducer: `src/features/csv-editor/state/csv.reducer.ts`, actiunea `ENTITY_ADD`.
   - Persistare curenta: indirect, prin `useCsvAutosave`.

3. Delete entitate
   - UI: `src/ui/components/EntityList.tsx`, butonul `Sterge` in edit mode.
   - Hook: `src/features/csv-editor/hooks/useEntities.ts`, `deleteEntity(...)`.
   - Reducer: `src/features/csv-editor/state/csv.reducer.ts`, actiunea `ENTITY_DELETE`.
   - Persistare curenta: indirect, prin `useCsvAutosave`.

4. Proiect nou
   - UI: `src/ui/components/layout/EditorHeader.tsx`, `handleStartNewProject()`.
   - Hook: `src/features/csv-editor/hooks/useEntities.ts`, `startNewProject()`.
   - Backup: `csvService.createBackup(serializeCsv(state.entities))`.
   - Reset: `ENTITY_CLEAR_ALL`.
   - Persistare integrala imediata: `csvService.write(serializeCsv(nextEntities))`.

5. Load saved project
   - UI: `src/ui/components/csv/SavedProjectsModal.tsx`, `handleLoad(filename)`.
   - Renderer service: `savedProjectsService.loadProjectIntoWorkingCsv(...)`.
   - Main process: `electron/main/csv-project-handlers.ts`, `loadCsvProjectIntoWorking(...)`.
   - Persistare integrala imediata: `fsp.writeFile(workingCsvPath, savedProjectContent, 'utf-8')`.
   - Dupa raspuns: `EditorHeader.handleProjectLoaded(content)` face `CSV_LOADED` cu `parseCsv(content)`.

6. Load CSV integral la startup
   - Page: `src/ui/pages/CsvEditorPage.tsx` monteaza `useCsvInitialization()`.
   - Hook: `src/features/csv-editor/hooks/useCsvInitialization.ts`.
   - Citeste settings prin `csvFileSettingsService.getCsvFileSettings()`.
   - Daca `workingCsvPath` exista: `csvService.getWorkingCsv()`.
   - Parse: `parseCsv(workingCsv.content)`.
   - State load: `dispatch({ type: 'CSV_LOADED', payload: entities })`.
   - Nu scrie pe disc la startup; `useCsvAutosave` evita primul run dupa `CSV_LOADED`.

## Phone entities

- `phoneCalls` este view UI, nu entity type separat in CSV.
- Datele telefonice sunt `persons` cu `image`.
- `src/features/csv-editor/domain/entities.ts` defineste `Person.image`.
- `src/features/csv-editor/utils/csvSerializer.ts` scrie `person.image` in coloana CSV `Image`.
- Daca imaginea este `WORK_PATH/...`, serializerul o poate expanda folosind `phoneImageWorkPath`.
- `useCsvAutosave` obtine `phoneImageSettings.workPath` si il paseaza in `serializeCsv(...)`.

## Puncte de integrare minim invazive

- Pentru export separat per entity dupa add/edit/delete:
  - Cel mai curat punct este dupa schimbarea `state.entities`, aproape de `useCsvAutosave`, pentru ca acolo exista deja state-ul canonic final si debounce.
  - Evita side effects in reducer; reducerul trebuie sa ramana pur.
  - O optiune minima este un hook nou, de tip `useEntityCsvExport`, montat langa `useCsvAutosave` in `CsvEditorPage`.
  - Hook-ul poate compara snapshot-ul anterior cu `state.entities` si poate exporta doar entitatile afectate.

- Pentru export full dupa load saved project:
  - Punctul sigur este dupa `EditorHeader.handleProjectLoaded(content)`, dupa `parseCsv(content)` si `CSV_LOADED`.
  - Alternativ, hook-ul nou poate reactiona la schimbarea de la `CSV_LOADED`, dar trebuie sa evite exportul automat de startup daca nu este dorit.

- Pentru proiect nou:
  - Punctul explicit este `resetToDefaultProject()` dupa `csvService.write(defaultProjectCsv)` cu succes.
  - Daca exportul separat trebuie sa reflecte proiectul nou complet, este mai sigur un export full dupa reset, nu exporturi per entity.

- Pentru load CSV integral la startup:
  - Nu este recomandat export automat imediat la startup, ca sa nu modifice fisiere auxiliare doar prin deschiderea aplicatiei.
  - Daca va fi necesara sincronizare, trebuie conditionata separat de exportul declansat de user.

## Concluzie

CSV-ul integral este persistat real in doua moduri:

1. Renderer -> `csvService.write(...)` -> `IPC_CHANNELS.CSV_WRITE` -> `fsp.writeFile(workingCsvPath, content)`.
2. Main process direct in `loadCsvProjectIntoWorking(...)` -> `fsp.writeFile(workingCsvPath, savedProjectContent)`.

Planul minim invaziv este sa adaugam exportul separat ca side-effect nou in renderer, langa autosave, si sa pastram reducerul, parserul si serializerul integral neschimbate.
