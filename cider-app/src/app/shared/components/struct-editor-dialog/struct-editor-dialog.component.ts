import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ThemeService } from 'src/app/data-services/theme/theme.service';

@Component({
  selector: 'app-struct-editor-dialog',
  templateUrl: './struct-editor-dialog.component.html',
  styleUrls: ['./struct-editor-dialog.component.scss'],
  standalone: true,
  imports: [DialogModule, ButtonModule, MonacoEditorModule, FormsModule]
})
export class StructEditorDialogComponent {

  @Input() visible: boolean = false;
  @Input() header: string = 'Edit Struct (YAML)';
  @Input()
  set value(val: string) {
    this.editValue = val || '';
  }
  @Input() schemaId?: number;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() valueSaved = new EventEmitter<string>();

  editValue: string = '';
  editorOptions: any;

  constructor(private themeService: ThemeService) {
    this.editorOptions = {
      theme: this.themeService.isDarkMode() ? 'vs-dark-extended' : 'vs',
      language: 'yaml',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      tabSize: 2,
      insertSpaces: true,
    };
  }

  onSave(): void {
    this.valueSaved.emit(this.editValue);
    this.close();
  }

  onCancel(): void {
    this.close();
  }

  private close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
