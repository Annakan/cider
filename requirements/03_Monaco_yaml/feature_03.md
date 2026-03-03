

monaco-yaml (remcohaszing/monaco-yaml) is designed for the ESM build of Monaco Editor. Cider uses ngx-monaco-editor-v2 which loads Monaco via AMD/requirejs (requireConfig: { preferScriptTags: true }). There is a known integration friction here:

monaco-yaml uses monaco-editor's ESM worker API and registers a YAML worker via MonacoEnvironment.
The current setup in monaco-extension.ts accesses (window as any).monaco — the AMD global.
Risk: Getting monaco-yaml to work with the AMD loader may require workarounds or a migration to ESM Monaco. The spec should acknowledge this as a spike/PoC item. If it turns out to be too painful, plain YAML syntax highlighting (via a Monarch tokenizer, like the existing css-handlebars language) plus a standalone YAML parser (js-yaml) would be a simpler fallback.


There is a possible path here https://github.com/remcohaszing/monaco-yaml/issues/252 BUT let's move this to another feature and just have the simplest solution you suggest