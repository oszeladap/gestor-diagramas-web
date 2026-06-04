import {
  Component, Input, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';

import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { DiagramViewerComponent } from '../diagram-viewer/diagram-viewer.component';
import { ApiService } from '../../services/api.service';
import { AutosaveService } from '../../services/autosave.service';
import { NotificationService } from '../../services/notification.service';
import { DiagramType, PageSize, PAGE_SIZES, ValidationResult } from '../../models/diagram.models';
import { SaveDialogComponent } from '../save-dialog/save-dialog.component';
import { FilesDialogComponent } from '../files-dialog/files-dialog.component';

import mermaid from 'mermaid';

@Component({
  selector: 'app-diagram-workspace',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatMenuModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule,
    SelectButtonModule, TooltipModule,
    CodeEditorComponent, DiagramViewerComponent,
  ],
  templateUrl: './diagram-workspace.component.html',
  styleUrls: ['./diagram-workspace.component.scss'],
})
export class DiagramWorkspaceComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() diagramType: DiagramType = 'mermaid';
  @ViewChild('codeEditor') codeEditor!: CodeEditorComponent;
  @ViewChild('diagramViewer') diagramViewer!: DiagramViewerComponent;

  code = '';
  filename = 'diagrama';
  pageSize: PageSize = 'A4';
  customWidth = 794;
  customHeight = 1123;
  backgroundColor = '#FFFFFF';
  transparentBg = false;
  isDirty = false;
  lastSavedLabel = '';
  validationErrors: string[] = [];
  validationWarnings: string[] = [];

  pageSizes = Object.entries(PAGE_SIZES).map(([key, val]) => ({ key: key as PageSize, label: val.label }));
  isCustom = false;

  get effectiveBgColor(): string {
    return this.transparentBg ? 'transparent' : this.backgroundColor;
  }

  onTransparentToggle(): void {
    this.transparentBg = !this.transparentBg;
  }

  leftWidth = 50;
  private resizing = false;
  private resizeStartX = 0;
  private resizeStartLeft = 0;
  private resizeMouseMove: ((e: MouseEvent) => void) | null = null;
  private resizeMouseUp: (() => void) | null = null;

  private mermaidInited = false;
  private subs = new Subscription();

  constructor(
    private api: ApiService,
    private autosave: AutosaveService,
    private notif: NotificationService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.initMermaid();
    this.code = this.diagramType === 'mermaid'
      ? 'graph TD\n    A[Inicio] --> B{Decisión}\n    B -->|Sí| C[Resultado 1]\n    B -->|No| D[Resultado 2]'
      : '@startuml\nAlice -> Bob: Hola\nBob -> Alice: Hola también\n@enduml';

    this.subs.add(
      this.autosave.onSaved$.subscribe(({ filename, savedAt }) => {
        if (filename === this.filename || filename === this.filename + (this.diagramType === 'mermaid' ? '.mmd' : '.puml')) {
          this.lastSavedLabel = `Guardado: ${savedAt.toLocaleTimeString()}`;
          this.isDirty = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.cleanupResizeListeners();
  }

  private initMermaid(): void {
    if (this.mermaidInited) return;
    mermaid.initialize({
      startOnLoad:   false,
      theme:         'default',
      securityLevel: 'loose',
      fontFamily:    '"Segoe UI", Roboto, Arial, sans-serif',
      fontSize:      16,
      // htmlLabels: false → usa <text> SVG nativo en vez de <foreignObject>
      // IMPRESCINDIBLE para que la exportación PNG/JPG funcione correctamente,
      // ya que canvas.drawImage() no renderiza <foreignObject>.
      flowchart: {
        htmlLabels:      false,
        curve:           'basis',
        diagramPadding:  20,
        nodeSpacing:     60,
        rankSpacing:     60,
        padding:         15,
        useMaxWidth:     false,  // no recortar el SVG con max-width
      },
      sequence: { useMaxWidth: false },
      gantt:    { useMaxWidth: false },
    });
    this.mermaidInited = true;
  }

  onCodeChange(code: string): void {
    this.code = code;
    this.isDirty = true;
    this.validationErrors = [];
    this.autosave.schedule({
      filename: this.filename,
      content: code,
      diagramType: this.diagramType,
    });
  }

  onFileOpened(event: { filename: string; content: string }): void {
    const base = event.filename.replace(/\.(mmd|puml)$/i, '');
    this.filename = base;
    this.code = event.content;
    this.isDirty = false;
    // Usar loadExternalCode para evitar el loop de binding
    if (this.codeEditor) this.codeEditor.loadExternalCode(event.content);
    this.notif.success(`Archivo cargado: ${event.filename}`);
  }

  async visualize(): Promise<void> {
    // Leer siempre desde el editor (fuente de verdad), no del binding
    if (this.codeEditor) this.code = this.codeEditor.getValue();
    if (!this.code.trim()) {
      this.notif.warning('El editor está vacío. Ingrese un diagrama primero.');
      return;
    }

    this.diagramViewer.setLoading(true);
    this.diagramViewer.clearError();
    this.validationErrors = [];
    this.validationWarnings = [];

    try {
      if (this.diagramType === 'mermaid') {
        await this.renderMermaid();
      } else {
        await this.renderPlantUML();
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      this.diagramViewer.setError(msg);
      this.validationErrors = [msg];
      this.notif.error('Error al renderizar: ' + msg);
    }
  }

  private async renderMermaid(): Promise<void> {
    // Validate first via API
    this.api.validateMermaid(this.code).subscribe({
      next: async (result: ValidationResult) => {
        if (result.warnings?.length) this.validationWarnings = result.warnings;
        if (!result.valid) {
          this.validationErrors = result.errors;
          this.diagramViewer.setError(result.errors.join('\n'));
          this.notif.error('Errores de validación en el diagrama');
          return;
        }
        // Render client-side
        try {
          const id = `mermaid-${Date.now()}`;
          const bg = this.effectiveBgColor;
          const bgStyle = (!this.transparentBg && bg !== '#FFFFFF')
            ? `%%{init: {'theme': 'base', 'themeVariables': {'background': '${bg}'}}}%%\n`
            : '';
          const codeWithTheme = bgStyle + this.code;
          const { svg } = await mermaid.render(id, codeWithTheme);
          this.diagramViewer.renderSvg(svg);
          if (result.warnings?.length) this.notif.warning('Advertencias: ' + result.warnings.join('; '));
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          this.diagramViewer.setError(msg);
          this.validationErrors = [msg];
          this.notif.error('Error Mermaid: ' + msg);
        }
      },
      error: (err: Error) => {
        this.validationErrors = [err.message];
        this.diagramViewer.setError(err.message);
        this.notif.error(err.message);
      },
    });
  }

  private async renderPlantUML(): Promise<void> {
    const dims = PAGE_SIZES[this.pageSize];
    const w = this.pageSize === 'Custom' ? this.customWidth : dims.width;
    const h = this.pageSize === 'Custom' ? this.customHeight : dims.height;

    this.api.renderPlantUML(this.code, 'svg', this.pageSize, this.backgroundColor, w, h).subscribe({
      next: (result) => {
        if (result.warnings?.length) this.validationWarnings = result.warnings;
        if (result.format === 'svg') {
          const decoded = atob(result.data);
          this.diagramViewer.renderSvg(decoded);
        } else {
          this.diagramViewer.renderImage(result.data, result.format);
        }
        if (result.warnings?.length) this.notif.warning('Advertencias: ' + result.warnings.join('; '));
      },
      error: (err: Error) => {
        this.validationErrors = [err.message];
        this.diagramViewer.setError(err.message);
        this.notif.error('Error PlantUML: ' + err.message);
      },
    });
  }

  openSaveDialog(): void {
    const ref = this.dialog.open(SaveDialogComponent, {
      width: '380px',
      data: { filename: this.filename, diagramType: this.diagramType },
    });
    ref.afterClosed().subscribe((name: string) => {
      if (!name) return;
      this.filename = name;
      this.api.saveFile(name, this.code, this.diagramType).subscribe({
        next: (res: any) => {
          this.isDirty = false;
          this.lastSavedLabel = `Guardado: ${new Date().toLocaleTimeString()}`;
          this.notif.success(`Guardado: ${res.filename}`);
          this.cdr.markForCheck();
        },
        error: (err: Error) => this.notif.error('Error al guardar: ' + err.message),
      });
    });
  }

  openFilesDialog(): void {
    const ref = this.dialog.open(FilesDialogComponent, {
      width: '500px',
      data: { diagramType: this.diagramType },
    });
    ref.afterClosed().subscribe((file: { filename: string; content: string } | null) => {
      if (!file) return;
      const base = file.filename.replace(/\.(mmd|puml)$/i, '');
      this.filename = base;
      this.code = file.content;
      if (this.codeEditor) this.codeEditor.loadExternalCode(file.content);
      this.isDirty = false;
      this.notif.success(`Archivo cargado: ${file.filename}`);
    });
  }

  onPageSizeChange(): void {
    this.isCustom = this.pageSize === 'Custom';
  }

  // --- Resize panel ---
  startResize(e: MouseEvent): void {
    this.resizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartLeft = this.leftWidth;
    e.preventDefault();

    this.resizeMouseMove = (ev: MouseEvent) => {
      if (!this.resizing) return;
      const container = document.querySelector('.workspace-panels') as HTMLElement;
      if (!container) return;
      const totalWidth = container.getBoundingClientRect().width;
      const dx = ev.clientX - this.resizeStartX;
      const newPct = this.resizeStartLeft + (dx / totalWidth) * 100;
      this.zone.run(() => {
        this.leftWidth = Math.min(85, Math.max(15, newPct));
        this.cdr.markForCheck();
      });
    };
    this.resizeMouseUp = () => {
      this.resizing = false;
      this.cleanupResizeListeners();
    };
    document.addEventListener('mousemove', this.resizeMouseMove);
    document.addEventListener('mouseup', this.resizeMouseUp);
  }

  private cleanupResizeListeners(): void {
    if (this.resizeMouseMove) { document.removeEventListener('mousemove', this.resizeMouseMove); this.resizeMouseMove = null; }
    if (this.resizeMouseUp) { document.removeEventListener('mouseup', this.resizeMouseUp); this.resizeMouseUp = null; }
  }
}
