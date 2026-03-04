# Schemas and the Struct Field Type

## Overview

Schemas define the expected structure of `struct` field data. They are stored as **documents** with the MIME type `application/schema+json` and use the [JSON Schema](https://json-schema.org/) format. Each schema can optionally be linked to one or more `struct` card attributes via the `schemaId` field.

## Creating a Schema

### Via the Sidebar

1. In the sidebar, locate the **Schemas** top-level node (icon: database).
2. Right-click the node and select **Add New Schema**.
3. A dialog appears with a pre-filled name (`schema-<random>`) and a default JSON Schema skeleton.
4. Edit the name and click **Create**.
5. The new schema appears as a child of the Schemas node.

### Default Schema Content

New schemas are created with this starter template:

```json
{
  "type": "object",
  "properties": {}
}
```

Edit it to describe the fields your struct data should contain.

## Editing a Schema

Click a schema node in the sidebar to open it in the Monaco editor with JSON syntax highlighting. Edit the JSON Schema content directly.

### Example Schema

For a card `stats` struct with attack, defense, HP, and abilities:

```json
{
  "type": "object",
  "properties": {
    "attack": {
      "type": "integer",
      "description": "Attack power",
      "minimum": 0
    },
    "defense": {
      "type": "integer",
      "description": "Defense rating",
      "minimum": 0
    },
    "hp": {
      "type": "integer",
      "description": "Hit points",
      "minimum": 1
    },
    "abilities": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of ability names"
    },
    "tags": {
      "type": "object",
      "properties": {
        "element": { "type": "string" },
        "rarity": { "type": "string", "enum": ["common", "uncommon", "rare", "legendary"] }
      }
    }
  },
  "required": ["attack", "defense", "hp"]
}
```

## Linking a Schema to a Struct Attribute

1. Navigate to a deck's **Attributes** page.
2. Create or edit a card attribute and set its **Type** to `struct`.
3. When `struct` is selected, a **Schema** dropdown appears listing all available schema documents.
4. Select the schema to associate with this attribute. This is optional — struct fields work without a schema.

The link is stored as `schemaId` on the `CardAttribute` entity, referencing the document ID of the schema.

## Managing Schemas

### Context Menu Actions

Right-click any schema node in the sidebar for:

- **Add New Schema** — create another schema document
- **Edit / Rename Document** — change the schema name
- **Delete Document** — remove the schema (does not affect card data)

### Deleting a Schema

Deleting a schema removes the document only. Card attributes that reference the deleted schema will retain their `schemaId` value, but it will point to a non-existent document. This does not break any functionality — struct fields continue to store and display their YAML data normally.

## Schema Storage

| Property | Value |
|---|---|
| **Entity type** | `Document` |
| **MIME type** | `application/schema+json` |
| **Content format** | JSON Schema (text) |
| **Editor language** | JSON (Monaco) |
| **Sidebar location** | Top-level "Schemas" node |

## Electron File Watcher

In Electron (desktop) mode, the file watcher monitors the project root directory for `.json`, `.yaml`, and `.yml` files. When a matching file is added or removed, it is automatically imported into or removed from the documents table.

> **Note:** Files imported via the watcher use the standard MIME type returned by the `mime` library (e.g., `application/json` for `.json` files), not `application/schema+json`. To create a proper schema document, use the sidebar's **Add New Schema** action, which sets the correct MIME type.

## Current Limitations

- **No validation yet.** The `schemaId` link is stored but schema validation of struct data is not enforced at edit time. This is planned for a future iteration using `monaco-yaml` or a JSON Schema validation library.
- **No autocomplete from schema.** The YAML editor in the struct dialog uses basic Monarch syntax highlighting, not schema-aware autocomplete. A future enhancement could integrate `monaco-yaml` with the linked schema to provide property suggestions and validation errors inline.
- **Schema format.** Only JSON Schema format is supported. YAML Schema is not currently supported.

## Relationship Diagram

```
CardAttribute (type: struct)
  └── schemaId? ──────► Document (mime: application/schema+json)
  └── value (YAML string) ──► parsed by Handlebars helpers
                                  ├── {{parseyaml ...}}
                                  ├── {{#yaml ...}} ... {{/yaml}}
                                  └── {{get ... "key"}}
```

## See Also

- [handlebars_struct_usage.md](handlebars_struct_usage.md) — How to use struct data in Handlebars templates
- [plan.md](../plan.md) — Full implementation plan
- [Implentation_summary.md](../Implentation_summary.md) — Implementation summary with file listing
