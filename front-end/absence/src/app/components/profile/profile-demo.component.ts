import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from './profile.component';

@Component({
  selector: 'app-profile-demo',
  imports: [CommonModule, ProfileComponent],
  template: `
    <div class="demo-container">
      <h1>Démonstration du Composant Profil</h1>
      <p>Ce composant utilise l'API <code>10.0.244.100:8000/users/{{id}}</code> pour récupérer les informations utilisateur.</p>
      <app-profile></app-profile>
    </div>
  `,
  styles: [`
    .demo-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      color: #1e293b;
      margin-bottom: 16px;
    }
    
    p {
      color: #64748b;
      margin-bottom: 24px;
    }
    
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      color: #3b82f6;
    }
  `]
})
export class ProfileDemoComponent {
}
