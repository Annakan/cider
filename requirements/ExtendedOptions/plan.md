# StringDropdown / StringOption — Implementation Plan

## Decisions Confirmed

1. **Type naming**:
   - `ExDropdown` -> `StringDropdown`
   - `ExtendedOption` -> `StringOption`
2. **Behavior split**: keep existing `dropdown` behavior unchanged; add separate `string-dropdown` behavior.
3. **Template style consistency**: keep usage aligned with existing `card.*` patterns.
4. **CSV maintainability**: add a separate column for string option payload.

## Clarification on "JSON as string" vs "string value"

The important distinction is mainly about **editor semantics + runtime contract**, not just storage encoding:

- Any data can be serialized to JSON string in CSV/DB.
- But this feature intentionally defines a **typed UI behavior** where each option has a dedicated **textarea string payload**.
- So we should treat the new payload as a **domain field** (`stringValue`) rather than "arbitrary JSON blob".

This keeps UX predictable, easier to validate, and easier to consume in Handlebars.

## Finalized Choices

1. `StringOption` payload key is **`stringValue`**.
2. Template access uses derived **`card.*` fields** (e.g. `{{card.rarityString}}`).
3. CSV dedicated column name is **`stringOptions`**.
4. Migration/backfill default for missing string payload is **`''`**.
5. This is an **additive feature**: existing `dropdown` and new `string-dropdown` coexist.
6. Existing dropdown data is legacy (conceptually `ColorOption`) and must **not** be auto-converted.

---

## Current-State Findings (points of change)

### Data model and field types
- Field types are centralized in `FieldType` enum: `text`, `dropdown`, `dropdown-options`, `numeric`, `checkbox`, `file`.
- Relevant files:
  - `cider-app/src/app/data-services/types/field-type.type.ts`
  - `cider-app/src/app/data-services/types/card-attribute.type.ts`
  - `cider-app/src/app/data-services/types/entity-field.type.ts`

### Attribute options editing/UI
- Attribute definitions and type dropdown live in:
  - `cider-app/src/app/data-services/services/card-attributes.service.ts`
- Option editor component currently supports `{ value, color }` only:
  - `cider-app/src/app/shared/components/dropdown-option-editor/dropdown-option-editor.component.ts`
  - `cider-app/src/app/shared/components/dropdown-option-editor/dropdown-option-editor.component.html`
- Dialog/table rendering paths that branch by field type:
  - `cider-app/src/app/entity-dialog/entity-dialog.component.html`
  - `cider-app/src/app/entity-table/entity-table.component.html`
  - `cider-app/src/app/entity-spreadsheet/entity-spreadsheet.component.ts`

### Runtime parsing/normalization of options
- Dropdown option normalization/parsing (legacy strings/JSON):
  - `cider-app/src/app/data-services/services/card-attributes.service.ts`
  - `cider-app/src/app/data-services/services/cards.service.ts`

### DB schema and migrations
- Dexie schema + migrations + `initializeData` normalization:
  - `cider-app/src/app/data-services/indexed-db/db.ts`
- Existing migration logic maps legacy `'option' -> 'dropdown'` and upgrades option arrays.

### Import/export/save/load
- CSV import/export logic serializes dropdown and dropdown-options fields as JSON when object:
  - `cider-app/src/app/shared/utils/xlsx-utils.ts`
  - `cider-app/src/app/shared/utils/xlsx-utils.spec.ts`
- Desktop save/load writes `attributes.csv` and re-imports using service field definitions:
  - `cider-app/src/app/site-menu/site-menu.component.ts`
  - `cider-app/src/app/data-services/electron/electron.service.ts`

### Handlebars
- Helpers and template execution are in:
  - `cider-app/src/app/shared/pipes/handlebars.pipe.ts`
  - `cider-app/src/app/shared/pipes/template-to-html.pipe.ts`
- Current template context is primarily `{ card, assets }`; no direct helper for dropdown option metadata lookup.

---

## Proposed Design (Updated)

### New types
1. Add a new card attribute type: `FieldType.stringDropdown = 'string-dropdown'`.
2. Add a new options payload type:
   - `StringOption { value: string; color: string; stringValue: string; }`
3. Keep existing `DropdownOption` intact for regular `dropdown` fields.

### Behavioral model
- `dropdown` (existing): unchanged behavior, uses `DropdownOption`.
- `string-dropdown` (new): card field stores selected option `value` (same as dropdown), while templates can resolve `stringValue` via helper/derived context.
- Both types coexist; no implicit type migration from `dropdown` to `string-dropdown`.

### Handlebars access
- Keep `card.*` access homogeneous by adding derived context fields.
- Example usage:
  - Preferred homogeneous access: `{{card.rarityString}}` (derived at render-time)
  - resolves the `stringValue` associated with the selected option.
- Implementation approach:
  - Build a lookup map from attribute definitions.
  - Inject derived card keys into render context (e.g. `rarityString`).
  - Keep helper support optional/internal, but `card.*` derived access is the public pattern.

