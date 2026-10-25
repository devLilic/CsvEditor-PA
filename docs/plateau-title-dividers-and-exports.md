# PLATOU title dividers and title exports

## Divider marker

The exact divider marker is `[ DIVIDER ]`. It is valid only in `INVITATI / PLATOU > Titles`; it remains an editor-only ordering helper and never appears in broadcast exports.

## Project storage

The active project state is stored as JSON in `Saved/current-project.json`. Saved snapshots use JSON in `Backup`. The application does not write a full-project CSV during normal editing.

## Broadcast exports

The `Export` folder contains the current `titles`, `persons`, locations, phone images, wait-title/location, and Quick Titles CSV files. A configurable prefix is applied to each export filename. The title export includes `Nr`, `Titlu`, `Supratitlu`, and `Template`; the person export includes `Sectiune`, `Nume`, `Functie`, and `Template`.

Titles with the lower-third type `Ultima oră` remain ordinary title rows and carry their configured design through the `Template` column. There is no separate Hot Titles editor or `titles_with_hot` export.

## Numbering

Only real title rows receive numbers. Dividers are ignored during numbering, so title numbers are consecutive within each section.

## Title history backup

The dedicated title-history backup remains a separate CSV containing only PLATOU titles and divider markers. It is stored in `Backup` and has its own retention policy.
