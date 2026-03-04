# Feature 05 — Static Data for Cards: Implementation Plan

## Goal

Allow users to store structured static data (YAML files) that can be referenced in Handlebars card templates to avoid duplication of recurring game design data (rarities, types, factions, etc.).

## Design Decisions

- **Reuse the existing `Document` entity and `DocumentsService`** — no new DB table needed. YAML documents are just documents with `mime: application/x-yaml`. This follows the precedent set by schema documents (`application/schema+json`).
- **No deck-scoped static data for now** — documents are global. This keeps the feature simple and matches the current architecture. Can be revisited later if a concrete use case arises.
- **No schema validation** — deferred to a separate feature.
- **File-based persistence** is critical for versioning, mass editing, and LLM processing.

## Current State of the Codebase (What Already Works)

| Component | Status |
|---|---|
| `Document` entity with `mime` field | ✅ Exists |
| `DocumentsService` file watcher handles `.yaml`/`.yml` | ✅ Exists |
| `js-yaml` is already a dependency | ✅ Exists |
| `parseyaml`, `yaml`, `get` Handlebars helpers | ✅ Exist in `handlebars.pipe.ts` |
| Schema documents in sidebar as precedent | ✅ Exists |
| Monaco editor in `DocumentComponent` | ✅ Exists |

## What Needs to Change

### Step 1: Electron `openProject` — Read YAML/JSON files on project open

**File:** `data-services/electron/electron.service.ts` — `openProject()` method (~line 574)

The file filter currently only reads `.md`/`.css` files. Add `.yaml`, `.yml`, and `.json` to the filter so YAML/JSON documents are loaded from disk into IndexedDB on project open.

```typescript
// Current filter:
&& (documentUrl.name.includes('.md') || documentUrl.name.includes('.markdown')
    || documentUrl.name.includes('.MD')
    || documentUrl.name.includes('.css') || documentUrl.name.includes('.CSS'))

// Add:
    || documentUrl.name.includes('.yaml') || documentUrl.name.includes('.yml')
    || documentUrl.name.includes('.json')
```

### Step 2: Electron `pruneDocuments` — Include YAML/JSON in prune logic

**File:** `data-services/electron/electron.service.ts` — `pruneDocuments()` method (~line 751)

The prune filter currently only handles `.md`/`.css`. Add `.yaml`, `.yml`, `.json` so that deleted YAML documents are also cleaned up from disk.

```typescript
// Current filter:
(file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.MD')
    || file.name.endsWith('.css') || file.name.endsWith('.CSS'))

// Add:
    || file.name.endsWith('.yaml') || file.name.endsWith('.yml')
    || file.name.endsWith('.json')
```

### Step 3: `DocumentComponent` — Support YAML language in Monaco editor

**File:** `document/document.component.ts` — `updateEditorType()` method (~line 64)

Add YAML mime type handling so Monaco shows YAML syntax highlighting.

```typescript
} else if (this.textDocument.mime === 'application/x-yaml' || this.textDocument.mime === 'text/yaml') {
    this.editorOptions.language = 'yaml';
}
```

### Step 4: Sidebar — Add YAML documents section and create dialog

**File:** `site-sidebar/site-sidebar.component.ts`

Add a new section in the sidebar tree for YAML data documents (similar to schema documents section). Include context menu items for create/rename/delete.

Add a `openCreateYamlDocumentDialog()` method similar to `openCreateSchemaDialog()`:

```typescript
public openCreateYamlDocumentDialog() {
    const randomName = `data-${Math.random().toString(36).substr(2, 9)}`;
    this.entity = {
      name: randomName,
      mime: 'application/x-yaml',
      content: '# Static data\n',
    } as any;
    this.openCreateDialog(this.documentsService,
      this.translate.instant('sidebar.create-new-data-document'), this.entity);
}
```

Fetch and display YAML documents in the sidebar tree:
```typescript
// Fetch YAML data documents
await this.documentsService.getAll({ mime: 'application/x-yaml' }).then(documents => { ... });
```

### Step 5: Inject parsed YAML data into Handlebars template context

**File:** `shared/pipes/template-to-html.pipe.ts` — `CardToHtmlPipe`

This is the **core change**. Currently the Handlebars context is `{card, assets}`. We need to add parsed static data from YAML documents.

#### Option A: Inject all YAML documents as a `data` object (Recommended)

The pipe's `transform()` method receives `card`, `template`, `assetUrls`, and `uuid`. We need to also pass in a `staticData` map (parsed YAML documents keyed by document name).

1. **Create a `StaticDataService`** (lightweight, no new DB table):

   **New file:** `data-services/services/static-data.service.ts`

   This service:
   - Listens to `DocumentsService` changes
   - Loads all YAML documents, parses them with `js-yaml`
   - Exposes a `BehaviorSubject<Record<string, any>>` keyed by document name
   - Caches parsed results, re-parses only on change

   ```typescript
   @Injectable({ providedIn: 'root' })
   export class StaticDataService {
     private dataSubject = new BehaviorSubject<Record<string, any>>({});

     constructor(private documentsService: DocumentsService, private db: AppDB) {
       // Reload on DB changes
       this.db.onChange().subscribe(() => this.reload());
       this.db.onLoad().subscribe(() => this.reload());
     }

     private async reload() {
       const yamlDocs = await this.documentsService.getAll({ mime: 'application/x-yaml' });
       const data: Record<string, any> = {};
       for (const doc of yamlDocs) {
         try {
           data[doc.name] = yaml.load(doc.content);
         } catch (e) {
           data[doc.name] = {}; // graceful fallback
         }
       }
       this.dataSubject.next(data);
     }

     getStaticData(): Observable<Record<string, any>> {
       return this.dataSubject.asObservable();
     }
   }
   ```

