import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { DiagramType, SavedFile } from '../../models/diagram.models';

@Component({
  selector: 'app-files-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatListModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>folder_open</mat-icon>
      Abrir archivo del servidor
    </h2>
    <mat-dialog-content class="files-content">
      <div *ngIf="loading" class="loading-state">
        <mat-spinner diameter="32"></mat-spinner>
        <span>Cargando archivos...</span>
      </div>
      <div *ngIf="!loading && files.length === 0" class="empty-state">
        <mat-icon>folder_off</mat-icon>
        <span>No hay archivos guardados</span>
      </div>
      <mat-list *ngIf="!loading && files.length > 0">
        <mat-list-item *ngFor="let f of files" class="file-item"
          [class.selected]="selectedFile === f.name"
          (click)="select(f.name)">
          <mat-icon matListItemIcon>
            {{ f.type === 'mermaid' ? 'account_tree' : 'schema' }}
          </mat-icon>
          <span matListItemTitle>{{ f.name }}</span>
          <span matListItemLine class="file-meta">
            {{ f.size | number }} bytes · {{ f.modified * 1000 | date:'dd/MM/yyyy HH:mm' }}
          </span>
          <button mat-icon-button matTooltip="Eliminar" color="warn"
            (click)="deleteFile(f.name, $event)">
            <mat-icon>delete</mat-icon>
          </button>
        </mat-list-item>
      </mat-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="!selectedFile" (click)="open()">
        <mat-icon>folder_open</mat-icon> Abrir
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; }
    .files-content { min-height: 200px; max-height: 400px; }
    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; padding: 32px;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
      span { color: #999; }
    }
    .file-item { cursor: pointer; border-radius: 4px; margin: 2px 0;
      &.selected { background: #e3f2fd; }
      &:hover { background: #f5f5f5; }
    }
    .file-meta { font-size: 11px; color: #999; }
  `],
})
export class FilesDialogComponent implements OnInit {
  loading = true;
  files: SavedFile[] = [];
  selectedFile = '';

  constructor(
    private ref: MatDialogRef<FilesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { diagramType: DiagramType },
    private api: ApiService,
    private notif: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading = true;
    this.api.listFiles().subscribe({
      next: (files) => {
        this.files = files.filter(f => f.type === this.data.diagramType);
        this.loading = false;
      },
      error: (err: Error) => {
        this.loading = false;
        this.notif.error('Error al cargar archivos: ' + err.message);
      },
    });
  }

  select(name: string): void { this.selectedFile = name; }

  open(): void {
    if (!this.selectedFile) return;
    this.api.loadFile(this.selectedFile).subscribe({
      next: (res) => this.ref.close({ filename: res.filename, content: res.content }),
      error: (err: Error) => this.notif.error('Error al abrir: ' + err.message),
    });
  }

  deleteFile(name: string, e: Event): void {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    this.api.deleteFile(name).subscribe({
      next: () => { this.notif.success(`Eliminado: ${name}`); this.loadFiles(); },
      error: (err: Error) => this.notif.error('Error: ' + err.message),
    });
  }
}
