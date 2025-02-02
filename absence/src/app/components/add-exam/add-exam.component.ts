import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Examen } from 'src/app/models/Examen';
import { ExamenService } from 'src/app/services/examen.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-add-exam',
  templateUrl: './add-exam.component.html',
  styleUrls: ['./add-exam.component.css'],
})
export class AddExamComponent implements OnInit {
  @ViewChild('f') form!: NgForm;

  constructor(
    private router: Router,
    private examenService: ExamenService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {}

  goToImportScreen() {
    this.router.navigate(['/import-examens']);
  }

  validateForm(): boolean {
    if (
      !this.form.value.title ||
      !this.form.value.date ||
      !this.form.value.hour_debut ||
      !this.form.value.hour_fin ||
      !this.form.value.hour_debut_pointage ||
      !this.form.value.faculte ||
      !this.form.value.promotion ||
      !this.form.value.statut
    ) {
      this.toastr.error('Veuillez remplir tous les champs obligatoires');
      return false;
    }
    return true;
  }

  onSubmit(e: any) {
    if (!this.validateForm()) {
      return;
    }

    const examen = new Examen(
      this.form.value.title,
      this.form.value.date,
      this.form.value.hour_debut,
      this.form.value.hour_fin,
      this.form.value.hour_debut_pointage,
      this.form.value.faculte,
      this.form.value.promotion,
      this.form.value.statut
    );

    this.examenService.ajouter(examen).subscribe(
      (response) => {
        this.toastr.success('Examen ajouté avec succès');
        this.router.navigate(['examens-list']);
      },
      (error) => {
        this.toastr.error("Erreur lors de l'ajout de l'examen");
      }
    );
    // this.examenService.ajouter()
  }
}
