## Implementation Summary

All phases have been implemented, the production build passes, and all new tests pass.

### Files Created

| File | Purpose |
|---|---|
| `shared/extensions/monaco-yaml-tokenizer.ts` | Monarch tokenizer for YAML syntax highlighting in Monaco |
| `shared/components/struct-editor-dialog/struct-editor-dialog.component.ts` | Dialog with Monaco YAML editor for editing struct field values |
| `shared/components/struct-editor-dialog/struct-editor-dialog.component.html` | Template for the struct editor dialog |
| `shared/components/struct-editor-dialog/struct-editor-dialog.component.scss` | Styles for the struct editor dialog |
| `shared/extensions/monaco-yaml-tokenizer.spec.ts` | Unit tests for the YAML tokenizer (11 tests) |

### Files Modified

| File | Changes |
|---|---|
| `data-services/types/field-type.type.ts` | Added `struct` to `FieldType` enum |
| `data-services/types/card-attribute.type.ts` | Added optional `schemaId?: number` field |
| `data-services/indexed-db/db.ts` | Dexie schema v11 with `schemaId` index on `cardAttributes` |
| `data-services/services/card-attributes.service.ts` | `struct` in type dropdown, conditional `schemaId` field visible when type is `struct` |
| `shared/extensions/monaco-extension.ts` | Imports and registers YAML language on Monaco load |
| `shared/extensions/monaco-languages.ts` | Added `yaml` to block snippet suggestions for Handlebars autocomplete |
| `shared/pipes/handlebars.pipe.ts` | Added `parseyaml`, `yaml` (block), and `get` helpers via `js-yaml` |
| `shared/pipes/handlebars.pipe.spec.ts` | 16 new tests for the YAML/struct Handlebars helpers |
| `entity-spreadsheet/entity-spreadsheet.component.ts` | Struct cells are readonly; double-click opens YAML editor dialog; tracks struct fields via `structFields` set |
| `entity-spreadsheet/entity-spreadsheet.component.html` | Added `(dblclick)` handler on wrapper div and `<app-struct-editor-dialog>` |
| `site-sidebar/site-sidebar.component.ts` | "Schemas" top-level node with create/edit/delete context menus; `openCreateSchemaDialog()` method |
| `document/document.component.ts` | `application/schema+json` MIME type maps to `json` language in Monaco |
| `data-services/services/documents.service.ts` | File watcher extended for `.json`, `.yaml`, `.yml` extensions |
| All 15 `assets/i18n/*.json` files | Added `schemas`, `add-new-schema`, `create-new-schema` translation keys |
| `game-simulator/game-simulator.component.spec.ts` | Fixed pre-existing compilation errors (missing `GameSimulatorStateService` arg, readonly property assignments) |

### Dependencies Added

- `js-yaml` — YAML parser/serializer for Handlebars helpers
- `@types/js-yaml` — TypeScript type definitions

### Verification

- ✅ Production build passes (`ng build --configuration=production`)
- ✅ All 27 new tests pass (16 Handlebars helper tests + 11 YAML tokenizer tests)
- ✅ No new test failures introduced (remaining 8 failures are all pre-existing)