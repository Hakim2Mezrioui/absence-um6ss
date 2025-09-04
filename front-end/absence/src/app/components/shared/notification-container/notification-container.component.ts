import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationToastComponent } from '../notification-toast/notification-toast.component';
import { Notification } from '../../../models/notification.model';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule, NotificationToastComponent],
  template: `
    <div class="notification-container fixed top-4 right-4 z-50 space-y-3">
      <app-notification-toast
        *ngFor="let notification of notifications"
        [notification]="notification"
        (close)="onRemove($event)">
      </app-notification-toast>
    </div>
  `,
  styles: [`
    .notification-container {
      max-width: 400px;
    }
  `]
})
export class NotificationContainerComponent {
  @Input() notifications: Notification[] = [];
  @Output() remove = new EventEmitter<string>();

  onRemove(id: string): void {
    this.remove.emit(id);
  }
}
