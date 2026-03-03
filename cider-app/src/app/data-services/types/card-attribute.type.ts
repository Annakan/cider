import { FieldType } from "./field-type.type";
import { DropdownOption } from "./dropdown-option.type";
import { StringOption } from './string-option.type';

export interface CardAttribute {
    id: number;
    deckId: number;
    name: string;
    type: FieldType;
    description: string;
    options: DropdownOption[] | string;
    stringOptions?: StringOption[] | string;
    width?: number | 'auto';
    order?: number;
    isSystem?: boolean;
}
