import { StartupService } from 'src/app/services/startup.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Cours } from 'src/app/models/Cours';
import { CoursService } from 'src/app/services/cours.service';

@Component({
  selector: 'app-add-cours',
  templateUrl: './add-cours.component.html',
  styleUrls: ['./add-cours.component.css'],
})
export class AddCoursComponent implements OnInit {
  @ViewChild('f') form!: NgForm;
  loading: boolean = false;
  role: String = 'user';
  selectedFaculte!: String;
  constructor(
    private startupService: StartupService,
    private router: Router,
    private toastr: ToastrService,
    private coursService: CoursService
  ) {}

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
    this.startupService.page.next('Ajouter cours');
  }

  faculteChange(name: String) {
    this.selectedFaculte = name;
  }

  validateForm(): boolean {
    if (this.role != 'super-admin') {
      this.startupService.userFaculte.subscribe(
        (value) => (this.form.value.faculte = value)
      );
    }

    if (
      this.selectedFaculte === 'fsts' &&
      (this.form.value.option == null || this.form.value.option == '')
    ) {
      this.toastr.error('Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (
      !this.form.value.title ||
      !this.form.value.date ||
      !this.form.value.hour_debut ||
      !this.form.value.hour_fin ||
      !this.form.value.faculte ||
      !this.form.value.promotion
    ) {
      this.toastr.error('Veuillez remplir tous les champs obligatoires');
      return false;
    }
    return true;
  }

  onSubmit(e: any) {
    // this.examenService.ajouter()

    if (!this.validateForm()) {
      return;
    }

    const cours = {
      "title" :this.form.value.title,
      "date" :this.form.value.date,
      "hour_debut" :this.form.value.hour_debut,
      "hour_fin" :this.form.value.hour_fin,
      "faculte" :this.form.value.faculte,
      "promotion" :this.form.value.promotion,
      "groupe" :this.form.value.groupe,
      "option" :this.form.value.option ?? ''
    }


    this.coursService.addCours(cours).subscribe(
      (response) => {
        this.toastr.success('Cours ajouté avec succès');
        this.router.navigate(['/cours']);
        console.log(response);
      },
      (error) => {
        this.toastr.error("Erreur lors de l'ajout du cours");
      }
    );
  }

  goToImportScreen() {
    this.router.navigate(['/import-cours']);
  }
}
