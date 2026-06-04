import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DiagramWorkspaceComponent } from './components/diagram-workspace/diagram-workspace.component';
import { ConfigDialogComponent } from './components/config-dialog/config-dialog.component';
import { AboutDialogComponent } from './components/about-dialog/about-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatTooltipModule, MatDialogModule, DiagramWorkspaceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(private dialog: MatDialog) {}

  openConfig(): void {
    this.dialog.open(ConfigDialogComponent, { width: '500px', panelClass: 'prime-dialog' });
  }

  openAbout(): void {
    this.dialog.open(AboutDialogComponent, { width: '560px', panelClass: 'prime-dialog' });
  }
}
