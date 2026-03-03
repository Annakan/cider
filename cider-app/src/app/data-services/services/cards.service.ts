import { Injectable } from '@angular/core';
import { Card } from '../types/card.type';
import { AppDB } from '../indexed-db/db';
import { FieldType } from '../types/field-type.type';
import { CardAttributesService } from './card-attributes.service';
import { CardTemplatesService } from './card-templates.service';
import { EntityField } from '../types/entity-field.type';
import { DecksChildService as DecksChildService } from '../indexed-db/decks-child.service';
import { DecksService } from './decks.service';
import { CardAttribute } from '../types/card-attribute.type';
import StringUtils from 'src/app/shared/utils/string-utils';
import { DropdownOption } from '../types/dropdown-option.type';
import { StringOption } from '../types/string-option.type';
import { ElectronService } from '../electron/electron.service';
import { ProjectStateService } from './project-state.service';
import XlsxUtils from 'src/app/shared/utils/xlsx-utils';
import { PersistentPath } from '../types/persistent-path.type';
import { firstValueFrom, groupBy, mergeMap, debounceTime, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CardsService extends DecksChildService<Card, number> {

  constructor(private attributesService: CardAttributesService,
    private cardTemplatesService: CardTemplatesService,
    decksService: DecksService, db: AppDB,
    private electronService: ElectronService,
    private projectStateService: ProjectStateService) {
    super(decksService, db, AppDB.CARDS_TABLE, [
      { field: 'id', header: 'ID', type: FieldType.numeric, hidden: true },
      { field: 'deckId', header: 'Deck ID', type: FieldType.numeric, hidden: true }
    ]);

    this.electronService.getFileChanged().pipe(
      filter(path => path.endsWith('cards.csv')),
      groupBy(path => path),
      mergeMap(group => group.pipe(debounceTime(300)))
    ).subscribe(path => this.handleFileChanged(path));
  }

  private async handleFileChanged(path: string) {
    const parts = path.split('/');
    if (parts.length < 2) return;
    const folderName = parts[parts.length - 2];

    const decks = await this.decksService.getAll();
    const deck = decks.find(d => StringUtils.toKebabCase(d.name) === folderName);

    if (deck) {
      console.log(`Syncing cards for deck: ${deck.name} from external CSV change.`);
      await this.syncFromCsv(path, deck.id);
    }
  }

  private async syncFromCsv(path: string, deckId: number) {
    const homeUrl = await firstValueFrom(this.electronService.getProjectHomeUrl());
    if (!homeUrl) return;

    const persistentPath: PersistentPath = {
      path: path,
      bookmark: homeUrl.bookmark
    };

    const buffer = await this.electronService.readFile(persistentPath);
    if (!buffer) return;

    const blob: Blob = new Blob([new Uint8Array(buffer)], { type: 'text/csv' });
    const file: File = new File([blob], 'cards.csv', { type: 'text/csv' });

    const fields = await this.getFieldsUnfiltered({ deckId });
    const lookups = await this.getLookups({ deckId });

    const entities = await XlsxUtils.entityImport(fields, lookups, file);

    this.projectStateService.setTrackingEnabled(false);
    try {
      await this.db.table(this.tableName).where({ deckId }).delete();
      await Promise.all(entities.map(entity => {
        (<any>entity)['deckId'] = deckId;
        return this.create(entity, true);
      }));
      console.log(`Synced ${entities.length} cards for deck ${deckId}`);
    } catch (e) {
      console.error("Error syncing cards from CSV", e);
    } finally {
      this.projectStateService.setTrackingEnabled(true);
    }
  }

  override async getFields(equalityCriterias?: { [key: string]: any; }) {
    const attributes = await this.attributesService.getAll(equalityCriterias);
    return this.fields.concat(attributes.map(attribute => this.cardAttributeToEntityField(attribute)));
  }

  async getFieldsUnfiltered(equalityCriterias?: { [key: string]: any; }) {
    const attributes = await this.attributesService.getAllUnfiltered(equalityCriterias);
    return this.fields.concat(attributes.map(attribute => this.cardAttributeToEntityField(attribute)));
  }

  private cardAttributeToEntityField(attribute: CardAttribute) {
    let options: DropdownOption[] = [];

    if (attribute.type === FieldType.stringDropdown) {
      options = this.parseStringOptions(attribute.stringOptions).map(option => {
        return { value: option.value, color: option.color };
      });
    } else {
      options = this.parseDropdownOptions(attribute.options);
    }

    if (attribute.isSystem) {
      if (attribute.name === 'Name') {
        return {
          field: 'name',
          header: attribute.name,
          type: attribute.type,
          description: attribute.description,
          width: attribute.width
        } as EntityField<Card>;
      }
      if (attribute.name === 'Count') {
        return {
          field: 'count',
          header: attribute.name,
          type: attribute.type,
          description: attribute.description,
          width: attribute.width
        } as EntityField<Card>;
      }
      if (attribute.name === 'Front Template') {
        return {
          field: 'frontCardTemplateId',
          header: attribute.name,
          type: attribute.type,
          service: <any>this.cardTemplatesService,
          description: attribute.description,
          width: attribute.width
        } as EntityField<Card>;
      }
      if (attribute.name === 'Back Template') {
        return {
          field: 'backCardTemplateId',
          header: attribute.name,
          type: attribute.type,
          service: <any>this.cardTemplatesService,
          description: attribute.description,
          width: attribute.width
        } as EntityField<Card>;
      }
    }

    return {
      field: StringUtils.toKebabCase(attribute.name),
      header: attribute.name,
      type: attribute.type,
      description: attribute.description,
      options: options,
      width: attribute.width
    } as EntityField<Card>;
  }

  override getEntityName(entity: Card) {
    return entity.name;
  }

  private parseDropdownOptions(options: CardAttribute['options']): DropdownOption[] {
    if (Array.isArray(options)) {
      if (options.length > 0 && typeof options[0] === 'string') {
        return (options as unknown as string[]).map(o => ({ value: o, color: '#FFFFFF' }));
      }
      return options as DropdownOption[];
    }

    if (!options || typeof options !== 'string') {
      return [];
    }

    const optsStr = options;
    if (optsStr.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(optsStr);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            return parsed.map((o: string) => ({ value: o, color: '#FFFFFF' }));
          }
          return parsed as DropdownOption[];
        }
      } catch (e) {
        return optsStr.split(',').map(o => ({ value: o.trim(), color: '#FFFFFF' }));
      }
    }
    return optsStr.split(',').map(o => ({ value: o.trim(), color: '#FFFFFF' }));
  }

  private parseStringOptions(stringOptions: CardAttribute['stringOptions']): StringOption[] {
    if (Array.isArray(stringOptions)) {
      if (stringOptions.length > 0 && typeof stringOptions[0] === 'string') {
        return (stringOptions as unknown as string[]).map(value => ({
          value: value,
          color: '#FFFFFF',
          stringValue: ''
        }));
      }
      return (stringOptions as any[]).map(option => ({
        value: option?.value || '',
        color: option?.color || '#FFFFFF',
        stringValue: option?.stringValue || ''
      }));
    }

    if (!stringOptions || typeof stringOptions !== 'string') {
      return [];
    }

    const optionsStr = stringOptions.trim();
    if (optionsStr.startsWith('[')) {
      try {
        const parsed = JSON.parse(optionsStr);
        return this.parseStringOptions(parsed as any);
      } catch (e) {
        // fallback to token parsing
      }
    }

    return optionsStr.split(/\||,/).map(value => value.trim()).map(value => ({
      value: value,
      color: '#FFFFFF',
      stringValue: ''
    }));
  }
}
