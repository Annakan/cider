
When creating a card game there is often recurring static data that affect cards and decks.

for instance card type might be associated to icons, card rarity to symbols and or backgound colors.

It would be useful to be able to store these data in a structured YAML file.

For instance a document `RarityProps` with this content:

```yaml
- C:
    name: common
    color: "#888"
    base_difficulty: 10
- U:
    name: uncommon
    color: "#00F"
    base_difficulty: 20
- R:
    name: Rare
    color: "#F00"
    base_difficulty: 20

```

Could then be used in the template with few helpers

```handlebars
{{#with RarityProps c}}
{{name}}
{{color}}
{{base_difficulty}}
{{/with}}
```
or

```handlebars
{{#with RarityProps card.rarity}}
{{name}}
{{color}}
{{base_difficulty}}
{{/with}}

rarity being a string attribute of the card


