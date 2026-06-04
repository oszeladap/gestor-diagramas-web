import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ValidationResult, RenderResult, SavedFile, AppConfig } from '../models/diagram.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // --- Config ---
  getConfig(): Observable<AppConfig> {
    return this.http.get<AppConfig>(`${this.base}/config`).pipe(retry(1), catchError(this.handleError));
  }

  updateConfig(directorio_trabajo: string): Observable<AppConfig> {
    return this.http.put<AppConfig>(`${this.base}/config`, { directorio_trabajo }).pipe(catchError(this.handleError));
  }

  // --- Files ---
  listFiles(): Observable<SavedFile[]> {
    return this.http.get<SavedFile[]>(`${this.base}/files`).pipe(retry(1), catchError(this.handleError));
  }

  saveFile(filename: string, content: string, diagram_type: string): Observable<any> {
    return this.http.post(`${this.base}/files/save`, { filename, content, diagram_type }).pipe(catchError(this.handleError));
  }

  loadFile(filename: string): Observable<{ filename: string; content: string; diagram_type: string }> {
    return this.http.get<any>(`${this.base}/files/load/${encodeURIComponent(filename)}`).pipe(catchError(this.handleError));
  }

  deleteFile(filename: string): Observable<any> {
    return this.http.delete(`${this.base}/files/${encodeURIComponent(filename)}`).pipe(catchError(this.handleError));
  }

  uploadFile(file: File): Observable<{ filename: string; content: string; diagram_type: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${this.base}/files/upload`, form).pipe(catchError(this.handleError));
  }

  // --- Mermaid ---
  validateMermaid(code: string): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.base}/mermaid/validate`, { code }).pipe(catchError(this.handleError));
  }

  // --- PlantUML ---
  validatePlantUML(code: string): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.base}/plantuml/validate`, { code }).pipe(catchError(this.handleError));
  }

  renderPlantUML(
    code: string,
    format: string,
    page_size: string,
    background_color: string,
    width = 0,
    height = 0
  ): Observable<RenderResult> {
    return this.http
      .post<RenderResult>(`${this.base}/plantuml/render`, {
        code,
        format,
        page_size,
        background_color,
        width,
        height,
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let msg = 'Error desconocido';
    if (error.status === 0) {
      msg = 'No se puede conectar con el servidor. ¿Está el backend ejecutándose en el puerto 8000?';
    } else if (error.error?.detail) {
      const detail = error.error.detail;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ');
      } else if (detail.errors) {
        msg = detail.errors.join('; ');
      } else {
        msg = JSON.stringify(detail);
      }
    } else {
      msg = error.message;
    }
    return throwError(() => new Error(msg));
  }
}
