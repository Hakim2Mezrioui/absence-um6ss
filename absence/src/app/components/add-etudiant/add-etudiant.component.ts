import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Etudiant } from 'src/app/models/Etudiant';
import { EtudiantService } from 'src/app/services/etudiant.service';

@Component({
  selector: 'app-add-etudiant',
  templateUrl: './add-etudiant.component.html',
  styleUrls: ['./add-etudiant.component.css'],
})
export class AddEtudiantComponent implements OnInit {
  constructor(
    private router: Router,
    private etudiantService: EtudiantService
  ) {}

  ngOnInit(): void {}

  goToImportScreen() {
    this.router.navigate(['import-etudiants']);
  }

  onSubmit(e: any) {
    const etudiant = new Etudiant(
      e.form.value.matricule,
      e.form.value.name,
      e.form.value.promotion,
      e.form.value.faculte
    );

    this.etudiantService.ajouter(etudiant).subscribe(
      response => {
      console.log('Etudiant ajouté avec succès', response);
      },
      error => {
      console.error('Erreur lors de l\'ajout de l\'etudiant', error);
      }
    );
  }
}
