import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Examen } from 'src/app/models/Examen';
import { ExamenService } from 'src/app/services/examen.service';

@Component({
  selector: 'app-add-exam',
  templateUrl: './add-exam.component.html',
  styleUrls: ['./add-exam.component.css']
})
export class AddExamComponent implements OnInit {

  constructor(private router: Router, private examenService: ExamenService) { }

  ngOnInit(): void {
  }

  goToImportScreen() {
    this.router.navigate(['/import-examens']);
  }

  onSubmit(e: any) {
    const examen = new Examen(
      e.form.value.title,
      e.form.value.date,
      e.form.value.hour_debut,
      e.form.value.hour_fin,
      e.form.value.hour_debut_pointage,
      e.form.value.faculte,
      e.form.value.promotion,
      e.form.value.statut
    );

    this.examenService.ajouter(examen).subscribe(
      response => {
      console.log('Examen ajouté avec succès', response);
      },
      error => {
      console.error('Erreur lors de l\'ajout de l\'examen', error);
      }
    );
    // this.examenService.ajouter()
  }
}
