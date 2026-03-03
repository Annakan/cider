/**
 * Monarch tokenizer for YAML syntax highlighting in Monaco Editor.
 * This is a lightweight alternative to the full monaco-yaml package,
 * providing syntax highlighting without schema validation or autocompletion.
 */
export default class MonacoYamlTokenizer {

    static readonly languageId = 'yaml';

    static readonly languageConfiguration: any = {
        comments: {
            lineComment: '#',
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
        ],
        folding: {
            offSide: true,
        },
        indentationRules: {
            increaseIndentPattern: /^(\s*)(-.+|.+:)\s*$/,
            decreaseIndentPattern: /^\s*$/,
        },
    };

    static readonly monarchLanguage: any = {
        tokenPostfix: '.yaml',
        brackets: [
            { token: 'delimiter.bracket', open: '{', close: '}' },
            { token: 'delimiter.square', open: '[', close: ']' },
        ],

        keywords: ['true', 'True', 'TRUE', 'false', 'False', 'FALSE', 'null', 'Null', 'NULL', '~'],

        numberInteger: /(?:0|[+-]?[0-9]+)/,
        numberFloat: /(?:[+-]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:e[-+]?[0-9]+)?)/,
        numberOctal: /0o[0-7]+/,
        numberHex: /0x[0-9a-fA-F]+/,
        numberInfinity: /[+-]?(?:\.inf|\.Inf|\.INF)/,
        numberNaN: /(?:\.nan|\.NaN|\.NAN)/,
        numberDate: /\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?/,

        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

        tokenizer: {
            root: [
                { include: '@whitespace' },
                { include: '@comment' },

                // directives
                [/---/, 'meta.content'],
                [/\.\.\./, 'meta.content'],
                [/%[^\s]+.*$/, 'meta.directive'],

                // block sequence entry
                [/(-)\s+/, 'delimiter'],

                // key-value pair
                [/([^\s#:][^#:]*?)(\s*:\s)/, ['type', 'delimiter']],
                // key at end of line
                [/([^\s#:][^#:]*?)(\s*:$)/, ['type', 'delimiter']],

                // anchor and alias
                [/&\w+/, 'meta'],
                [/\*\w+/, 'meta'],

                // tag
                [/![^\s]+/, 'meta.tag'],

                // flow mappings and sequences
                [/[{]/, '@brackets'],
                [/[}]/, '@brackets'],
                [/[\[]/, '@brackets'],
                [/[\]]/, '@brackets'],
                [/,/, 'delimiter'],

                // strings
                [/"/, 'string', '@doubleQuotedString'],
                [/'/, 'string', '@singleQuotedString'],

                // numbers
                [/@numberDate/, 'number.date'],
                [/@numberHex/, 'number.hex'],
                [/@numberOctal/, 'number.octal'],
                [/@numberInfinity/, 'number'],
                [/@numberNaN/, 'number'],
                [/@numberFloat/, 'number.float'],
                [/@numberInteger/, 'number'],

                // block scalars
                [/[|>][-+]?\s*$/, 'string', '@blockScalar'],

                // keywords
                [/\b(?:true|True|TRUE|false|False|FALSE|null|Null|NULL|~)\b/, 'keyword'],

                // unquoted string values (catch-all)
                [/[^\s#][^\s]*/, 'string'],
            ],

            whitespace: [
                [/\s+/, 'white'],
            ],

            comment: [
                [/#.*$/, 'comment'],
            ],

            doubleQuotedString: [
                [/@escapes/, 'string.escape'],
                [/[^\\"]+/, 'string'],
                [/"/, 'string', '@pop'],
            ],

            singleQuotedString: [
                [/''/, 'string.escape'],
                [/[^\\']+/, 'string'],
                [/'/, 'string', '@pop'],
            ],

            blockScalar: [
                [/^(\s+).+$/, 'string'],
                [/^(?!\s)/, '', '@pop'],
            ],
        },
    };

    static register(monaco: any): void {
        // Only register if not already present with a tokenizer
        const existingLangs = monaco.languages.getLanguages();
        const yamlLang = existingLangs.find((lang: { id: string }) => lang.id === MonacoYamlTokenizer.languageId);
        if (!yamlLang) {
            monaco.languages.register({ id: MonacoYamlTokenizer.languageId });
        }
        monaco.languages.setMonarchTokensProvider(MonacoYamlTokenizer.languageId, MonacoYamlTokenizer.monarchLanguage);
        monaco.languages.setLanguageConfiguration(MonacoYamlTokenizer.languageId, MonacoYamlTokenizer.languageConfiguration);
    }
}
