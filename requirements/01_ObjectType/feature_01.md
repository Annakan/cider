Read this file, ask any questions you have, then produce a implementation plan in a file named plan.md in this directory

# Goal

We need to create a new type "struct" in the available field types in cider.

This type is a json/yaml object stored as a string in the database (maybe two strings because of schema, see below).

# Details


The editor should be a textarea with syntax highlighting for yaml.

Since Cider already uses monaco we could use monaco_yaml to provide editing capabilities (https://github.com/remcohaszing/monaco-yaml).

Optionally, the object could be linked to a json schema to validate the object, so we would need to add a new field "schema" to the object type that would contain the reference to the schema id.

That means we would require a new branch of main item tree with "schemas" where we would store the json schemas (each schema is a simple text field with an id/name). I should be at the same level than `global-style`

The schema would be a json schema (https://json-schema.org/) or yaml schema (https://www.asdf-format.org/projects/asdf-standard/en/1.0.2/schemas/yaml_schema.html) if that is supported by monaco_yaml 

If the json/yaml schema part is complicated, we can just plan the schema field as an optional string and differ this part to a future feature.


On the handlebar side to use that field in the template we would need to use the handlebars helper "json" to parse the string and then use the handlebars helper "get" to get the value of the object.

It is important to be able to edit YAML even if we can inject a derived json structure in the handlebars template because YAML is infinitely mode editable and readable for human users.
