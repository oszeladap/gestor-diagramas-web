export type DiagramType = 'mermaid' | 'plantuml';
export type ExportFormat = 'png' | 'svg' | 'jpg' | 'bmp';
export type PageSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Custom';

export interface PageDimensions {
  width: number;
  height: number;
  label: string;
}

export const PAGE_SIZES: Record<PageSize, PageDimensions> = {
  A4: { width: 794, height: 1123, label: 'A4 (794×1123)' },
  A3: { width: 1123, height: 1587, label: 'A3 (1123×1587)' },
  A5: { width: 559, height: 794, label: 'A5 (559×794)' },
  Letter: { width: 816, height: 1056, label: 'Carta (816×1056)' },
  Legal: { width: 816, height: 1344, label: 'Oficio (816×1344)' },
  Custom: { width: 800, height: 600, label: 'Personalizado' },
};

export interface DiagramState {
  code: string;
  filename: string;
  diagramType: DiagramType;
  pageSize: PageSize;
  customWidth: number;
  customHeight: number;
  backgroundColor: string;
  isDirty: boolean;
  lastSaved: Date | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  diagram_type?: string;
}

export interface RenderResult {
  data: string;
  format: string;
  content_type: string;
  warnings?: string[];
}

export interface SavedFile {
  name: string;
  size: number;
  modified: number;
  type: DiagramType;
}

export interface AppConfig {
  directorio_trabajo: string;
}
