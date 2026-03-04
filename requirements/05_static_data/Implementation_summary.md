# Static Data Feature — Implementation Summary

## Overview

This feature enables users to create YAML data documents containing structured static data (rarities, factions, types, etc.) and reference that data directly inside Handlebars card templates via a `data` context object and a `datalookup` block helper.

## Files Modified

### 1. `cider-app/src/app/data-services/electron/electron.service.ts`

- **`openProject()`** — Added `.yaml`, `.yml`, `.json` to the document file filter so these files are loaded from disk into IndexedDB when a project is opened.
- **`pruneDocuments()`** — Added `.yaml`, `.yml`, `.json` to the prune filter so deleted YAML/JSON documents are cleaned up from disk.

### 2. `cider-app/src/app/document/document.component.ts`

- **`updateEditorType()`** — Added `application/x-yaml` / `text/yaml` → `yaml` and `application/json` → `json` language mappings for Monaco editor syntax highlighting.

### 3. `cider-app/src/app/site-sidebar/site-sidebar.component.ts`

- **`updateFiles()`** — Added a new "Data" sidebar section that fetches all `application/x-yaml` documents and displays them as a collapsible tree with context menus (add, rename, delete).
- **`openCreateYamlDocumentDialog()`** — New method that creates a YAML data document with default content `# Static data\n` and mime type `application/x-yaml`.

### 4. `cider-app/src/app/shared/pipes/template-to-html.pipe.ts`

- **`transform()`** — Added optional `staticData` parameter (5th argument).
- **`executeHandlebars()`** — Passes `staticData` into the Handlebars context as `data`, making it available as `{{data.<filename>.<key>}}` in templates.

### 5. `cider-app/src/app/card-preview/card-preview.component.ts`

- Injected `StaticDataService`.
- Added `staticData` property, subscribed to `StaticDataService.getStaticData()` in `ngOnInit()`.
- Updated `getHash()` to pass `staticData` to the pipe.

### 6. `cider-app/src/app/card-preview/card-preview.component.html`

- Added `: staticData` as the 5th pipe argument in the `cardToHtml` pipe call.

### 7. `cider-app/src/app/shared/pipes/handlebars.pipe.ts`

- Registered `datalookup` block helper. Supports both array-of-objects (YAML anchor style) and direct map lookups.

### 8. `cider-app/src/app/shared/utils/string-utils.ts`

- **`mimeToExtension()`** — Added fallback for `application/x-yaml` / `text/yaml` → `yaml`.
- **`extensionToMime()`** — Added fallback for `yaml` / `yml` → `application/x-yaml`.

## Files Created

### 9. `cider-app/src/app/data-services/services/static-data.service.ts`

New `StaticDataService` (`providedIn: 'root'`):
- Listens to `AppDB.onChange()` and `AppDB.onLoad()`.
- On each change, reloads all `application/x-yaml` documents from `DocumentsService`, parses them with `js-yaml`, and emits a `Record<string, any>` via `BehaviorSubject`.
- Exposes `getStaticData(): Observable<Record<string, any>>` and `getStaticDataSnapshot()`.

## i18n Translation Keys Added

Added 4 new keys to all 15 language files (`en`, `fr`, `de`, `es`, `it`, `ja`, `bg`, `ko`, `nl`, `pl`, `pt`, `ru`, `tr`, `uk`, `zh`):

| Key | English Value |
|---|---|
| `sidebar.data-documents` | Data |
| `sidebar.add-new-data-document` | Add Data Document |
| `sidebar.create-new-data-document` | Create New Data Document |
| `sidebar.delete-data-document` | Delete Data Document |

## Build Status

All changes compile successfully with `ng build` — zero errors, only pre-existing CommonJS warnings.
