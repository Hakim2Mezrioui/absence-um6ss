import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';

@Component({
  selector: 'app-test-types-examen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <h3>Test des Types d'Examen</h3>
      
      <div class="row">
        <div class="col-md-6">
          <h4>Méthode getAllTypesExamen()</h4>
          <button class="btn btn-primary mb-3" (click)="testGetAll()">Tester getAllTypesExamen</button>
          
          <div *ngIf="loading" class="alert alert-info">Chargement...</div>
          <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
          
          <div *ngIf="typesExamen.length > 0" class="mt-3">
            <h5>Types d'examen trouvés ({{ typesExamen.length }})</h5>
            <ul class="list-group">
              <li *ngFor="let type of typesExamen" class="list-group-item">
                ID: {{ type.id }} - Nom: {{ type.name }}
              </li>
            </ul>
          </div>
        </div>
        
        <div class="col-md-6">
          <h4>Méthode getTypesExamenPaginated()</h4>
          <button class="btn btn-success mb-3" (click)="testGetPaginated()">Tester getTypesExamenPaginated</button>
          
          <div *ngIf="loadingPaginated" class="alert alert-info">Chargement...</div>
          <div *ngIf="errorPaginated" class="alert alert-danger">{{ errorPaginated }}</div>
          
          <div *ngIf="typesExamenPaginated.length > 0" class="mt-3">
            <h5>Types d'examen paginés ({{ typesExamenPaginated.length }})</h5>
            <ul class="list-group">
              <li *ngFor="let type of typesExamenPaginated" class="list-group-item">
                ID: {{ type.id }} - Nom: {{ type.name }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TestTypesExamenComponent implements OnInit {
  typesExamen: TypeExamen[] = [];
  typesExamenPaginated: TypeExamen[] = [];
  loading = false;
  loadingPaginated = false;
  error = '';
  errorPaginated = '';

  constructor(private typesExamenService: TypesExamenService) {}

  ngOnInit(): void {
    // Charger automatiquement au démarrage
    this.testGetAll();
  }

  testGetAll(): void {
    this.loading = true;
    this.error = '';
    this.typesExamen = [];

    this.typesExamenService.getAllTypesExamen().subscribe({
      next: (types) => {
        this.typesExamen = types;
        this.loading = false;
        console.log('Types d\'examen chargés avec getAllTypesExamen:', types);
      },
      error: (err) => {
        this.error = `Erreur: ${err.message || 'Erreur inconnue'}`;
        this.loading = false;
        console.error('Erreur getAllTypesExamen:', err);
      }
    });
  }

  testGetPaginated(): void {
    this.loadingPaginated = true;
    this.errorPaginated = '';
    this.typesExamenPaginated = [];

    this.typesExamenService.getTypesExamenPaginated(1, 10).subscribe({
      next: (response) => {
        this.typesExamenPaginated = response.data;
        this.loadingPaginated = false;
        console.log('Types d\'examen paginés chargés:', response);
      },
      error: (err) => {
        this.errorPaginated = `Erreur: ${err.message || 'Erreur inconnue'}`;
        this.loadingPaginated = false;
        console.error('Erreur getTypesExamenPaginated:', err);
      }
    });
  }
}
