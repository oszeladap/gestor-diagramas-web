import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { DiagramType } from '../../models/diagram.models';

@Component({
  selector: 'app-save-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>save</mat-icon>
      Guardar diagrama
    </h2>
    <mat-dialog-content>
      <p class="hint">El archivo se guardará en el directorio de trabajo del servidor</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nombre del archivo</mat-label>
        <input matInput [(ngModel)]="filename" (keyup.enter)="save()" placeholder="mi_diagrama">
        <span matSuffix class="ext-suffix">{{ ext }}</span>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!filename.trim()">
        <mat-icon>save</mat-icon> Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; }
    .hint { font-size: 13px; color: #666; margin-bottom: 8px; }
    .full-width { width: 100%; }
    .ext-suffix { color: #999; font-size: 13px; }
  `],
})
export class SaveDialogComponent {
  filename: string;
  ext: string;

  constructor(
    private ref: MatDialogRef<SaveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { filename: string; diagramType: DiagramType },
  ) {
    this.filename = data.filename;
    this.ext = data.diagramType === 'mermaid' ? '.mmd' : '.puml';
  }

  save(): void {
    if (!this.filename.trim()) return;
    this.ref.close(this.filename.trim());
  }
}
