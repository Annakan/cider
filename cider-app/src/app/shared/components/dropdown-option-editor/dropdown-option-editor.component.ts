import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { DropdownOption } from 'src/app/data-services/types/dropdown-option.type';
import { StringOption } from 'src/app/data-services/types/string-option.type';
import { CommonModule } from '@angular/common';
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-dropdown-option-editor',
    templateUrl: './dropdown-option-editor.component.html',
    styleUrls: ['./dropdown-option-editor.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, ColorPickerModule, InputTextModule, TextareaModule, ButtonModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => DropdownOptionEditorComponent),
            multi: true
        }
    ]
})
export class DropdownOptionEditorComponent implements ControlValueAccessor {
    @Input() mode: 'dropdown' | 'string-dropdown' = 'dropdown';

    options: (DropdownOption | StringOption)[] = [];

    disabled = false;

    private onTouched = () => { };
    private onChanged = (value: (DropdownOption | StringOption)[]) => { };

    constructor() { }

    writeValue(obj: any): void {
        if (obj) {
            if (Array.isArray(obj)) {
                this.options = this.ensureOptionsShape(obj);
            } else if (typeof obj === 'string') {
                try {
                    const parsed = JSON.parse(obj);
                    if (Array.isArray(parsed)) {
                        this.options = this.ensureOptionsShape(parsed);
                    }
                } catch (e) {
                    this.options = [];
                }
            }
        } else {
            this.options = [];
        }
    }

    registerOnChange(fn: any): void {
        this.onChanged = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    addOption() {
        if (this.isStringDropdown()) {
            this.options.push({ value: '', color: '#ffffff', stringValue: '' });
        } else {
            this.options.push({ value: '', color: '#ffffff' });
        }
        this.onChange();
    }

    removeOption(index: number) {
        this.options.splice(index, 1);
        this.onChange();
    }

    onChange() {
        this.onChanged(this.options);
        this.onTouched();
    }

    getStringValue(option: DropdownOption | StringOption): string {
        return (option as StringOption).stringValue || '';
    }

    setStringValue(option: DropdownOption | StringOption, value: string): void {
        (option as StringOption).stringValue = value;
        this.onChange();
    }

    isStringDropdown(): boolean {
        return this.mode === 'string-dropdown';
    }

    private ensureOptionsShape(options: any[]): (DropdownOption | StringOption)[] {
        if (!this.isStringDropdown()) {
            return options.map(option => ({
                value: option?.value || '',
                color: option?.color || '#ffffff'
            }));
        }

        return options.map(option => ({
            value: option?.value || '',
            color: option?.color || '#ffffff',
            stringValue: option?.stringValue || ''
        }));
    }
}
