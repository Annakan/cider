# Feature 01 — `struct` Field Type: Implementation Plan

> New card attribute type that stores structured YAML data, editable via Monaco, usable in Handlebars templates.

---

## Decisions Log

| # | Decision |
|---|---|
| 1 | **Name:** `struct` (avoids JS `object` confusion) |
| 2 | **Storage:** Single YAML string per card cell. Schema reference lives on `CardAttribute.schemaId` (optional), not on each cell. |
| 3 | **Cell UX:** Readonly cell + double-click opens dialog editor (v1). Side panel deferred — see [Side Panel Note](#side-panel-note). |
| 4 | **Monaco YAML:** Simple Monarch tokenizer + `js-yaml` parser. Full `monaco-yaml` integration deferred to Feature 03. |
| 5 | **Handlebars:** Two helpers — `parseyaml` (inline) and `yaml` (block), plus generic `get`. |
| 6 | **Schema storage:** Reuse `Document` entity with MIME `application/schema+json`. New sidebar top-level node "Schemas" that filters documents by this MIME. |
| 7 | **Schema validation:** Deferred. `CardAttribute.schemaId` is added as optional field now, validation logic comes later. |
| 8 | **File watcher:** Extended to support `.yaml`/`.yml`/`.json` schema files in Electron mode. |
| 9 | **XLSX import/export:** `struct` fields are exported/imported as plain text cells (YAML string as-is). |

### Side Panel Note

A side panel (resizable split view beside the spreadsheet) provides the best UX for repeated struct editing, but it requires:
- Restructuring the cards layout into a split-pane container
- Managing "active cell" state and bidirectional sync between the panel editor and the spreadsheet cell
- Handling panel open/close transitions without disrupting the virtual-scroll table

This is ~2-3× the work of a dialog and touches the core layout. **Recommended as a v2 upgrade** once the dialog-based editor is proven.

---

## Phase 1 — Data Model & Enum

### 1.1 Add `struct` to `FieldType` enum

**File:** `src/app/data-services/types/field-type.type.ts`

```typescript
export enum FieldType {
    text = 'text',
    dropdown = 'dropdown',
    dropdownOptions = 'dropdown-options',
    numeric = 'numeric',
    checkbox = 'checkbox',
    file = 'file',
    struct = 'struct'          // NEW
}
```

### 1.2 Add `schemaId` to `CardAttribute` interface

**File:** `src/app/data-services/types/card-attribute.type.ts`

```typescript
export interface CardAttribute {
    id: number;
    deckId: number;
    name: string;
    type: FieldType;
    description: string;
    options: DropdownOption[] | string;
    width?: number | 'auto';
    order?: number;
    isSystem?: boolean;
    schemaId?: number;         // NEW — optional reference to a Document (MIME: application/schema+json)
}
```

### 1.3 Dexie schema upgrade (version 11)

**File:** `src/app/data-services/indexed-db/db.ts`

Add version 11 that adds `schemaId` index to `cardAttributes`. No data migration needed (field is optional).

```typescript
this.version(11).stores({
    cardAttributes: '++id, deckId, name, [deckId+name], type, options, description, width, order, schemaId',
});
```

### 1.4 Expose `struct` in the card-attributes type dropdown

**File:** `src/app/data-services/services/card-attributes.service.ts`

Add `{ value: FieldType.struct, color: '#FFFFFF' }` to the `type` field options array (lines 29-34).

Optionally add a conditional `schemaId` field (similar to how `options` is shown only for `dropdown`):

```typescript
{
  field: 'schemaId',
  header: 'Schema',
  type: FieldType.dropdown,  // populated with schema documents
  visible: (e) => e.type === FieldType.struct
}
```

> **Note:** The `schemaId` dropdown options need to be populated from `DocumentsService.getAll({ mime: 'application/schema+json' })`. This requires wiring a service reference into the field definition, similar to how `Front Template` / `Back Template` dropdowns reference `CardTemplatesService`.

---

## Phase 2 — YAML Monarch Tokenizer

### 2.1 Create a basic YAML Monarch tokenizer

**File (new):** `src/app/shared/extensions/monaco-yaml-tokenizer.ts`

Define a Monarch tokenizer for YAML syntax highlighting. This does NOT require `monaco-yaml` — it's a pure tokenizer like the existing `css-handlebars` language.

Key tokens to handle:
- Keys (`key:`)
- Strings (single/double quoted, unquoted)
- Numbers, booleans, null
- Comments (`#`)
- Lists (`-`)
- Indentation-based nesting

### 2.2 Register the YAML language in Monaco

**File:** `src/app/shared/extensions/monaco-extension.ts`

In `loadMonacoEditor()`, register the new `yaml` language with the Monarch tokenizer from 2.1. Monaco has a built-in `yaml` language ID but no tokenizer by default in the AMD build — we provide our own.

---

## Phase 3 — Struct Cell Editor (Dialog)

### 3.1 `oatear-longtable` investigation results

The `SpreadsheetComponent` (v0.1.7) was inspected via its type declarations:

- **Outputs:** Only `onDataChange` and `onColumnChange` are exposed as `@Output` events. There is **no cell-click or cell-double-click output**.
- **`onCellDoubleClick`** exists as an internal method `(r: number, c: number) => void` — it starts inline editing. It is not an `@Output` and cannot be intercepted from the parent.
- **`ColumnType`** is strictly `'text' | 'dropdown' | 'checkbox' | 'numeric'` — no custom editor type.
- **`activeCell`** is a `WritableSignal<Coordinates | null>` — accessible via `@ViewChild`.

**Conclusion:** We use the readonly cell + DOM-level double-click approach.

### 3.2 Create `StructEditorDialogComponent`

**File (new):** `src/app/shared/components/struct-editor-dialog/struct-editor-dialog.component.ts` (+ `.html`, `.scss`, `.spec.ts`)

A PrimeNG `Dialog` containing:
- A Monaco editor instance configured with `language: 'yaml'`
- A "Save" button that emits the updated YAML string
- A "Cancel" button
- Optional: read-only display of the schema name (if `schemaId` is set)

The component accepts:
- `value: string` — the current YAML content
- `schemaId?: number` — for future validation
- `visible: boolean` — controls dialog visibility

And emits:
- `valueChange: EventEmitter<string>` — on save

Must be **standalone** (because `EntitySpreadsheetComponent` is standalone and imports it directly).

### 3.3 Integrate with `EntitySpreadsheetComponent`

**File:** `src/app/entity-spreadsheet/entity-spreadsheet.component.ts`

**Approach: readonly cell + double-click on wrapper div**

1. **Mark struct columns as readonly:**
   In `setupColumns()`, when `f.type === FieldType.struct`, set `readOnly: true` in the `ColumnConfig`. The `editor` stays `'text'` (the longtable only supports its 4 built-in types). The cell displays the raw YAML string (truncated naturally by cell width).

2. **Track which columns are struct type:**
   Maintain a `Set<string>` of field names that are struct columns (populated during `setupColumns()`).

3. **Add `@ViewChild` for the `SpreadsheetComponent`:**
   ```typescript
   @ViewChild(SpreadsheetComponent) spreadsheet!: SpreadsheetComponent;
   ```

4. **Add a `(dblclick)` handler on the wrapper div:**
   ```html
   <div class="spreadsheet-wrapper" (dblclick)="onSpreadsheetDblClick($event)">
   ```
   In the handler:
   - Read `this.spreadsheet.activeCell()` to get the current `{row, col}` coordinates
   - Look up the column config at that `col` index
   - If the column's field is in the struct fields set, open the `StructEditorDialogComponent` with the cell's current value
   - On save, write the new value back into `this.data()` at those coordinates and trigger `onDataChanged()`

5. **Why this works:** When the user double-clicks a readonly struct cell, the longtable's internal `onCellDoubleClick` fires but does nothing (cell is readonly). The `activeCell` signal is already set to those coordinates from the first click. Our wrapper `(dblclick)` handler fires and opens the dialog.

---

## Phase 4 — Handlebars Helpers

### 4.1 Add `parseyaml` inline helper

**File:** `src/app/shared/pipes/handlebars.pipe.ts`

```typescript
/**
 * {{get (parseyaml card.stats) "attack"}}
 */
Handlebars.registerHelper('parseyaml', function (yamlString) {
    if (!yamlString) return {};
    try {
        return yaml.load(yamlString);  // js-yaml
    } catch (e) {
        return {};
    }
});
```

### 4.2 Add `yaml` block helper

**File:** `src/app/shared/pipes/handlebars.pipe.ts`

```typescript
/**
 * {{#yaml card.stats}}
 *   <div>{{attack}}</div>
 *   <div>{{defense}}</div>
 * {{/yaml}}
 */
Handlebars.registerHelper('yaml', function (yamlString, options) {
    if (!yamlString) return '';
    try {
        const parsed = yaml.load(yamlString);
        return options.fn(parsed);
    } catch (e) {
        return '';
    }
});
```

### 4.3 Add `get` helper (generic object property accessor)

**File:** `src/app/shared/pipes/handlebars.pipe.ts`

```typescript
/**
 * {{get someObject "key"}}
 * {{get (parseyaml card.stats) "attack"}}
 */
Handlebars.registerHelper('get', function (obj, key) {
    if (!obj || !key) return '';
    return obj[key];
});
```

### 4.4 Install `js-yaml` dependency

```bash
npm install js-yaml
npm install --save-dev @types/js-yaml
```

Import in `handlebars.pipe.ts`:
```typescript
import * as yaml from 'js-yaml';
```

### 4.5 Update Monaco autocomplete suggestions

**File:** `src/app/shared/extensions/monaco-languages.ts`

Add `parseyaml`, `yaml`, and `get` to the Handlebars completion provider so they appear in autocomplete within `{{...}}` blocks.

---

## Phase 5 — Schema Documents (GUI)

### 5.1 Add "Schemas" top-level node in sidebar

**File:** `src/app/site-sidebar/site-sidebar.component.ts`

In `updateFiles()`, add a new section (after global-styles, before decks) that:
1. Fetches `documentsService.getAll({ mime: 'application/schema+json' })`
2. Creates a top-level "Schemas" folder node
3. Each schema document is a child node with route `/documents/{id}`
4. Context menu: Add Schema, Rename, Delete

The schemas are reusable across decks — e.g. a "gradient" schema can be referenced by `foreground_gradient`, `background_gradient`, etc.

### 5.2 Create schema document dialog

Reuse the existing `openCreateDialog` / `openCreateDocumentDialog` pattern in the sidebar, but default to:
```typescript
{
    name: 'new-schema',
    mime: 'application/schema+json',
    content: '{\n  "type": "object",\n  "properties": {}\n}'
}
```

### 5.3 Schema document editor

The existing `DocumentComponent` already switches editor language based on MIME type. Add a case for `application/schema+json` → `language: 'json'`.

**File:** `src/app/document/document.component.ts` — in `updateEditorType()`.

### 5.4 Electron file watcher support

**File:** `src/app/data-services/services/documents.service.ts`

Extend `supportedExtensions` to include `json`, `yaml`, `yml` and map them to appropriate MIME types. Schema files (`.schema.json` or placed in a `schemas/` subdirectory) should be imported with MIME `application/schema+json`.

---

## Phase 6 — Tests

### 6.1 Unit tests for Handlebars helpers
- `parseyaml` with valid YAML, invalid YAML, empty string, null
- `yaml` block helper with nested properties
- `get` helper with objects and missing keys

### 6.2 Unit tests for `struct` field type
- CardAttribute with `type: 'struct'` is created and persisted correctly
- `schemaId` is optional and nullable
- Spreadsheet correctly renders struct cells as text preview

### 6.3 Integration test for struct editing flow
- Create a card attribute of type `struct`
- Enter YAML in the dialog editor
- Verify the value is saved to the card
- Verify Handlebars template can access parsed YAML properties

---

## Performance Notes (Deferred)

### Caching Candidates

YAML parsing happens during Handlebars template rendering. In bulk rendering scenarios (thumbnails, export), the same YAML string may be parsed many times.

**Candidate locations for caching:**

1. **`CardToHtmlPipe.executeHandlebars()`** (`src/app/shared/pipes/template-to-html.pipe.ts:34-43`)
   - Before calling `template({card, assets})`, pre-parse all struct fields on the card into a `_parsed` cache object. Pass this cache into the template context so helpers can check it before re-parsing.

2. **`parseyaml` / `yaml` helpers themselves** (`src/app/shared/pipes/handlebars.pipe.ts`)
   - Use a simple `Map<string, object>` cache keyed by the YAML string hash. Clear on each render batch start.

3. **`CardsService` data loading** (`src/app/data-services/services/cards.service.ts`)
   - Parse struct fields once when cards are loaded and store the parsed objects alongside the raw YAML. This avoids parsing during rendering entirely but requires invalidation on edit.

4. **`RenderCacheService`** (`src/app/data-services/services/render-cache.service.ts`)
   - The existing render cache infrastructure may already handle this at the card level. If a card hasn't changed, its cached render is reused — so YAML parsing is avoided entirely for unchanged cards.

**Recommendation:** Start with approach #4 (rely on existing render cache). Only add YAML-specific caching (#2) if profiling shows it's a bottleneck.

---

## Dependency Summary

| Dependency | Version | Purpose |
|---|---|---|
| `js-yaml` | latest (^4.x) | YAML parsing for Handlebars helpers |
| `@types/js-yaml` | latest | TypeScript definitions |

No other new dependencies. `monaco-yaml` is deferred to Feature 03.

---

## File Change Summary

| File | Change |
|---|---|
| `src/app/data-services/types/field-type.type.ts` | Add `struct` enum value |
| `src/app/data-services/types/card-attribute.type.ts` | Add optional `schemaId` field |
| `src/app/data-services/indexed-db/db.ts` | Version 11 — `schemaId` index |
| `src/app/data-services/services/card-attributes.service.ts` | Add `struct` to type dropdown, add conditional `schemaId` field |
| `src/app/shared/extensions/monaco-yaml-tokenizer.ts` | **NEW** — Monarch YAML tokenizer |
| `src/app/shared/extensions/monaco-extension.ts` | Register YAML language |
| `src/app/shared/components/struct-editor-dialog/*` | **NEW** — Dialog component for YAML editing |
| `src/app/entity-spreadsheet/entity-spreadsheet.component.ts` | Handle `struct` editor type, double-click → dialog |
| `src/app/shared/pipes/handlebars.pipe.ts` | Add `parseyaml`, `yaml`, `get` helpers |
| `src/app/shared/extensions/monaco-languages.ts` | Add new helpers to autocomplete |
| `src/app/site-sidebar/site-sidebar.component.ts` | Add "Schemas" top-level node |
| `src/app/document/document.component.ts` | Handle `application/schema+json` MIME |
| `src/app/data-services/services/documents.service.ts` | Extend file watcher for schema files |
| `src/app/app.module.ts` | Declare `StructEditorDialogComponent` |
| `package.json` | Add `js-yaml`, `@types/js-yaml` |

---

## Implementation Order

```
Phase 1 (Data Model)  →  Phase 2 (Tokenizer)  →  Phase 4 (Helpers)  →  Phase 3 (Editor)  →  Phase 5 (Schemas)  →  Phase 6 (Tests)
      ↓                       ↓                       ↓                      ↓
  No UI needed           No UI needed           Can test in         Depends on 1+2
  Quick win              Quick win              templates           Most complex
```

Phases 1, 2, and 4 are independent and can be done in parallel. Phase 3 depends on 1 and 2. Phase 5 depends on 1. Phase 6 runs last.

---

## Resolved Questions

| # | Question | Resolution |
|---|---|---|
| 1 | **`oatear-longtable` cell interaction** | No cell-click output exists. Using readonly cells + DOM `(dblclick)` on wrapper + `activeCell` signal. See §3.1. |
| 2 | **Schema MIME type** | Using `application/schema+json` (official IANA MIME for JSON Schema). Works with `DocumentsService.getAll({ mime: ... })` since it's a simple string equality filter on a Dexie index. |
| 3 | **XLSX import/export** | Struct fields exported/imported as plain text cells (YAML string as-is). |



