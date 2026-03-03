import MonacoYamlTokenizer from './monaco-yaml-tokenizer';

describe('MonacoYamlTokenizer', () => {

  it('should have languageId set to yaml', () => {
    expect(MonacoYamlTokenizer.languageId).toBe('yaml');
  });

  it('should define a monarchLanguage with a root tokenizer', () => {
    const lang = MonacoYamlTokenizer.monarchLanguage;
    expect(lang).toBeDefined();
    expect(lang.tokenizer).toBeDefined();
    expect(lang.tokenizer.root).toBeDefined();
    expect(Array.isArray(lang.tokenizer.root)).toBeTrue();
  });

  it('should define language configuration with comment support', () => {
    const config = MonacoYamlTokenizer.languageConfiguration;
    expect(config).toBeDefined();
    expect(config.comments).toBeDefined();
    expect(config.comments.lineComment).toBe('#');
  });

  it('should define autoClosingPairs', () => {
    const config = MonacoYamlTokenizer.languageConfiguration;
    expect(config.autoClosingPairs).toBeDefined();
    expect(config.autoClosingPairs.length).toBeGreaterThan(0);
  });

  it('should define folding as offSide', () => {
    const config = MonacoYamlTokenizer.languageConfiguration;
    expect(config.folding).toBeDefined();
    expect(config.folding.offSide).toBeTrue();
  });

  describe('register', () => {
    it('should register YAML language with monaco', () => {
      const registeredLanguages: string[] = [];
      let monarchProviderSet = false;
      let configSet = false;

      const mockMonaco = {
        languages: {
          getLanguages: () => [],
          register: (lang: { id: string }) => registeredLanguages.push(lang.id),
          setMonarchTokensProvider: (id: string, provider: any) => {
            if (id === 'yaml') monarchProviderSet = true;
          },
          setLanguageConfiguration: (id: string, config: any) => {
            if (id === 'yaml') configSet = true;
          }
        }
      };

      MonacoYamlTokenizer.register(mockMonaco);

      expect(registeredLanguages).toContain('yaml');
      expect(monarchProviderSet).toBeTrue();
      expect(configSet).toBeTrue();
    });

    it('should not re-register if yaml language already exists', () => {
      const registeredLanguages: string[] = [];

      const mockMonaco = {
        languages: {
          getLanguages: () => [{ id: 'yaml' }],
          register: (lang: { id: string }) => registeredLanguages.push(lang.id),
          setMonarchTokensProvider: () => {},
          setLanguageConfiguration: () => {}
        }
      };

      MonacoYamlTokenizer.register(mockMonaco);

      expect(registeredLanguages).not.toContain('yaml');
    });
  });

  describe('tokenizer rules', () => {
    it('should define keywords including true, false, null', () => {
      const lang = MonacoYamlTokenizer.monarchLanguage;
      expect(lang.keywords).toContain('true');
      expect(lang.keywords).toContain('false');
      expect(lang.keywords).toContain('null');
      expect(lang.keywords).toContain('~');
    });

    it('should have string tokenizer states', () => {
      const tokenizer = MonacoYamlTokenizer.monarchLanguage.tokenizer;
      expect(tokenizer.doubleQuotedString).toBeDefined();
      expect(tokenizer.singleQuotedString).toBeDefined();
    });

    it('should have comment tokenizer state', () => {
      const tokenizer = MonacoYamlTokenizer.monarchLanguage.tokenizer;
      expect(tokenizer.comment).toBeDefined();
    });

    it('should have blockScalar tokenizer state', () => {
      const tokenizer = MonacoYamlTokenizer.monarchLanguage.tokenizer;
      expect(tokenizer.blockScalar).toBeDefined();
    });
  });
});
