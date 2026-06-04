import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  success(msg: string, duration = 3000): void {
    this.show(msg, 'success-snack', duration);
  }

  error(msg: string, duration = 6000): void {
    this.show(msg, 'error-snack', duration);
  }

  warning(msg: string, duration = 4000): void {
    this.show(msg, 'warning-snack', duration);
  }

  info(msg: string, duration = 3000): void {
    this.show(msg, 'info-snack', duration);
  }

  private show(message: string, panelClass: string, duration: number): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: [panelClass],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    };
    this.snackBar.open(message, '✕', config);
  }
}
