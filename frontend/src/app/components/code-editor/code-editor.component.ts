import {
  Component, Input, Output, EventEmitter, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, NgZone, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DiagramType } from '../../models/diagram.models';

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON: carga Monaco UNA sola vez (AMD), compartido entre todas las tabs
// ═══════════════════════════════════════════════════════════════════════════════
let _loadPromise: Promise<void> | null = null;
let _langRegistered = false;

const NOOP_WORKER =
  'data:text/javascript,' + encodeURIComponent('self.onmessage=function(){};');

function ensureMonaco(): Promise<void> {
  if (_loadPromise) return _loadPromise;

  const win = window as any;

  // Ya cargado y funcional
  if (win.monaco?.editor?.create) {
    _loadPromise = Promise.resolve();
    return _loadPromise;
  }

  // Worker no-op ANTES de cargar loader.js
  win.MonacoEnvironment = {
    getWorkerUrl: () => NOOP_WORKER,
    getWorker:    () =>
      new Worker(URL.createObjectURL(
        new Blob(['self.onmessage=function(){};'], { type: 'text/javascript' })
      )),
  };

  _loadPromise = new Promise<void>((resolve, reject) => {
    // Si otro componente ya insertó el script, sólo esperamos
    if (document.getElementById('mc-loader')) {
      const limit = Date.now() + 25_000;
      const t = setInterval(() => {
        if (win.monaco?.editor?.create) { clearInterval(t); resolve(); }
        else if (Date.now() > limit)    { clearInterval(t); reject(new Error('Monaco timeout')); }
      }, 60);
      return;
    }

    win.require = { paths: { vs: 'assets/vs' } };

    const script = document.createElement('script');
    script.id  = 'mc-loader';
    script.src = 'assets/vs/loader.js';

    script.onload = () => {
      win.require(
        ['vs/editor/editor.main'],
        () => {
          // Monaco v0.52+ puede no setear window.monaco automáticamente.
          // Lo forzamos aquí leyendo la API expuesta por el módulo AMD.
          if (!win.monaco?.editor?.create) {
            try {
              // Intentar obtenerlo desde el módulo AMD
              const api = win.require('vs/editor/editor.api');
              if (api?.editor?.create) win.monaco = api;
            } catch { /* ignorar */ }
          }

          if (win.monaco?.editor?.create) {
            resolve();
          } else {
            reject(new Error(
              'Monaco cargó pero window.monaco.editor no está disponible. ' +
              'Revisa la consola del navegador.'
            ));
          }
        },
        (err: unknown) =>
          reject(new Error('Monaco AMD error: ' + JSON.stringify(err))),
      );
    };

    script.onerror = () =>
      reject(new Error('No se pudo cargar assets/vs/loader.js'));

    document.head.appendChild(script);
  });

  return _loadPromise;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRO DE LENGUAJES
//
// REGLA CRÍTICA: TODOS los retornos de token deben ser strings, NUNCA arrays.
// Los arrays requieren que el número de elementos coincida EXACTAMENTE con el
// número de grupos de captura del regex. Si no coinciden, Monaco descarta
// silenciosamente TODA la regla → sin highlighting.
// ═══════════════════════════════════════════════════════════════════════════════
function registerLanguages(): void {
  if (_langRegistered) return;

  const m = (window as any).monaco;
  if (!m?.languages?.register || !m?.editor?.defineTheme) {
    console.error('[Monaco] API no disponible para registrar lenguajes');
    return;
  }

  _langRegistered = true;

  // ─────────────────────────────────────────────────────────────────────────
  // MERMAID
  // ─────────────────────────────────────────────────────────────────────────
  try {
    m.languages.register({ id: 'mermaid' });

    m.languages.setMonarchTokensProvider('mermaid', {
      // IMPORTANTE: sin tokenPostfix aquí para evitar transformación de nombres
      defaultToken: '',

      tokenizer: {
        root: [
          // ── Directiva %%{init...}%%
          [/%%\s*\{[^}]*\}\s*%%/, 'meta'],
          // ── Comentario %%
          [/%%[^\n]*/, 'comment'],

          // ── Tipo de diagrama (debe ir ANTES que identifier)
          [/\b(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|xychart-beta|sankey-beta|block-beta|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|zenuml)\b/,
           'keyword.diagram'],

          // ── Palabras clave de estructura
          [/\b(subgraph|classDef|class|linkStyle|style|click|direction|title|accDescription|end)\b/,
           'keyword.structure'],

          // ── Palabras clave de flujo / secuencia
          [/\b(participant|actor|Note|note|over|of|left|right|loop|alt|else|opt|par|and|critical|break|rect|activate|deactivate|section|autonumber|destroy|create|box)\b/,
           'keyword.flow'],

          // ── Dirección del grafo
          [/\b(LR|RL|TD|TB|BT)\b/, 'keyword.direction'],

          // ── Referencia a clase :::nombre
          [/:::\w+/, 'type.classref'],

          // ── Color hex dentro de classDef
          [/#[0-9A-Fa-f]{3,8}\b/, 'constant.color'],

          // ── Strings con comillas dobles
          [/"[^"]*"/, 'string'],
          // ── Strings con comillas simples
          [/'[^']*'/, 'string'],

          // ── Etiquetas entre corchetes [...]  paréntesis (...)  llaves {...}
          [/\[[^\]]*\]/, 'string.label'],
          [/\([^)]*\)/,  'string.label'],
          [/\{[^}]*\}/,  'string.label'],
          [/>[^<\n]*/,   'string.label'],

          // ── Etiqueta de arista |texto|
          [/\|[^|]*\|/, 'string.edgelabel'],

          // ── Flechas y conectores (orden importa: más específicos primero)
          [/-\.->>?/, 'operator.arrow'],
          [/==>|<==/, 'operator.arrow'],
          [/-->>/, 'operator.arrow'],
          [/-->/, 'operator.arrow'],
          [/--[xo]/, 'operator.arrow'],
          [/->/, 'operator.arrow'],
          [/~~~/, 'operator.arrow'],
          [/---?/, 'operator.line'],
          [/::|:/, 'operator.colon'],

          // ── Números
          [/\d+(\.\d+)?/, 'number'],

          // ── Identificadores
          [/[a-zA-Z_$][\w$]*/, 'identifier'],

          // ── Puntuación
          [/[;,]/, 'delimiter'],
        ],
      },
    });

    m.editor.defineTheme('mermaid-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment',           foreground: '5C8F3A', fontStyle: 'italic' },
        { token: 'meta',              foreground: '808080', fontStyle: 'italic' },
        { token: 'keyword.diagram',   foreground: '0000CC', fontStyle: 'bold'   },
        { token: 'keyword.structure', foreground: '7B28B0', fontStyle: 'bold'   },
        { token: 'keyword.flow',      foreground: '0070C1'                      },
        { token: 'keyword.direction', foreground: '00909A', fontStyle: 'bold'   },
        { token: 'type.classref',     foreground: 'A050C8', fontStyle: 'italic' },
        { token: 'constant.color',    foreground: '006600', fontStyle: 'bold'   },
        { token: 'string',            foreground: 'B52020'                      },
        { token: 'string.label',      foreground: 'B05A00'                      },
        { token: 'string.edgelabel',  foreground: '267F99'                      },
        { token: 'operator.arrow',    foreground: '0000AA', fontStyle: 'bold'   },
        { token: 'operator.line',     foreground: '606060'                      },
        { token: 'operator.colon',    foreground: '808000'                      },
        { token: 'number',            foreground: '006600'                      },
        { token: 'identifier',        foreground: '001080'                      },
        { token: 'delimiter',         foreground: '606060'                      },
      ],
      colors: {
        'editor.background':              '#FAFBFF',
        'editor.lineHighlightBackground': '#EEF4FF',
        'editorLineNumber.foreground':    '#94A3B8',
        'editorCursor.foreground':        '#1E40AF',
        'editor.selectionBackground':     '#BFDBFE80',
      },
    });

    console.log('[Monaco] Lenguaje Mermaid registrado OK');
  } catch (e) {
    console.error('[Monaco] Error registrando Mermaid:', e);
    _langRegistered = false; // permitir reintento
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLANTUML
  // Diseño deliberadamente simple, sin ignoreCase ni lookaheads, para máxima
  // compatibilidad con Monaco Monarch. Modelado igual que el tokenizador de
  // Mermaid que sí funciona.
  // ─────────────────────────────────────────────────────────────────────────
  try {
    m.languages.register({ id: 'plantuml' });

    m.languages.setMonarchTokensProvider('plantuml', {
      defaultToken: '',

      tokenizer: {
        root: [
          // ── Comentario de bloque /' ... '/ (estado dedicado para multi-línea)
          [/\/'/, { token: 'comment', next: '@blockCmt' }],

          // ── Comentario de línea (comienza con ' en cualquier posición)
          [/'[^\n]*/, 'comment'],

          // ── Directivas @startuml / @enduml y variantes
          [/@startuml[^\n]*/, 'keyword.meta'],
          [/@enduml[^\n]*/,   'keyword.meta'],
          [/@start[a-zA-Z]+/, 'keyword.meta'],
          [/@end[a-zA-Z]+/,   'keyword.meta'],

          // ── skinparam
          [/\bskinparam\b/, 'keyword.skinparam'],

          // ── Configuración visual
          [/\b(?:hide|show|remove|together|newpage|title|header|footer|legend|caption|scale|allow_mixing)\b/, 'keyword.config'],

          // ── Control de flujo (diagramas de actividad)
          [/\b(?:start|stop|end|if|then|else|elseif|endif|repeat|while|endwhile|fork|again|kill|return|break|detach)\b/, 'keyword.control'],

          // ── Elementos UML
          [/\b(?:class|interface|abstract|enum|annotation|package|namespace|object|database|queue|stack|hexagon|collections|cloud|node|agent|artifact|boundary|entity|file|folder|frame|rectangle|storage|usecase|component|actor|participant|lifeline)\b/, 'keyword.element'],

          // ── OOP
          [/\b(?:extends|implements|include|import)\b/, 'keyword.oop'],

          // ── Notas, grupos y secuencias
          [/\b(?:note|hnote|rnote|box|group|loop|alt|opt|par|critical|ref|over|activate|deactivate|destroy|create|autonumber|divider|space|delay|footbox)\b/, 'keyword.relation'],

          // ── Estereotipos completos << texto >> (una sola regla, sin estado)
          [/<<[^>]*>>/, 'keyword.stereo'],

          // ── Flechas de herencia / realización (más específicas primero)
          [/<\|--|--\|>/, 'operator.arrow.inherit'],
          [/<\|\.\.|\.\.\.?\|>/, 'operator.arrow.inherit'],

          // ── Agregación
          [/o--|--o/, 'operator.arrow.aggr'],
          [/o\.\.|\.\.o/, 'operator.arrow.aggr'],

          // ── Composición
          [/\*--|--\*/, 'operator.arrow.comp'],
          [/\*\.\.|\.\.\*/, 'operator.arrow.comp'],

          // ── Bidireccional
          [/<-->/, 'operator.arrow.bidir'],
          [/<\.\.>/, 'operator.arrow.bidir'],

          // ── Secuencia con doble cabeza
          [/-->>/, 'operator.arrow'],
          [/->>/, 'operator.arrow'],

          // ── Asociación sólida (orden: más larga primero)
          [/<--/, 'operator.arrow'],
          [/-->/, 'operator.arrow'],
          [/<-/, 'operator.arrow'],
          [/->/, 'operator.arrow'],

          // ── Dependencia punteada dirigida
          [/<\.\./, 'operator.arrow'],
          [/\.\.>/, 'operator.arrow'],

          // ── Línea sólida sin flecha
          [/--/, 'operator.line'],

          // ── Línea punteada sin flecha
          [/\.\./, 'operator.line'],

          // ── Colores #RRGGBB / #RGB / #NombreColor
          [/#[0-9A-Fa-f]{6}/, 'constant.color'],
          [/#[0-9A-Fa-f]{3}/, 'constant.color'],
          [/#[A-Za-z][A-Za-z0-9]*/, 'constant.color'],

          // ── Strings con comillas dobles
          [/"[^"]*"/, 'string'],

          // ── Etiqueta tras : (resto de la línea)
          [/:[^\n]*/, 'string.label'],

          // ── Visibilidad OOP: + - # ~  (debe ir DESPUÉS de flechas y colores)
          [/[+\-#~]/, 'keyword.visibility'],

          // ── Números
          [/[0-9]+(?:\.[0-9]+)?/, 'number'],

          // ── Identificadores (debe ir DESPUÉS de todas las keywords)
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],

          // ── Puntuación
          [/[{}()\[\],;]/, 'delimiter'],
        ],

        blockCmt: [
          [/'\//,    { token: 'comment', next: '@pop' }],
          [/[^'/]+/, 'comment'],
          [/./,      'comment'],
        ],
      },
    });

    m.editor.defineTheme('plantuml-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment',                foreground: '5C8F3A', fontStyle: 'italic' },
        { token: 'keyword.meta',           foreground: '8B008B', fontStyle: 'bold'   },
        { token: 'keyword.skinparam',      foreground: '7B4B00', fontStyle: 'bold'   },
        { token: 'keyword.config',         foreground: '0070C1'                      },
        { token: 'keyword.control',        foreground: '0000CC', fontStyle: 'bold'   },
        { token: 'keyword.element',        foreground: '007070', fontStyle: 'bold'   },
        { token: 'keyword.oop',            foreground: '267F99', fontStyle: 'italic' },
        { token: 'keyword.relation',       foreground: '005FAF'                      },
        { token: 'keyword.visibility',     foreground: 'A31515', fontStyle: 'bold'   },
        { token: 'keyword.stereo',         foreground: 'A050C0', fontStyle: 'italic' },
        { token: 'operator.arrow.inherit', foreground: '0000AA', fontStyle: 'bold'   },
        { token: 'operator.arrow.aggr',    foreground: '005F5F', fontStyle: 'bold'   },
        { token: 'operator.arrow.comp',    foreground: '006600', fontStyle: 'bold'   },
        { token: 'operator.arrow.bidir',   foreground: '7B0080', fontStyle: 'bold'   },
        { token: 'operator.arrow',         foreground: '000080', fontStyle: 'bold'   },
        { token: 'operator.line',          foreground: '808080'                      },
        { token: 'constant.color',         foreground: '006600', fontStyle: 'bold'   },
        { token: 'string',                 foreground: 'B52020'                      },
        { token: 'string.label',           foreground: 'B05A00'                      },
        { token: 'number',                 foreground: '006600'                      },
        { token: 'identifier',             foreground: '001080'                      },
        { token: 'delimiter',              foreground: '606060'                      },
      ],
      colors: {
        'editor.background':              '#FAFBFF',
        'editor.lineHighlightBackground': '#F3EEFF',
        'editorLineNumber.foreground':    '#94A3B8',
        'editorCursor.foreground':        '#7C3AED',
        'editor.selectionBackground':     '#DDD6FE80',
      },
    });

    console.log('[Monaco] Lenguaje PlantUML registrado OK');
  } catch (e) {
    console.error('[Monaco] Error registrando PlantUML:', e);
  }
}
// ═══════════════════════════════════════════════════════════════════════════════

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    <div class="editor-container">
      <div class="editor-toolbar">
        <div class="lang-badge"
          [class.mermaid]="diagramType==='mermaid'"
          [class.plantuml]="diagramType==='plantuml'">
          <i [class]="diagramType==='mermaid' ? 'pi pi-share-alt' : 'pi pi-diagram-2'"></i>
          <span class="lang-name">{{ diagramType === 'mermaid' ? 'Mermaid' : 'PlantUML' }}</span>
          <span class="lang-ext">{{ diagramType === 'mermaid' ? '.mmd' : '.puml' }}</span>
        </div>
        <div class="spacer"></div>
        <button class="tool-btn" matTooltip="Abrir archivo local" (click)="openFileInput()">
          <i class="pi pi-folder-open"></i>
        </button>
        <button class="tool-btn" matTooltip="Limpiar editor" (click)="clearEditor()">
          <i class="pi pi-trash"></i>
        </button>
        <button class="tool-btn" matTooltip="Copiar código" (click)="copyCode()">
          <i class="pi pi-copy"></i>
        </button>
      </div>

      <div #editorContainer class="monaco-editor-container"
           [style.display]="loadError ? 'none' : 'block'"></div>

      <textarea *ngIf="loadError"
        class="fallback-textarea"
        [value]="fallbackValue"
        (input)="onFallbackInput($event)"
        spellcheck="false"
        placeholder="Ingrese aquí su código de diagrama...">
      </textarea>

      <div *ngIf="loadError" class="load-error-banner">
        <i class="pi pi-exclamation-triangle"></i>
        Monaco no cargó — usando editor básico.
      </div>
    </div>
  `,
  styleUrls: ['./code-editor.component.scss'],
})
export class CodeEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;

  @Input() diagramType: DiagramType = 'mermaid';
  @Output() codeChange = new EventEmitter<string>();
  @Output() fileOpened = new EventEmitter<{ filename: string; content: string }>();

  loadError     = false;
  fallbackValue = '';

  private editor: any = null;
  private _initial    = '';
  private _lastEmitted: string | null = null;
  private _fileInput:  HTMLInputElement | null = null;

  constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {}

  @Input() set code(val: string) {
    if (val === this._lastEmitted) return;
    this._initial = val ?? '';
    if (this.editor) {
      const cur: string = this.editor.getValue();
      if (cur !== this._initial) {
        const model = this.editor.getModel();
        model.pushEditOperations(
          [], [{ range: model.getFullModelRange(), text: this._initial }], () => null
        );
      }
    } else {
      this.fallbackValue = this._initial;
    }
  }

  ngAfterViewInit(): void {
    this._fileInput = document.createElement('input');
    this._fileInput.type   = 'file';
    this._fileInput.style.display = 'none';
    this._fileInput.accept = this.diagramType === 'mermaid' ? '.mmd,.txt' : '.puml,.txt';
    this._fileInput.addEventListener('change', (e) => this.onFileSelected(e));
    document.body.appendChild(this._fileInput);

    ensureMonaco()
      .then(() => {
        registerLanguages();
        this.zone.run(() => {
          this._initEditor();
          this.cdr.markForCheck();
        });
      })
      .catch((err: unknown) => {
        console.error('[CodeEditor] Monaco error:', err);
        this.zone.run(() => {
          this.loadError     = true;
          this.fallbackValue = this._initial;
          this.cdr.markForCheck();
        });
      });
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
    this.editor = null;
    this._fileInput?.remove();
  }

  private _initEditor(): void {
    const m = (window as any).monaco;
    if (!m?.editor?.create || !this.editorContainer?.nativeElement) return;

    const lang  = this.diagramType === 'mermaid' ? 'mermaid'       : 'plantuml';
    const theme = this.diagramType === 'mermaid' ? 'mermaid-theme' : 'plantuml-theme';

    try {
      this.editor = m.editor.create(this.editorContainer.nativeElement, {
        value:            this._initial,
        language:         lang,
        theme,
        automaticLayout:  true,
        minimap:          { enabled: false },
        fontSize:         14,
        fontFamily:       "'Cascadia Code','Fira Code',Consolas,'Courier New',monospace",
        lineNumbers:      'on',
        wordWrap:         'on',
        scrollBeyondLastLine: false,
        tabSize:          2,
        insertSpaces:     true,
        renderLineHighlight: 'line',
        smoothScrolling:     true,
        cursorBlinking:      'smooth',
        bracketPairColorization: { enabled: true },
        contextmenu:         true,
        accessibilitySupport: 'off',
      });

      this.editor.onDidChangeModelContent(() => {
        const val: string = this.editor.getValue();
        this._lastEmitted = val;
        this.zone.run(() => this.codeChange.emit(val));
      });

      this.editor.onDidFocusEditorText(() => {
        this._lastEmitted = this.editor.getValue();
      });

      console.log(`[CodeEditor] Editor ${lang} iniciado con tema ${theme}`);
    } catch (err: unknown) {
      console.error('[CodeEditor] editor.create falló:', err);
      this.loadError    = true;
      this.fallbackValue = this._initial;
      this.cdr.markForCheck();
    }
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  getValue(): string {
    return this.editor ? this.editor.getValue() as string : this.fallbackValue;
  }

  loadExternalCode(val: string): void {
    this._lastEmitted = null;
    this._initial     = val;
    if (this.editor) { this.editor.setValue(val); }
    else             { this.fallbackValue = val; }
  }

  setLanguage(type: DiagramType): void {
    const m = (window as any).monaco;
    if (!m || !this.editor) return;
    m.editor.setModelLanguage(this.editor.getModel(),
      type === 'mermaid' ? 'mermaid' : 'plantuml');
    m.editor.setTheme(
      type === 'mermaid' ? 'mermaid-theme' : 'plantuml-theme');
  }

  openFileInput(): void { this._fileInput?.click(); }

  clearEditor(): void {
    if (this.editor) { this.editor.setValue(''); }
    else             { this.fallbackValue = ''; }
    this._lastEmitted = '';
    this.codeChange.emit('');
  }

  copyCode(): void {
    const t = this.getValue();
    navigator.clipboard?.writeText(t).catch(() => this._legacyCopy(t));
  }

  onFallbackInput(e: Event): void {
    const val = (e.target as HTMLTextAreaElement).value;
    this.fallbackValue = val;
    this._lastEmitted  = val;
    this.codeChange.emit(val);
  }

  onFileSelected(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const content = r.result as string;
      this.loadExternalCode(content);
      this.zone.run(() => this.fileOpened.emit({ filename: f.name, content }));
    };
    r.readAsText(f, 'utf-8');
    (e.target as HTMLInputElement).value = '';
  }

  private _legacyCopy(text: string): void {
    const el = Object.assign(document.createElement('textarea'),
      { value: text, style: 'position:fixed;opacity:0' });
    document.body.appendChild(el);
    el.focus(); el.select();
    document.execCommand('copy');
    el.remove();
  }
}
