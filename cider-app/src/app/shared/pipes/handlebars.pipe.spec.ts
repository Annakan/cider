import { DomSanitizer } from '@angular/platform-browser';
import { HandlebarsPipe } from './handlebars.pipe';
import * as Handlebars from 'handlebars';

describe('HandlebarsPipe', () => {
  let pipe: HandlebarsPipe;

  beforeEach(() => {
    pipe = new HandlebarsPipe({} as DomSanitizer);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('parseyaml helper', () => {
    it('should parse a simple YAML string into an object', () => {
      const template = Handlebars.compile('{{get (parseyaml yamlStr) "attack"}}');
      const result = template({ yamlStr: 'attack: 5\ndefense: 3' });
      expect(result).toBe('5');
    });

    it('should return empty object for null input', () => {
      const template = Handlebars.compile('{{get (parseyaml yamlStr) "attack"}}');
      const result = template({ yamlStr: null });
      expect(result).toBe('');
    });

    it('should return empty object for undefined input', () => {
      const template = Handlebars.compile('{{get (parseyaml yamlStr) "attack"}}');
      const result = template({});
      expect(result).toBe('');
    });

    it('should return empty object for invalid YAML', () => {
      const template = Handlebars.compile('{{get (parseyaml yamlStr) "attack"}}');
      const result = template({ yamlStr: ':::invalid yaml{{{' });
      expect(result).toBe('');
    });

    it('should handle nested YAML', () => {
      const yaml = 'stats:\n  attack: 10\n  defense: 5';
      const template = Handlebars.compile('{{get (get (parseyaml yamlStr) "stats") "attack"}}');
      const result = template({ yamlStr: yaml });
      expect(result).toBe('10');
    });
  });

  describe('yaml block helper', () => {
    it('should parse YAML and expose fields inside the block', () => {
      const template = Handlebars.compile('{{#yaml yamlStr}}{{attack}}-{{defense}}{{/yaml}}');
      const result = template({ yamlStr: 'attack: 7\ndefense: 2' });
      expect(result).toBe('7-2');
    });

    it('should return empty string for empty string input', () => {
      const template = Handlebars.compile('{{#yaml yamlStr}}{{attack}}{{/yaml}}');
      const result = template({ yamlStr: '' });
      expect(result).toBe('');
    });

    it('should return empty string for invalid YAML', () => {
      const template = Handlebars.compile('{{#yaml yamlStr}}{{attack}}{{/yaml}}');
      const result = template({ yamlStr: ':::bad' });
      expect(result).toBe('');
    });

    it('should return empty string when variable is missing from context', () => {
      const template = Handlebars.compile('{{#yaml yamlStr}}{{attack}}{{/yaml}}');
      const result = template({});
      expect(result).toBe('');
    });

    it('should handle nested properties via dot notation', () => {
      const yaml = 'stats:\n  attack: 10\n  defense: 5';
      const template = Handlebars.compile('{{#yaml yamlStr}}{{stats.attack}}{{/yaml}}');
      const result = template({ yamlStr: yaml });
      expect(result).toBe('10');
    });
  });

  describe('get helper', () => {
    it('should get a property from an object', () => {
      const template = Handlebars.compile('{{get obj "name"}}');
      const result = template({ obj: { name: 'hello' } });
      expect(result).toBe('hello');
    });

    it('should return empty string for null object', () => {
      const template = Handlebars.compile('{{get obj "name"}}');
      const result = template({ obj: null });
      expect(result).toBe('');
    });

    it('should return empty string for missing key', () => {
      const template = Handlebars.compile('{{get obj "missing"}}');
      const result = template({ obj: { name: 'hello' } });
      expect(result).toBe('');
    });

    it('should return numeric values', () => {
      const template = Handlebars.compile('{{get obj "count"}}');
      const result = template({ obj: { count: 42 } });
      expect(result).toBe('42');
    });
  });
});
