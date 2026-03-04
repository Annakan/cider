# Assets in Handlebars — Cheat Sheet

In Oatear Cider templates, `assets` is not a helper by itself.
It is a render-time context object (`{ card, assets, data }`).

## How asset keys are built

For a file at:

```text
assets/backs/2.jpg
```

Cider stores it as:

- folder path: `backs`
- asset name: `2` (extension removed)
- handlebars key: `assets.backs.2`

## Recommended usage

Use the `index` helper for nested paths:

```hbs
{{index assets 'backs.2'}}
```

## Common examples

### HTML image

```hbs
<img src="{{index assets 'backs.2'}}" />
```

### CSS background

```css
.card {
  background-image: url({{index assets 'backs.2'}});
}
```

### Direct access (works too)

```hbs
{{assets.backs.2}}
```

## Naming rules / gotchas

- Do **not** use slash paths in template expressions (`assets/backs/2.jpg`)
- Use dot paths (`backs.2`)
- Keys are normalized to kebab-case:
  - spaces become `-`
  - letters become lowercase

Examples:

- `assets/My Icons/Fire Ball.png` -> `{{index assets 'my-icons.fire-ball'}}`
- `assets/backs/Card Back 01.jpg` -> `{{index assets 'backs.card-back-01'}}`

## Quick debug checklist

1. Confirm file exists in project `assets/` folder (Electron mode) or was imported in Assets UI (Web mode).
2. Confirm folder/name spelling after kebab-case normalization.
3. Prefer `{{index assets '...'}}` for nested paths.
4. If unresolved, re-open/reload project so asset URLs are rebuilt.