### CSV contract
- Keep existing `Options` column for base options (`value`, `color`).
- Add a second dedicated column named `stringOptions` for string payload data.
- Import/export must round-trip both columns.

---

## Implementation Steps

### Step 1 — Type system and interfaces
1. Add `string-dropdown` to `FieldType` enum as `FieldType.stringDropdown`.
2. Create `string-option.type.ts`.
3. Update `CardAttribute` typing to support base options + string options payload.
4. Update `EntityField` typing for compatibility with both option structures.

### Step 2 — UI/editor support
1. Extend type choices in `CardAttributesService` (`Type` column options) to include `string-dropdown`.
2. Add a dedicated field type for editing string options (recommended: `string-dropdown-options`) or reuse with mode flag.
3. Update dropdown option editor component to support `stringValue` textarea for `string-dropdown`.
4. Update dialog/table displays to render string option metadata and counts clearly.
5. Update spreadsheet column mapping methods:
   - `mapEditor(...)`
   - `mapToFieldType(...)`

### Step 3 — Normalization and creation logic
1. Update `CardAttributesService.create(...)` normalization:
   - parse legacy string options for both dropdown and string-dropdown.
   - ensure string-dropdown options hydrate to `{ value, color, stringValue }`.
2. Update `CardsService.cardAttributeToEntityField(...)` parsing to branch by `attribute.type` and parse corresponding option shape.
3. Preserve old data formats during reads (string arrays, JSON arrays of strings, dropdown objects).

### Step 4 — Handlebars integration
1. Add helper(s) in `handlebars.pipe.ts`:
   - optional/internal helper `optionString` to resolve selected option -> `stringValue`.
2. Provide helper context data at render time in `template-to-html.pipe.ts` (or precompute in card preview flow):
   - include attribute-option metadata map in root context.
   - derive `card.<attributeName>String` keys for homogeneous template usage.
3. Ensure derived `card.*String` fields are available for both HTML and CSS template compilation contexts.

### Step 5 — DB migration and data upgrade
1. Add **new Dexie version block** (v11) in `db.ts`.
2. Migration responsibilities:
   - additive-only migration for `string-dropdown` support (no conversion of existing `dropdown` rows).
   - ensure any existing/new `string-dropdown` options get default `stringValue: ''` when missing.
3. Keep current migration behavior for old dropdown data intact.

### Step 6 — Import/export and desktop save/load
1. Update `XlsxUtils.entityExport(...)` and `entityImport(...)` to export/import two columns:
   - base options column
   - dedicated `stringOptions` column
2. Ensure import path in `ElectronService.importCsv(...)` correctly hydrates through updated `CardAttributesService.create(...)`.
3. Verify round-trip:
   - DB -> `attributes.csv` -> reopen project -> same string-dropdown option objects.
4. Confirm web DB export/import (`dexie-export-import`) preserves new structure with no custom logic changes.

### Step 7 — Monaco and UX polish
1. Update Monaco helper hints/documentation if exposing helper syntax (`optionString`).
2. Add translation keys for new type labels and helper docs if needed.
3. Confirm Game Simulator behavior for split-by-attribute remains correct with string-dropdown values.

### Step 8 — Tests
1. Extend `card-attributes.service.spec.ts`:
   - normalization for string-dropdown options
   - backward compatibility conversion tests
2. Extend `xlsx-utils.spec.ts`:
   - export/import for dedicated string options column
3. Add helper tests in `handlebars.pipe.spec.ts` (or new spec):
   - resolves string values correctly
   - safe fallback when missing mapping.
4. Optional integration test:
   - create string-dropdown attribute, set card value, render template, assert resolved string text.

---

## Risk Areas / Regression Checks

1. **Legacy data migration**: avoid breaking existing dropdown options.
2. **Type unions in UI**: avoid broad `any` creep; keep strict typing.
3. **CSV interoperability**: ensure dual-column import/export remains deterministic and backward-compatible.
4. **Template runtime context**: avoid collisions with existing `card`/`assets` keys.
5. **System attributes**: ensure they remain standard dropdowns and not string-dropdown.
6. **No forced conversion**: verify opening/saving old projects does not change `dropdown` attributes into `string-dropdown`.

---

## Suggested Delivery Order

1. Types + enum + parsing logic
2. Editor/UI support
3. Handlebars helper + runtime context
4. Dexie migration
5. Import/export and file round-trip verification
6. Tests and docs

---

## Definition of Done

- Users can create attribute type `string-dropdown`.
- Each string option supports `value`, `color`, and `stringValue` (textarea content).
- Existing `dropdown` attributes remain unchanged and continue to work as-is.
- Card rows still store selected `value` as before.
- Handlebars template can resolve and render the selected option’s string value via derived `card.*String` fields.
- Existing projects (old dropdown formats) continue to load and work.
- Web and Electron save/load/import/export all preserve string-dropdown data.
- Automated tests cover parsing, migration behavior, and template resolution.
