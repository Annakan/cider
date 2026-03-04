# Static Data for Cards — User Guide

## What is Static Data?

Static data lets you define **reusable structured information** — like rarities, factions, card types, or cost tables — in YAML files, and then reference that data directly inside your Handlebars card templates.

Instead of duplicating values across dozens of cards, you define them once in a data file and look them up by key.

---

## 1. Creating a Data File

### From the Sidebar

1. In the left sidebar, find the **Data** section.
2. Right-click it and select **Add Data Document**.
3. Give it a name (e.g. `card_static_data`) and click **Create**.
4. The file opens in the built-in editor with YAML syntax highlighting.

### From the File System (Electron only)

Place a `.yaml` or `.yml` file in the `documents/` folder of your project directory. It will be loaded automatically when the project is opened.

---

## 2. Writing a Data File

Data files use [YAML](https://yaml.org/) syntax. Here is a full example:

```yaml
# card_static_data.yaml

constants:
  - &common_color "#888"
  - &uncommon_color "#00F"
  - &rare_color "#F00"
  - &legendary_color "#FF00FF"
  - &common_base_difficulty 10
  - &uncommon_base_difficulty 20
  - &rare_base_difficulty 30
  - &legendary_base_difficulty 40

rarity:
  - C:
      label: Common
      color: *common_color
      base_difficulty: *common_base_difficulty
      icon: "ss ss-inv"
  - U:
      label: Uncommon
      color: *uncommon_color
      base_difficulty: *uncommon_base_difficulty
      icon: "ss ss-mor ss-rare ss-grad ss-3x"
  - R:
      label: Rare
      color: *rare_color
      base_difficulty: *rare_base_difficulty
      icon: "ss ss-isd ss-foil ss-grad ss-3x"
```

> **Tip:** YAML anchors (`&name`) and aliases (`*name`) let you define a value once and reuse it throughout the file. This is great for colors, base stats, or any repeated constant.

You can also use simpler flat structures:

```yaml
# game_config.yaml

card_width: 750
card_height: 1050
border_radius: 20

factions:
  fire:
    name: Fire
    color: "#FF4400"
    symbol: "🔥"
  water:
    name: Water
    color: "#0066FF"
    symbol: "💧"
  earth:
    name: Earth
    color: "#44AA00"
    symbol: "🌿"

type_icons:
  creature: "/assets/icons/creature.png"
  spell: "/assets/icons/spell.png"
  artifact: "/assets/icons/artifact.png"
```

---

## 3. Accessing Data in Handlebars Templates

All YAML data documents are available in your card templates under the **`data`** object. The key is the **document name** (as shown in the sidebar).

### Structure

```
data.<document_name>.<top_level_key>
```

For example, if your document is named `game_config`, you access it as `data.game_config`.

---

## 4. Usage Examples

### 4.1 Direct Property Access

Access top-level scalar values directly:

**Data file** (`game_config`):
```yaml
card_width: 750
card_height: 1050
border_radius: 20
```

**Template (HTML)**:
```handlebars
<div class="card" style="
  width: {{data.game_config.card_width}}px;
  height: {{data.game_config.card_height}}px;
  border-radius: {{data.game_config.border_radius}}px;
">
  {{card.Name}}
</div>
```

---

### 4.2 Nested Object Access (Map/Dictionary)

Access nested properties using dot notation:

**Data file** (`game_config`):
```yaml
factions:
  fire:
    name: Fire
    color: "#FF4400"
    symbol: "🔥"
  water:
    name: Water
    color: "#0066FF"
    symbol: "💧"
```

**Template** — If the card has an attribute `Faction` with value `fire`:
```handlebars
<div style="color: {{data.game_config.factions.fire.color}}">
  Fire cards always look like this
</div>
```

To look up dynamically based on a card attribute, use the **`get`** helper:

```handlebars
{{#with (get data.game_config.factions card.Faction)}}
  <div style="background-color: {{color}}">
    <span>{{symbol}}</span> {{name}}
  </div>
{{/with}}
```

Here, if `card.Faction` is `"water"`, this resolves to `data.game_config.factions.water` and renders its `color`, `symbol`, and `name` fields.

---

### 4.3 The `datalookup` Block Helper (Array of Keyed Objects)

The YAML example `card_static_data.yaml` uses an **array of single-key objects** for its rarity list:

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
  - R:
      label: Rare
      color: "#F00"
      icon: "ss ss-isd ss-foil ss-grad ss-3x"
```

The `datalookup` block helper finds the entry whose key matches the card attribute:

```handlebars
{{#datalookup data.card_static_data.rarity card.Rarity}}
  <div class="rarity-badge" style="color: {{color}}">
    <i class="{{icon}}"></i>
    {{label}}
  </div>
{{/datalookup}}
```

If `card.Rarity` is `"R"`, the block renders with:
- `{{color}}` → `"#F00"`
- `{{icon}}` → `"ss ss-isd ss-foil ss-grad ss-3x"`
- `{{label}}` → `"Rare"`

> **When to use `datalookup` vs `get`:**
> - Use **`datalookup`** when your YAML uses an **array of single-key objects** (the YAML anchor pattern).
> - Use **`get`** (with `{{#with}}`) when your YAML uses a **plain map/dictionary**.

---

### 4.4 Using Data in CSS Templates

Static data works in CSS templates too, since they also go through Handlebars:

**Data file** (`game_config`):
```yaml
theme:
  primary: "#C8102E"
  secondary: "#1D1D1B"
  accent: "#D4AF37"
  font_size: 14
```

**CSS template**:
```handlebars
.card {
  background-color: {{data.game_config.theme.secondary}};
  color: {{data.game_config.theme.primary}};
  font-size: {{data.game_config.theme.font_size}}px;
}

.card-title {
  border-bottom: 2px solid {{data.game_config.theme.accent}};
}
```

---

### 4.5 Iterating Over Collections with `{{#each}}`

You can iterate over arrays or objects in your data:

**Data file** (`game_config`):
```yaml
keywords:
  - name: Flying
    description: This creature can attack players directly.
  - name: Shield
    description: Prevents the first damage dealt to this creature.
  - name: Haste
    description: Can attack the turn it enters play.
```

**Template**:
```handlebars
<div class="keyword-reference">
  {{#each data.game_config.keywords}}
    <div class="keyword">
      <strong>{{this.name}}</strong>: {{this.description}}
    </div>
  {{/each}}
</div>
```

---

### 4.6 Combining `datalookup` with `compile` for Dynamic Icons

If your looked-up value itself contains Handlebars expressions or you want to use it as a class name:

```handlebars
{{#datalookup data.card_static_data.rarity card.Rarity}}
  <i class="{{icon}}"></i>
  <span style="color: {{color}}; font-weight: bold;">
    {{label}} (Difficulty: {{base_difficulty}})
  </span>
{{/datalookup}}
```

---

### 4.7 Fallback When No Match is Found

Both `datalookup` and `get` return empty string when no match is found. You can use `{{#if}}` or `{{else}}` to handle missing data:

```handlebars
{{#datalookup data.card_static_data.rarity card.Rarity}}
  <span style="color: {{color}}">{{label}}</span>
{{else}}
  <span style="color: gray">Unknown Rarity</span>
{{/datalookup}}
```

---

### 4.8 Multiple Data Files

You can create as many data files as you need. Each is accessible under its own name:

| Document Name | Access Pattern |
|---|---|
| `card_static_data` | `data.card_static_data.rarity` |
| `game_config` | `data.game_config.factions.fire` |
| `costs` | `data.costs.mana_curve` |

```handlebars
{{!-- Using multiple data files in one template --}}
<div style="width: {{data.game_config.card_width}}px">
  {{#datalookup data.card_static_data.rarity card.Rarity}}
    <div class="rarity" style="color: {{color}}">{{label}}</div>
  {{/datalookup}}

  {{#with (get data.game_config.factions card.Faction)}}
    <div class="faction" style="background: {{color}}">
      {{symbol}} {{name}}
    </div>
  {{/with}}
</div>
```

---

## 5. YAML Syntax Quick Reference

| Syntax | Meaning | Example |
|---|---|---|
| `key: value` | Simple key-value | `name: Fire` |
| `key:` + indented children | Nested object | See `factions` above |
| `- item` | Array item | `- Flying` |
| `&anchor` | Define a reusable value | `- &red "#F00"` |
| `*anchor` | Reference a defined value | `color: *red` |
| `"string"` | Quoted string | `"#FF4400"` |
| `#` | Comment | `# This is a comment` |

---

## 6. Tips

- **Name your data files descriptively** — the name becomes the access key in templates.
- **Use YAML anchors** to avoid repeating colors, numbers, or strings.
- **Changes are live** — editing a data file updates all card previews automatically.
- **One file per concern** — e.g. `rarities.yaml`, `factions.yaml`, `game_settings.yaml`.
- **No schema validation** — the data structure is freeform; make sure your templates match your data.
