import {
  Component, Input, OnDestroy, ViewChild, ElementRef,
  AfterViewInit, NgZone, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ExportFormat } from '../../models/diagram.models';
import { NotificationService } from '../../services/notification.service';

// html-to-image captura el DOM completo (incluye <foreignObject> de Mermaid)
// sin pasar por el canvas API, evitando el error "Tainted canvas".
import { toPng, toJpeg, toBlob as domToBlob, toSvg } from 'html-to-image';

@Component({
  selector: 'app-diagram-viewer',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule,
    MatMenuModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="viewer-container">
      <div class="viewer-toolbar">
        <button mat-icon-button matTooltip="Acercar" (click)="zoomIn()">
          <mat-icon>zoom_in</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Alejar" (click)="zoomOut()">
          <mat-icon>zoom_out</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Ajustar a pantalla" (click)="fitToScreen()">
          <mat-icon>fit_screen</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Tamaño original (100%)" (click)="resetZoom()">
          <mat-icon>crop_free</mat-icon>
        </button>
        <span class="zoom-label">{{ (zoomLevel * 100) | number:'1.0-0' }}%</span>

        <div class="sep"></div>

        <button mat-icon-button matTooltip="Copiar imagen al portapapeles"
          [disabled]="!hasDiagram || exporting" (click)="copyToClipboard()">
          <mat-icon>content_copy</mat-icon>
        </button>

        <button mat-icon-button [matMenuTriggerFor]="exportMenu"
          matTooltip="Exportar imagen" [disabled]="!hasDiagram || exporting">
          <mat-icon>{{ exporting ? 'hourglass_empty' : 'download' }}</mat-icon>
        </button>
        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item (click)="exportAs('png')">
            <mat-icon>image</mat-icon> PNG (alta calidad)
          </button>
          <button mat-menu-item (click)="exportAs('svg')">
            <mat-icon>polyline</mat-icon> SVG (vectorial)
          </button>
          <button mat-menu-item (click)="exportAs('jpg')">
            <mat-icon>photo</mat-icon> JPG
          </button>
          <button mat-menu-item (click)="exportAs('bmp')">
            <mat-icon>photo_library</mat-icon> BMP
          </button>
        </mat-menu>
      </div>

      <div class="viewer-canvas" #viewerCanvas
        (mousedown)="onMouseDown($event)"
        (wheel)="onWheel($event)">

        <div *ngIf="loading" class="overlay">
          <mat-spinner diameter="48"></mat-spinner>
          <span>Renderizando...</span>
        </div>

        <div *ngIf="exporting" class="overlay">
          <mat-spinner diameter="48"></mat-spinner>
          <span>Exportando...</span>
        </div>

        <div *ngIf="errorMessage && !loading" class="error-overlay">
          <mat-icon class="error-icon">error_outline</mat-icon>
          <div class="error-title">Error al renderizar</div>
          <pre class="error-detail">{{ errorMessage }}</pre>
        </div>

        <div *ngIf="!hasDiagram && !loading && !errorMessage" class="empty-state">
          <mat-icon>account_tree</mat-icon>
          <span>Presione "Visualizar" para renderizar el diagrama</span>
        </div>

        <div #diagramWrapper class="diagram-wrapper"
          [class.dragging]="isDragging"
          [style.transform]="transform">
          <div #diagramContent class="diagram-content"
            [style.background-color]="backgroundColor">
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./diagram-viewer.component.scss'],
})
export class DiagramViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewerCanvas')   viewerCanvas!:   ElementRef<HTMLDivElement>;
  @ViewChild('diagramWrapper') diagramWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('diagramContent') diagramContent!: ElementRef<HTMLDivElement>;

  @Input() backgroundColor = '#FFFFFF';

  loading    = false;
  exporting  = false;
  errorMessage = '';
  hasDiagram = false;
  zoomLevel  = 1;
  panX = 0;
  panY = 0;
  isDragging = false;

  private dragStart = { x: 0, y: 0 };
  private panStart  = { x: 0, y: 0 };
  private _mmov: ((e: MouseEvent) => void) | null = null;
  private _mup:  (() => void) | null = null;

  get transform(): string {
    return `translate(${this.panX}px,${this.panY}px) scale(${this.zoomLevel})`;
  }

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private notif: NotificationService,
  ) {}

  ngAfterViewInit(): void {
    this._mmov = (e: MouseEvent) => {
      if (!this.isDragging) return;
      this.panX = this.panStart.x + (e.clientX - this.dragStart.x);
      this.panY = this.panStart.y + (e.clientY - this.dragStart.y);
      this.cdr.detectChanges();
    };
    this._mup = () => { this.isDragging = false; this.cdr.detectChanges(); };
    document.addEventListener('mousemove', this._mmov);
    document.addEventListener('mouseup',   this._mup);
  }

  ngOnDestroy(): void {
    if (this._mmov) document.removeEventListener('mousemove', this._mmov);
    if (this._mup)  document.removeEventListener('mouseup',   this._mup);
  }

  // ── Pan / Zoom ─────────────────────────────────────────────────────────────
  onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || !this.hasDiagram) return;
    this.isDragging = true;
    this.dragStart  = { x: e.clientX, y: e.clientY };
    this.panStart   = { x: this.panX,  y: this.panY };
    e.preventDefault();
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (!this.hasDiagram) return;
    const factor = e.deltaY > 0 ? 0.9 : 1.11;
    this.zoomLevel = Math.min(8, Math.max(0.05, this.zoomLevel * factor));
    this.cdr.detectChanges();
  }

  zoomIn():    void { this.zoomLevel = Math.min(8, this.zoomLevel * 1.25); this.cdr.detectChanges(); }
  zoomOut():   void { this.zoomLevel = Math.max(0.05, this.zoomLevel / 1.25); this.cdr.detectChanges(); }
  resetZoom(): void { this.zoomLevel = 1; this.panX = 0; this.panY = 0; this.cdr.detectChanges(); }

  fitToScreen(): void {
    const canvas  = this.viewerCanvas?.nativeElement.getBoundingClientRect();
    const content = this.diagramContent?.nativeElement;
    if (!canvas || !content) return;
    const cw = content.scrollWidth;
    const ch = content.scrollHeight;
    if (!cw || !ch) return;
    const margin = 32;
    this.zoomLevel = Math.min((canvas.width - margin) / cw, (canvas.height - margin) / ch, 2);
    this.panX = Math.round((canvas.width  - cw * this.zoomLevel) / 2);
    this.panY = Math.round((canvas.height - ch * this.zoomLevel) / 2);
    this.cdr.detectChanges();
  }

  // ── Renderizado ───────────────────────────────────────────────────────────
  setLoading(v: boolean): void {
    this.zone.run(() => { this.loading = v; this.cdr.detectChanges(); });
  }

  setError(msg: string): void {
    this.zone.run(() => {
      this.errorMessage = msg;
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  clearError(): void { this.errorMessage = ''; this.cdr.detectChanges(); }

  renderSvg(svgStr: string): void {
    this.zone.run(() => {
      this.errorMessage = '';
      this.loading      = false;
      this.hasDiagram   = true;

      const el = this.diagramContent?.nativeElement;
      if (!el) return;

      el.innerHTML = svgStr;

      const svg = el.querySelector('svg') as SVGSVGElement | null;
      if (svg) {
        const vb = svg.viewBox?.baseVal;
        const sw = vb?.width  > 0 ? Math.round(vb.width)  : (svg.width?.baseVal?.value  || 794);
        const sh = vb?.height > 0 ? Math.round(vb.height) : (svg.height?.baseVal?.value || 600);
        svg.setAttribute('width',  String(sw));
        svg.setAttribute('height', String(sh));
        // IMPORTANTE: píxeles explícitos, NO '100%'.
        // Con '100%' html-to-image resuelve al viewport → diagrama ocupa <50% del export.
        svg.style.cssText = `width:${sw}px;height:${sh}px;display:block;max-width:none;`;
      }

      setTimeout(() => { this.fitToScreen(); this.cdr.detectChanges(); }, 80);
      this.cdr.detectChanges();
    });
  }

  renderImage(dataB64: string, format: string): void {
    this.zone.run(() => {
      this.errorMessage = '';
      this.loading      = false;
      this.hasDiagram   = true;

      const el = this.diagramContent?.nativeElement;
      if (!el) return;

      const mimes: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml',
      };
      el.innerHTML = `<img src="data:${mimes[format] ?? 'image/png'};base64,${dataB64}"
        style="display:block;max-width:100%;height:auto" alt="Diagrama">`;

      setTimeout(() => { this.fitToScreen(); this.cdr.detectChanges(); }, 80);
      this.cdr.detectChanges();
    });
  }

  // ── Helpers dimensiones ───────────────────────────────────────────────────
  private _svgDims(svg: SVGSVGElement): { w: number; h: number } {
    const vb = svg.viewBox?.baseVal;
    if (vb?.width > 0) return { w: vb.width, h: vb.height };

    const aw = svg.width?.baseVal?.value;
    const ah = svg.height?.baseVal?.value;
    if (aw > 0) return { w: aw, h: ah };

    try {
      const bb = svg.getBBox();
      if (bb.width > 0) return { w: bb.width + bb.x * 2, h: bb.height + bb.y * 2 };
    } catch { /* no-op */ }

    const r = svg.getBoundingClientRect();
    if (r.width > 0) return { w: r.width, h: r.height };

    return { w: 794, h: 600 };
  }

  // ── Exportar SVG directo (sin canvas, siempre funciona) ───────────────────
  private _exportSvgDirect(svgEl: SVGSVGElement): void {
    const { w, h } = this._svgDims(svgEl);
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns',       'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('width',  String(w));
    clone.setAttribute('height', String(h));
    clone.style.maxWidth = '';

    // Codificar con soporte Unicode completo
    const text    = new XMLSerializer().serializeToString(clone);
    const bytes   = new TextEncoder().encode(text);
    let   bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    const b64 = btoa(bin);

    this._downloadBlob(
      this._b64ToBlob(b64, 'image/svg+xml'),
      'diagrama.svg',
    );
    this.notif.success('SVG exportado');
  }

  // ── html-to-image: captura DOM con texto y estilos ───────────────────────
  /**
   * Opciones comunes para html-to-image.
   * - pixelRatio:2  → imagen 2× resolución (nítida)
   * - skipFonts:true → no intenta cargar fuentes externas (evita timeout/CORS)
   * - cacheBust:true  → evita caché de recursos
   */
  /**
   * Opciones para html-to-image.
   * NO se pasa width/height — html-to-image mide el elemento natural.
   * Como el SVG ya tiene píxeles explícitos en renderSvg(), el tamaño
   * del .diagram-content es exactamente SVG + padding CSS → sin espacio extra.
   */
  private _htmlImgOptions() {
    return {
      backgroundColor: this.backgroundColor || '#ffffff',
      pixelRatio:      2,       // 2× resolución para imágenes nítidas
      skipFonts:       true,    // no descargar fuentes externas (evita CORS/timeout)
      cacheBust:       true,
    };
  }

  // ── Exportar ──────────────────────────────────────────────────────────────
  exportAs(format: ExportFormat): void {
    if (!this.hasDiagram || this.exporting) return;

    const contentEl = this.diagramContent?.nativeElement as HTMLElement;
    if (!contentEl) return;

    const svgEl = contentEl.querySelector('svg') as SVGSVGElement | null;
    const imgEl = contentEl.querySelector('img') as HTMLImageElement | null;

    if (svgEl) {
      if (format === 'svg') {
        this._exportSvgDirect(svgEl);
        return;
      }
      // PNG / JPG / BMP → html-to-image (captura DOM completo con texto)
      this._exportViaHtmlToImage(contentEl, svgEl, format);
    } else if (imgEl) {
      this._exportFromImg(imgEl, format);
    }
  }

  private async _exportViaHtmlToImage(
    contentEl: HTMLElement,
    svgEl: SVGSVGElement,
    format: ExportFormat,
  ): Promise<void> {
    this.exporting = true;
    this.cdr.detectChanges();

    const opts = this._htmlImgOptions();

    try {
      let blob: Blob | null = null;

      if (format === 'jpg') {
        const dataUrl = await toJpeg(contentEl, { ...opts, quality: 0.95 });
        blob = await (await fetch(dataUrl)).blob();
      } else {
        // PNG y BMP (BMP como PNG — navegadores no soportan BMP nativo en canvas)
        blob = await domToBlob(contentEl, opts);
      }

      if (blob) {
        this._downloadBlob(blob, `diagrama.${format}`);
        this.notif.success(`Imagen ${format.toUpperCase()} exportada correctamente`);
      } else {
        this.notif.error('No se pudo generar la imagen');
      }
    } catch (err: any) {
      console.error('[DiagramViewer] export error:', err);
      this.notif.error('Error al exportar: ' + (err?.message ?? String(err)));
    } finally {
      this.exporting = false;
      this.cdr.detectChanges();
    }
  }

  private _exportFromImg(imgEl: HTMLImageElement, format: ExportFormat): void {
    if (format === 'svg' && imgEl.src.includes('image/svg+xml')) {
      const b64 = imgEl.src.split(',')[1];
      this._downloadBlob(this._b64ToBlob(b64, 'image/svg+xml'), 'diagrama.svg');
      this.notif.success('SVG exportado');
      return;
    }
    // Para imágenes PlantUML raster ya están en base64
    const src = imgEl.src;
    const canvas = document.createElement('canvas');
    const img    = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = this.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const mimes: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', bmp: 'image/png', svg: 'image/png',
      };
      canvas.toBlob(blob => {
        if (blob) {
          this._downloadBlob(blob, `diagrama.${format}`);
          this.notif.success(`Imagen ${format.toUpperCase()} exportada`);
        }
      }, mimes[format] || 'image/png', 0.95);
    };
    img.src = src;
  }

  // ── Copiar al portapapeles ─────────────────────────────────────────────────
  async copyToClipboard(): Promise<void> {
    if (!this.hasDiagram || this.exporting) return;

    const contentEl = this.diagramContent?.nativeElement as HTMLElement;
    if (!contentEl) return;

    const svgEl = contentEl.querySelector('svg') as SVGSVGElement | null;
    const imgEl = contentEl.querySelector('img') as HTMLImageElement | null;

    this.exporting = true;
    this.cdr.detectChanges();

    try {
      let blob: Blob | null = null;

      if (svgEl) {
        blob = await domToBlob(contentEl, this._htmlImgOptions());
      } else if (imgEl) {
        blob = await this._imgElToBlob(imgEl);
      }

      if (!blob) throw new Error('No se pudo generar la imagen para el portapapeles');

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        this.notif.success('Diagrama copiado al portapapeles');
      } else {
        this._downloadBlob(blob, 'diagrama.png');
        this.notif.warning('Portapapeles no disponible — se descargó la imagen');
      }
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      if (/NotAllowed|permission|clipboard/i.test(msg)) {
        try {
          const b = await domToBlob(contentEl, this._htmlImgOptions());
          if (b) this._downloadBlob(b, 'diagrama.png');
          this.notif.warning('Permiso de portapapeles denegado — se descargó la imagen');
        } catch { /* ignore */ }
      } else {
        this.notif.error('Error al copiar: ' + msg);
      }
    } finally {
      this.exporting = false;
      this.cdr.detectChanges();
    }
  }

  // ── Utilidades ────────────────────────────────────────────────────────────
  private _imgElToBlob(imgEl: HTMLImageElement): Promise<Blob | null> {
    return new Promise(resolve => {
      const c = document.createElement('canvas');
      const i = new Image();
      i.onload = () => {
        c.width = i.naturalWidth; c.height = i.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = this.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(i, 0, 0);
        c.toBlob(resolve, 'image/png');
      };
      i.onerror = () => resolve(null);
      i.src = imgEl.src;
    });
  }

  private _b64ToBlob(b64: string, mime: string): Blob {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  private _downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
