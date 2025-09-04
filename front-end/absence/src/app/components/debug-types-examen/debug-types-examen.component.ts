import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';

@Component({
  selector: 'app-debug-types-examen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="debug-panel">
      <h3>🔍 Debug - Types d'Examen</h3>
      
      <div class="debug-info">
        <p><strong>Status:</strong> {{ status }}</p>
        <p><strong>Nombre de types:</strong> {{ typesExamen.length }}</p>
        <p><strong>Dernière erreur:</strong> {{ lastError || 'Aucune' }}</p>
      </div>

      <div class="debug-actions">
        <button (click)="testGetAll()" class="btn-test">Test getAllTypesExamen()</button>
        <button (click)="testGetPaginated()" class="btn-test">Test getTypesExamenPaginated()</button>
        <button (click)="clearData()" class="btn-clear">Effacer</button>
      </div>

      <div class="debug-results">
        <h4>Types d'examen chargés:</h4>
        <div *ngIf="typesExamen.length > 0" class="types-list">
          <div *ngFor="let type of typesExamen" class="type-item">
            <strong>ID:</strong> {{ type.id }} | <strong>Nom:</strong> {{ type.name }}
          </div>
        </div>
        <div *ngIf="typesExamen.length === 0" class="no-types">
          ❌ Aucun type d'examen chargé
        </div>
      </div>

      <div *ngIf="lastError" class="error-display">
        <h4>❌ Dernière erreur:</h4>
        <pre>{{ lastError }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .debug-panel {
      background: #f8f9fa;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      font-family: monospace;
    }

    .debug-info {
      background: #e9ecef;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 15px;
    }

    .debug-actions {
      margin-bottom: 15px;
    }

    .btn-test {
      background: #007bff;
      color: white;
      border: none;
      padding: 8px 16px;
      margin-right: 10px;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-clear {
      background: #6c757d;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }

    .types-list {
      background: #d4edda;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }

    .type-item {
      padding: 5px 0;
      border-bottom: 1px solid #c3e6cb;
    }

    .no-types {
      background: #f8d7da;
      color: #721c24;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
    }

    .error-display {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      padding: 15px;
      margin-top: 15px;
    }

    pre {
      background: #f1f3f4;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
  `]
})
export class DebugTypesExamenComponent implements OnInit {
  typesExamen: TypeExamen[] = [];
  status = 'En attente...';
  lastError = '';

  constructor(private typesExamenService: TypesExamenService) {}

  ngOnInit(): void {
    console.log('🔍 DebugTypesExamenComponent initialisé');
    this.testGetAll();
  }

  testGetAll(): void {
    this.status = 'Test getAllTypesExamen() en cours...';
    this.lastError = '';
    console.log('🧪 Test getAllTypesExamen() démarré');

    this.typesExamenService.getAllTypesExamen().subscribe({
      next: (types) => {
        console.log('✅ getAllTypesExamen() réussi:', types);
        this.typesExamen = types;
        this.status = `✅ Succès - ${types.length} types chargés`;
      },
      error: (err) => {
        console.error('❌ getAllTypesExamen() échoué:', err);
        this.lastError = `Erreur: ${err.message || err.statusText || 'Erreur inconnue'}`;
        this.status = '❌ Échec - getAllTypesExamen()';
      }
    });
  }

  testGetPaginated(): void {
    this.status = 'Test getTypesExamenPaginated() en cours...';
    this.lastError = '';
    console.log('🧪 Test getTypesExamenPaginated() démarré');

    this.typesExamenService.getTypesExamenPaginated(1, 10).subscribe({
      next: (response) => {
        console.log('✅ getTypesExamenPaginated() réussi:', response);
        this.typesExamen = response.data || [];
        this.status = `✅ Succès - ${this.typesExamen.length} types chargés (paginated)`;
      },
      error: (err) => {
        console.error('❌ getTypesExamenPaginated() échoué:', err);
        this.lastError = `Erreur: ${err.message || err.statusText || 'Erreur inconnue'}`;
        this.status = '❌ Échec - getTypesExamenPaginated()';
      }
    });
  }

  clearData(): void {
    this.typesExamen = [];
    this.status = 'Données effacées';
    this.lastError = '';
    console.log('🧹 Données effacées');
  }
}
