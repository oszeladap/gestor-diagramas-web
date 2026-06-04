import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface AutosaveEvent {
  filename: string;
  content: string;
  diagramType: string;
}

@Injectable({ providedIn: 'root' })
export class AutosaveService {
  private trigger$ = new Subject<AutosaveEvent>();
  private _lastSaved = new Map<string, Date>();

  onSaved$ = new Subject<{ filename: string; savedAt: Date }>();
  onError$ = new Subject<{ filename: string; error: string }>();

  constructor(private api: ApiService, private zone: NgZone) {
    this.trigger$
      .pipe(
        debounceTime(2500),
        filter(e => !!e.filename.trim() && !!e.content.trim())
      )
      .subscribe(event => this.doSave(event));
  }

  schedule(event: AutosaveEvent): void {
    this.trigger$.next(event);
  }

  getLastSaved(filename: string): Date | null {
    return this._lastSaved.get(filename) ?? null;
  }

  private doSave(event: AutosaveEvent): void {
    this.api.saveFile(event.filename, event.content, event.diagramType).subscribe({
      next: () => {
        const now = new Date();
        this._lastSaved.set(event.filename, now);
        this.zone.run(() => this.onSaved$.next({ filename: event.filename, savedAt: now }));
      },
      error: (err: Error) => {
        this.zone.run(() => this.onError$.next({ filename: event.filename, error: err.message }));
      },
    });
  }
}
