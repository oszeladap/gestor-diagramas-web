import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-config-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule,
    InputTextModule, ButtonModule, DividerModule, ProgressSpinnerModule, TagModule],
  template: `
    <div class="cfg-wrap">
      <!-- Header -->
      <div class="cfg-header">
        <div class="cfg-icon">
          <i class="pi pi-cog"></i>
        </div>
        <div>
          <h2>Configuración</h2>
          <p>Parámetros del sistema</p>
        </div>
        <button class="close-x" (click)="cancel()">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="cfg-body" *ngIf="!loading; else loader">

        <!-- Directorio de trabajo -->
        <div class="section">
          <div class="section-header">
            <i class="pi pi-folder-open section-icon"></i>
            <div>
              <span class="section-title">Directorio de trabajo</span>
              <span class="section-sub">Ubicación donde se guardarán los archivos de diagramas</span>
            </div>
          </div>

          <div class="current-path" *ngIf="currentDir">
            <i class="pi pi-map-marker"></i>
            <span>Actual: <code>{{ currentDir }}</code></span>
          </div>

          <div class="field-group">
            <label for="workDir" class="field-label">
              <i class="pi pi-pencil"></i> Nueva ruta del directorio
            </label>
            <div class="input-row">
              <span class="p-input-icon-left input-wrapper">
                <i class="pi pi-folder"></i>
                <input pInputText id="workDir" [(ngModel)]="workDir"
                  placeholder="Ej: C:\\Proyectos\\Diagramas"
                  class="w-full"
                  (keyup.enter)="save()">
              </span>
            </div>
            <small class="field-hint">
              <i class="pi pi-info-circle"></i>
              El directorio se creará si no existe.
            </small>
          </div>
        </div>

        <p-divider></p-divider>

        <!-- Info del sistema -->
        <div class="sys-info">
          <div class="sys-row">
            <span class="sys-label"><i class="pi pi-server"></i> Backend</span>
            <p-tag value="FastAPI · Python 3.14" severity="info"></p-tag>
          </div>
          <div class="sys-row">
            <span class="sys-label"><i class="pi pi-globe"></i> Frontend</span>
            <p-tag value="Angular 17 · PrimeNG" severity="success"></p-tag>
          </div>
          <div class="sys-row">
            <span class="sys-label"><i class="pi pi-chart-bar"></i> PlantUML</span>
            <p-tag value="v1.2026.5 · JDK 21" severity="warning"></p-tag>
          </div>
        </div>
      </div>

      <ng-template #loader>
        <div class="loader-center">
          <p-progressSpinner strokeWidth="4" styleClass="custom-spinner"></p-progressSpinner>
          <span>Cargando configuración...</span>
        </div>
      </ng-template>

      <!-- Footer -->
      <div class="cfg-footer">
        <p-button label="Cancelar" icon="pi pi-times"
          styleClass="p-button-outlined p-button-secondary"
          (onClick)="cancel()">
        </p-button>
        <p-button label="Guardar cambios" icon="pi pi-check"
          styleClass="p-button-primary"
          [loading]="saving"
          [disabled]="!workDir.trim() || loading"
          (onClick)="save()">
        </p-button>
      </div>
    </div>
  `,
  styles: [`
    .cfg-wrap {
      display: flex;
      flex-direction: column;
      min-width: 460px;
      border-radius: 16px;
      overflow: hidden;
    }

    // Header
    .cfg-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 24px 24px 20px;
      background: linear-gradient(135deg, #0f2563 0%, #1e40af 100%);

      .cfg-icon {
        width: 48px; height: 48px;
        background: rgba(255,255,255,.15);
        border-radius: 12px;
        border: 1.5px solid rgba(255,255,255,.25);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        i { font-size: 22px; color: #93c5fd; }
      }

      h2 { margin: 0 0 2px; font-size: 18px; font-weight: 700; color: #fff; }
      p  { margin: 0; font-size: 12px; color: rgba(255,255,255,.55); }

      .close-x {
        margin-left: auto;
        width: 30px; height: 30px;
        border: none; background: rgba(255,255,255,.1);
        border-radius: 8px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        color: rgba(255,255,255,.6); transition: all .15s;
        i { font-size: 12px; }
        &:hover { background: rgba(255,255,255,.2); color: #fff; }
      }
    }

    // Body
    .cfg-body { padding: 20px 24px 8px; background: #fff; }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;

      .section-icon {
        font-size: 20px;
        color: #1e40af;
        margin-top: 2px;
        flex-shrink: 0;
      }
      .section-title {
        display: block;
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
      }
      .section-sub {
        display: block;
        font-size: 12px;
        color: #64748b;
        margin-top: 2px;
      }
    }

    .current-path {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f1f5f9;
      border-radius: 8px;
      border-left: 3px solid #3b82f6;
      margin-bottom: 14px;
      font-size: 12px;
      color: #475569;

      i { color: #3b82f6; font-size: 13px; flex-shrink: 0; }
      code {
        font-family: 'Cascadia Code', Consolas, monospace;
        font-size: 11.5px;
        color: #1e40af;
        word-break: break-all;
      }
    }

    .field-group { display: flex; flex-direction: column; gap: 6px; }

    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: .06em;
      display: flex;
      align-items: center;
      gap: 5px;
      i { font-size: 12px; color: #3b82f6; }
    }

    .input-wrapper {
      display: block;
      width: 100%;
      input {
        width: 100%;
        font-family: 'Cascadia Code', Consolas, monospace;
        font-size: 13px;
        border-radius: 8px;
        border-color: #e2e8f0;
        &:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
      }
    }

    .field-hint {
      font-size: 11.5px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
      i { font-size: 11px; }
    }

    .sys-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 4px 0 8px;
    }

    .sys-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      .sys-label {
        font-size: 13px;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 6px;
        i { font-size: 13px; color: #94a3b8; }
      }
    }

    .loader-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
      background: #fff;
      span { font-size: 13px; color: #64748b; }
      ::ng-deep .custom-spinner .p-progress-spinner-svg { width: 48px; height: 48px; }
    }

    // Footer
    .cfg-footer {
      padding: 14px 24px 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
  `],
})
export class ConfigDialogComponent implements OnInit {
  loading = true;
  saving  = false;
  workDir = '';
  currentDir = '';

  constructor(
    private ref: MatDialogRef<ConfigDialogComponent>,
    private api: ApiService,
    private notif: NotificationService,
  ) {}

  ngOnInit(): void {
    this.api.getConfig().subscribe({
      next: cfg => { this.workDir = this.currentDir = cfg.directorio_trabajo; this.loading = false; },
      error: (e: Error) => { this.loading = false; this.notif.error('Error al cargar: ' + e.message); },
    });
  }

  save(): void {
    this.saving = true;
    this.api.updateConfig(this.workDir).subscribe({
      next: cfg => {
        this.saving = false;
        this.currentDir = cfg.directorio_trabajo;
        this.notif.success('Directorio de trabajo actualizado');
        this.ref.close(cfg);
      },
      error: (e: Error) => { this.saving = false; this.notif.error('Error: ' + e.message); },
    });
  }

  cancel(): void { this.ref.close(); }
}
