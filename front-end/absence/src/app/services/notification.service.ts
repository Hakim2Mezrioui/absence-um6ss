import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notifications$ = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this._notifications$.asObservable();
  
  getNotifications() {
    return this.notifications$;
  }
  
  show(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration || 5000
    };
    
    const currentNotifications = this._notifications$.value;
    this._notifications$.next([...currentNotifications, newNotification]);
    
    // Auto-remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newNotification.duration);
    }
  }
  
  success(title: string, message: string, duration: number = 5000) {
    this.show({ type: 'success', title, message, duration });
  }
  
  error(title: string, message: string, duration: number = 8000) {
    this.show({ type: 'error', title, message, duration });
  }
  
  warning(title: string, message: string, duration: number = 6000) {
    this.show({ type: 'warning', title, message, duration });
  }
  
  info(title: string, message: string, duration: number = 5000) {
    this.show({ type: 'info', title, message, duration });
  }
  
  // Méthodes simplifiées sans titre
  successMessage(message: string, duration: number = 5000) {
    this.show({ type: 'success', message, duration });
  }
  
  errorMessage(message: string, duration: number = 8000) {
    this.show({ type: 'error', message, duration });
  }
  
  warningMessage(message: string, duration: number = 6000) {
    this.show({ type: 'warning', message, duration });
  }
  
  infoMessage(message: string, duration: number = 5000) {
    this.show({ type: 'info', message, duration });
  }
  
  remove(id: string) {
    const currentNotifications = this._notifications$.value;
    this._notifications$.next(currentNotifications.filter(n => n.id !== id));
  }
  
  clear() {
    this._notifications$.next([]);
  }
}