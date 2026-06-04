import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-about-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, DividerModule, TagModule, ButtonModule, CardModule],
  template: `
    <div class="about-wrap">
      <!-- Hero header -->
      <div class="about-hero">
        <div class="hero-icon">
          <i class="pi pi-sitemap"></i>
        </div>
        <div class="hero-text">
          <h1>Gestor de Diagramas Web</h1>
          <div class="hero-badges">
            <p-tag value="v1.0.0" severity="info" styleClass="ver-tag"></p-tag>
            <p-tag value="Offline" icon="pi pi-bolt" severity="success" styleClass="off-tag"></p-tag>
          </div>
        </div>
        <button class="close-x" (click)="close()" matTooltip="Cerrar">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Descripción -->
      <div class="about-body">
        <p class="description">
          Plataforma profesional para la creación, edición y visualización de diagramas
          <strong>Mermaid</strong> y <strong>PlantUML</strong> con soporte completo
          para trabajo sin conexión a internet.
        </p>

        <p-divider></p-divider>

        <!-- Datos del sistema -->
        <div class="info-cards">
          <div class="info-card">
            <i class="pi pi-calendar-times card-icon blue"></i>
            <div>
              <span class="card-label">Fecha de lanzamiento</span>
              <span class="card-value">{{ releaseDate }}</span>
            </div>
          </div>
          <div class="info-card">
            <i class="pi pi-user card-icon purple"></i>
            <div>
              <span class="card-label">Desarrollado por</span>
              <span class="card-value author">Oscar Zelada Pozo</span>
            </div>
          </div>
          <div class="info-card">
            <i class="pi pi-code card-icon teal"></i>
            <div>
              <span class="card-label">Stack tecnológico</span>
              <span class="card-value">Angular 17 · FastAPI · Python 3.14 · PlantUML 1.2026.5</span>
            </div>
          </div>
          <div class="info-card">
            <i class="pi pi-database card-icon orange"></i>
            <div>
              <span class="card-label">Editores de código</span>
              <span class="card-value">Monaco Editor · Mermaid.js · html-to-image</span>
            </div>
          </div>
        </div>

        <p-divider align="left"><b>Características</b></p-divider>

        <div class="features-grid">
          <div class="feat" *ngFor="let f of features">
            <i class="pi {{f.icon}} feat-icon"></i>
            <span>{{ f.label }}</span>
          </div>
        </div>

        <p-divider></p-divider>

        <div class="footer-note">
          <i class="pi pi-heart-fill" style="color:#e11d48"></i>
          Desarrollado con dedicación para la gestión profesional de diagramas técnicos.
        </div>
      </div>

      <!-- Footer -->
      <div class="about-footer">
        <p-button label="Cerrar" icon="pi pi-times" styleClass="p-button-primary"
          (onClick)="close()">
        </p-button>
      </div>
    </div>
  `,
  styles: [`
    .about-wrap {
      display: flex;
      flex-direction: column;
      min-width: 500px;
      max-width: 560px;
      overflow: hidden;
      border-radius: 16px;
    }

    // Hero
    .about-hero {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 28px 28px 22px;
      background: linear-gradient(135deg, #0f2563 0%, #1e40af 55%, #7c3aed 100%);
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: 0; left: 28px; right: 28px;
        height: 1px;
        background: rgba(255,255,255,.15);
      }
    }

    .hero-icon {
      width: 60px; height: 60px;
      background: rgba(255,255,255,.15);
      border-radius: 16px;
      border: 2px solid rgba(255,255,255,.25);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      backdrop-filter: blur(8px);

      i {
        font-size: 28px;
        color: #93c5fd;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,.3));
      }
    }

    .hero-text {
      flex: 1;
      h1 {
        margin: 0 0 8px;
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        letter-spacing: .01em;
      }
      .hero-badges {
        display: flex;
        gap: 8px;
        ::ng-deep .ver-tag { background: rgba(59,130,246,.35) !important; color: #bfdbfe !important; border: 1px solid rgba(96,165,250,.3); }
        ::ng-deep .off-tag { background: rgba(16,185,129,.3) !important; color: #a7f3d0 !important; border: 1px solid rgba(52,211,153,.3); }
      }
    }

    .close-x {
      width: 32px; height: 32px;
      border: none; background: rgba(255,255,255,.1);
      border-radius: 8px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,.6); transition: all .15s;
      i { font-size: 13px; }
      &:hover { background: rgba(255,255,255,.2); color: #fff; }
    }

    // Body
    .about-body {
      padding: 20px 28px 8px;
      background: #fff;
      overflow-y: auto;
      max-height: 420px;
    }

    .description {
      font-size: 14px;
      color: #475569;
      line-height: 1.7;
      margin: 0 0 4px;
      strong { color: var(--color-primary); }
    }

    .info-cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 4px 0;
    }

    .info-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 14px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid #e2e8f0;

      .card-icon {
        font-size: 18px;
        margin-top: 2px;
        flex-shrink: 0;
        &.blue   { color: #3b82f6; }
        &.purple { color: #7c3aed; }
        &.teal   { color: #0d9488; }
        &.orange { color: #d97706; }
      }

      .card-label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .07em;
        color: #94a3b8;
        font-weight: 600;
        margin-bottom: 2px;
      }

      .card-value {
        display: block;
        font-size: 13px;
        color: #1e293b;
        font-weight: 500;

        &.author {
          font-size: 15px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e40af, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      }
    }

    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 4px 0;
    }

    .feat {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: #374151;
      padding: 6px 10px;
      background: #f1f5f9;
      border-radius: 8px;

      .feat-icon {
        font-size: 13px;
        color: #1e40af;
        flex-shrink: 0;
      }
    }

    .footer-note {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 0;
    }

    // Footer
    .about-footer {
      padding: 14px 28px 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
    }
  `],
})
export class AboutDialogComponent {
  readonly releaseDate = new Date(2026, 5, 4).toLocaleDateString('es-PE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  readonly features = [
    { icon: 'pi-code-editor',   label: 'Editor con resaltado de sintaxis' },
    { icon: 'pi-eye',           label: 'Renderizado offline' },
    { icon: 'pi-download',      label: 'Exportación PNG/JPG/SVG/BMP' },
    { icon: 'pi-copy',          label: 'Copia al portapapeles' },
    { icon: 'pi-save',          label: 'Autoguardado automático' },
    { icon: 'pi-search-plus',   label: 'Zoom y pan interactivo' },
    { icon: 'pi-sliders-h',     label: 'Paneles redimensionables' },
    { icon: 'pi-file',          label: 'Gestión de archivos .mmd / .puml' },
  ];

  constructor(private ref: MatDialogRef<AboutDialogComponent>) {}
  close(): void { this.ref.close(); }
}
