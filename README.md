# CSV Editor — TV Graphics Editor

Desktop application for editing TV lower-third graphics and exporting CSV data for broadcast systems.

Built for television production workflows where graphics are prepared in advance and consumed in real time during live or recorded broadcasts.

---

## Overview

CSV Editor is an Electron desktop application used to prepare TV graphics for broadcast.

The application allows editors to:

* manage TV graphics entities
* preview graphics in real time (16:9 preview)
* export broadcast CSV files
* prepare phone call graphics with images
* save and restore projects
* manage multiple shows during the same production day
* update the application through GitHub Releases

Current production target:

```txt
Obiectiv Comun (OC)
```

---

## Features

### Graphics entities

Supported entity types:

```txt
- Titles
- Persons
- Locations
- Phone Calls
```

### Preview16x9

Real-time preview system used to simulate final TV graphics output.

Supports:

```txt
- text layers
- image layers
- shapes
- backgrounds
```

### Template Editor (TED)

Advanced template editing mode.

Allows editing:

```txt
- text positions
- sizes
- font settings
- colors
- image behavior
- shape styling
- backgrounds
```

Templates are previewed live in Preview16x9.

Template configuration can be saved as JSON.

---

## Tech stack

Built with:

```txt
Electron
React
TypeScript
Vite
PapaParse
Electron Builder
Electron Updater
Vitest / Testing Library
```

---

## Project structure

```txt
electron/
  main/              Electron main process
  preload/           Secure preload bridge

src/
  components/        UI components
  features/          Feature modules
  templates/         Graphics templates
  shared/            Shared types + IPC
  state/             App state

public/
  static assets
```

---

## Requirements

Install:

```txt
Node.js 20+
Git
npm
```

Recommended IDE:

```txt
WebStorm / PhpStorm
VSCode
```

---

## Clone repository

```bash
git clone https://github.com/devLilic/CsvEditor.git
cd CsvEditor
```

---

## Install dependencies

Run:

```bash
npm install
```

---

## Development mode

Start application:

```bash
npm run dev
```

This starts:

```txt
- Vite dev server
- Electron main process
- preload build
```

The app opens automatically.

---

## Run tests

Run all tests:

```bash
npm test
```

Run watch mode:

```bash
npm run test:watch
```

---

## Build application

Build renderer + electron:

```bash
npm run build
```

---

## Create Windows executable

Create installer:

```bash
npm run dist:win
```

Generated files are placed in:

```txt
dist/
release/
or build output directory
```

(depending on electron-builder configuration)

---

## Application settings

The application stores configuration such as:

```txt
- working CSV file
- backup folder
- saved projects folder
- phone images folder
- CSV export folder
```

Settings are persisted locally.

---

## Working CSV flow

Application works with a single active CSV file.

Example:

```txt
working.csv
```

Workflow:

```txt
1. Edit graphics
2. Save entities
3. Application writes CSV
4. Broadcast system consumes CSV
```

---

## Entity CSV export

Application exports entity-specific CSV files.

Example:

```txt
OC_titles.csv
OC_persons.csv
OC_locations.csv
OC_phones.csv
```

These files are rewritten automatically when entities are changed.

---

## Phone call graphics

Phone calls support:

```txt
- name
- role/function
- photo
```

Image workflow:

```txt
upload image
→ resize
→ crop
→ save to WORK_PATH
→ export real image path to CSV
```

---

## Saved projects

Application supports:

```txt
Save Project
Load Project
```

Projects are saved as CSV snapshots.

Loading a project restores:

```txt
working CSV
entity exports
preview state
```

---

## Automatic backup

When creating a new project:

```txt
1. current working CSV is backed up
2. default project content is restored
```

Backups are timestamped.

Example:

```txt
2026-06-01_18-30-44.csv
```

Backup retention:

```txt
last 10 files
```

---

## Template system

Templates exist in three layers.

Priority:

```txt
1. user template override
2. bundled default template JSON
3. hardcoded fallback templates
```

Files:

```txt
src/templates/broadcast/defaultTemplates.oc.json
```

User templates:

```txt
userData/templates/ocTemplates.json
```

---

## Application update system

Application supports updates through GitHub Releases.

Update flow:

```txt
Settings
→ Check for updates
→ Download
→ Install
```

Release artifacts:

```txt
Setup.exe
latest.yml
.blockmap
```

---

## Release process

### 1. Switch to production branch

```bash
git switch version_Obiectiv_Comun
git pull origin version_Obiectiv_Comun
```

### 2. Validate build

```bash
npm test
npm run build
npm run dist:win
```

### 3. Create new version

Patch version:

```bash
npm version patch
```

Minor version:

```bash
npm version minor
```

Major version:

```bash
npm version major
```

### 4. Push branch + tag

```bash
git push origin version_Obiectiv_Comun --follow-tags
```

GitHub Actions will:

```txt
- build installer
- generate release assets
- publish GitHub Release
```

---

## Git workflow

Feature development:

```bash
git switch version_Obiectiv_Comun
git pull origin version_Obiectiv_Comun

git checkout -b feature/my-feature
```

Merge feature:

```bash
git switch version_Obiectiv_Comun
git merge feature/my-feature
```

Push:

```bash
git push origin version_Obiectiv_Comun
```

---

## Important notes

### Production branch

Current production branch:

```txt
version_Obiectiv_Comun
```

### Auto update

Never reuse versions.

Always increment version before release:

```txt
3.0.3 → 3.0.4
```

### Build validation

Before publishing:

```bash
npm test
npm run build
npm run dist:win
```

---

## License

Internal/private project.

Not intended for public redistribution.
