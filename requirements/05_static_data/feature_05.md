# Static data for cards

When creating a card game there is often recurring static data that affect cards and decks.

For instance card type might be associated to icons, card rarity to symbols and or backgound colors.

A lot of data goes together, a given rarity implies a color at least for the background or the text, an icon, etc.

It would be useful to be able to store these data together and avoid duplication, for instance in a structured YAML file.

A document like @include card_static_data.yaml could then be used in the template with few helpers, something like :

```handlebars
{{#lookup card_static_data rarity c}}
{{name}}
{{color}}
{{base_difficulty}}
{{/lookup}}
```
or

```handlebars
{{#lookup card_static_data rarity card.rarity}}
{{name}}
{{color}}
{{compile icon}}
{{base_difficulty}}
{{/lookup}}
```

rarity being a string attribute of the card.

Ideally such documents ahould be able to be defined both at the deck level an the global level.

