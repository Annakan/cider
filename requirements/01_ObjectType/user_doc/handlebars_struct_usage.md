# Using the Struct Field Type in Handlebars Templates

## Overview

The `struct` field type stores structured data as YAML strings in card attributes. Three Handlebars helpers are available to parse and access this data inside card templates.

## Card Data Example

Suppose you have a card attribute called `stats` of type `struct`, with this YAML value:

```yaml
attack: 7
defense: 3
hp: 12
abilities:
  - fireball
  - shield
tags:
  element: fire
  rarity: rare
```

## Helpers

### `parseyaml` — Inline Parser

Parses a YAML string into an object. Use it as a subexpression with `get` to extract a single value.

```handlebars
{{get (parseyaml card.stats) "attack"}}
```

Renders: `7`

**Error handling:** returns an empty object `{}` if the input is null, undefined, or invalid YAML.

---

### `yaml` — Block Helper

Parses a YAML string and sets the parsed object as the block context. All top-level keys become directly accessible inside the block.

```handlebars
{{#yaml card.stats}}
  <div class="stat">Attack: {{attack}}</div>
  <div class="stat">Defense: {{defense}}</div>
  <div class="stat">HP: {{hp}}</div>
{{/yaml}}
```

Renders:

```html
<div class="stat">Attack: 7</div>
<div class="stat">Defense: 3</div>
<div class="stat">HP: 12</div>
```

Nested properties are accessible via dot notation:

```handlebars
{{#yaml card.stats}}
  <span>Element: {{tags.element}}</span>
  <span>Rarity: {{tags.rarity}}</span>
{{/yaml}}
```

You can also iterate over arrays inside the block:

```handlebars
{{#yaml card.stats}}
  <ul>
    {{#each abilities}}
      <li>{{this}}</li>
    {{/each}}
  </ul>
{{/yaml}}
```

**Error handling:** renders nothing if the input is empty, null, or invalid YAML.

---

### `get` — Property Accessor

Retrieves a single property from an object by key name. Commonly used with `parseyaml` as a subexpression.

```handlebars
{{get (parseyaml card.stats) "hp"}}
```

Can also be chained for nested access:

```handlebars
{{get (get (parseyaml card.stats) "tags") "element"}}
```

Renders: `fire`

**Error handling:** returns an empty string if the object is null or the key doesn't exist.

---

## Choosing Between `yaml` and `parseyaml`

| Use case | Recommended helper |
|---|---|
| Display multiple fields from the same struct | `{{#yaml}}` block helper |
| Display a single field inline | `{{get (parseyaml ...) "key"}}` |
| Conditional logic based on a struct field | `{{#yaml}}` with `{{#if}}` inside the block |
| Access deeply nested values | `{{#yaml}}` with dot notation, or chained `get` calls |

## Complete Card Template Example

```handlebars
<div class="card">
  <h1>{{card.Name}}</h1>

  {{#yaml card.stats}}
    <div class="stats-bar">
      <span class="attack">⚔️ {{attack}}</span>
      <span class="defense">🛡️ {{defense}}</span>
      <span class="hp">❤️ {{hp}}</span>
    </div>

    {{#if tags}}
      <div class="tags">
        <span class="element {{tags.element}}">{{tags.element}}</span>
        <span class="rarity {{tags.rarity}}">{{tags.rarity}}</span>
      </div>
    {{/if}}

    {{#if abilities}}
      <ul class="abilities">
        {{#each abilities}}
          <li>{{this}}</li>
        {{/each}}
      </ul>
    {{/if}}
  {{/yaml}}
</div>
```

## Notes

- YAML is the recommended editing format because it is more readable and editable than JSON for humans.
- JSON is also valid YAML, so JSON strings will parse correctly.
- The struct editor in the spreadsheet opens a Monaco editor with YAML syntax highlighting on double-click.
- XLSX import/export treats struct fields as plain text cells containing the raw YAML string.
