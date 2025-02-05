import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Examen } from 'src/app/models/Examen';
import { ExamenService } from 'src/app/services/examen.service';
import { ToastrService } from 'ngx-toastr';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-add-exam',
  templateUrl: './add-exam.component.html',
  styleUrls: ['./add-exam.component.css'],
})
export class AddExamComponent implements OnInit {
  @ViewChild('f') form!: NgForm;
  loading: boolean = false;
  role: String = 'user';

  constructor(
    private router: Router,
    private examenService: ExamenService,
    private toastr: ToastrService,
    private startupService: StartupService
  ) {}

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
  }

  goToImportScreen() {
    this.router.navigate(['/import-examens']);
  }

  validateForm(): boolean {
    if (this.role != 'super-admin') {
      this.startupService.userFaculte.subscribe(
        (value) => (this.form.value.faculte = value)
      );
    }

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

    this.loading = true;

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
        this.loading = false;
        this.toastr.success('Examen ajouté avec succès');
        this.router.navigate(['examens-list']);
      },
      (error) => {
        this.loading = false;
        this.toastr.error("Erreur lors de l'ajout de l'examen");
      }
    );
    // this.examenService.ajouter()
  }
}