2. **Update `CardPreviewComponent`** to subscribe to `StaticDataService` and pass static data to the pipe.

3. **Update `CardToHtmlPipe.executeHandlebars()`** to include static data in context:

   ```typescript
   // Before:
   return template({card: card, assets: assetUrls});

   // After:
   return template({card: card, assets: assetUrls, data: staticData});
   ```

### Step 6: Register a `lookup` Handlebars helper

**File:** `shared/pipes/handlebars.pipe.ts`

Add a block helper that looks up a value in a static data category by key, matching the syntax from the feature request:

```typescript
/**
 * {{#lookup data.card_static_data "rarity" card.rarity}}
 *   <div style="color: {{color}}">{{label}}</div>
 *   <span class="{{compile icon}}"></span>
 * {{/lookup}}
 */
Handlebars.registerHelper('datalookup', function(collection: any, key: string, options: any) {
    if (!collection || !key) return '';
    // Support both array-of-objects and direct map
    let entry: any;
    if (Array.isArray(collection)) {
        entry = collection.find((item: any) => {
            // Each item is { "KEY": { ...props } }
            return Object.keys(item)[0] === key;
        });
        if (entry) entry = entry[key];
    } else if (typeof collection === 'object') {
        entry = collection[key];
    }
    if (!entry) return '';
    return options.fn(entry);
});
```

### Template Usage Examples

Given `card_static_data.yaml`:
```yaml
rarity:
  - C:
      label: Common
      color: "#888"
      icon: "ss ss-inv"
  - U:
      label: Uncommon
      color: "#00F"
      icon: "ss ss-mor ss-rare ss-grad ss-3x"
```

In the card template:
```handlebars
{{#datalookup data.card_static_data.rarity card.rarity}}
  <div style="color: {{color}}">
    {{label}}
    <span class="{{icon}}"></span>
  </div>
{{/datalookup}}
```

Or using existing helpers:
```handlebars
{{#datalookup data.card_static_data.rarity card.rarity}}
  <div style="color: {{color}}">
    {{label}}
    {{compile icon}}
  </div>
{{/datalookup}}
```

### Step 7: i18n — Add translation keys

**Files:** `assets/i18n/en.json`, `assets/i18n/fr.json`, etc.

Add keys:
- `sidebar.data-documents` — "Data"
- `sidebar.create-new-data-document` — "Create New Data Document"
- `sidebar.add-new-data-document` — "Add Data Document"
- `sidebar.delete-data-document` — "Delete Data Document"

### Step 8: Update file-based export (Electron save)

**File:** `data-services/electron/electron.service.ts` — `saveDocument()` method

This method already handles any mime type via `StringUtils.mimeToExtension()`. The `mime-types` library should resolve `application/x-yaml` to `.yaml`. **Verify this works** — if not, add a special case in `StringUtils.mimeToExtension()`.

## Implementation Order

| # | Step | Effort | Risk |
|---|---|---|---|
| 1 | Electron `openProject` filter | 10 min | Low |
| 2 | Electron `pruneDocuments` filter | 10 min | Low |
| 3 | Monaco YAML language support | 10 min | Low |
| 4 | Sidebar YAML section + create dialog | 1-2 hours | Low |
| 5 | `StaticDataService` + inject into Handlebars context | 2-3 hours | Medium |
| 6 | `datalookup` Handlebars helper | 30 min | Low |
| 7 | i18n translation keys | 15 min | Low |
| 8 | Verify Electron save for YAML mime | 15 min | Low |

**Total estimated effort: ~5-7 hours**

## Out of Scope (Deferred)

- **Deck-scoped static data** — No use case yet; documents are global.
- **YAML schema validation** — Separate feature.
- **Monaco YAML language server** — Separate feature (would provide autocompletion, validation).
- **Template editor autocompletion for static data keys** — Needs Monaco language server integration, separate feature.
- **Data merging/inheritance** — No use case yet.

## File-Based Workflow (Versioning / LLM / Mass Edit)

In Electron mode, YAML documents are saved as `.yaml` files in the project root directory alongside `.md` and `.css` files. This means:

- **Git versioning**: YAML files are plain text, diff-friendly.
- **Mass editing**: Edit in any text editor or IDE.
- **LLM processing**: Feed YAML files to LLMs for generation/modification.
- **File watcher**: Changes to `.yaml` files on disk are picked up automatically by the existing file watcher in `DocumentsService`.

In web mode, YAML documents are stored in IndexedDB and included in the database export/import JSON. Users can export the database, extract the YAML content, edit it externally, and re-import.
