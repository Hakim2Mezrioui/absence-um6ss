import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { StartupService } from '../../services/startup.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CoursService } from '../../services/cours.service';
import { Cours } from 'src/app/models/Cours';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-update-cours',
  templateUrl: './update-cours.component.html',
  styleUrls: ['./update-cours.component.css'],
  providers: [DatePipe],
})
export class UpdateCoursComponent implements OnInit {
  @ViewChild('f') form!: NgForm;
  loading: boolean = false;
  role: String = 'user';
  selectedFaculte!: String;
  id!: number;
  cours!: Cours;

  constructor(
    private startupService: StartupService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastr: ToastrService,
    private coursService: CoursService
  ) {}

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
    this.id = this.activatedRoute.snapshot.params['id'];

    this.loading = true;
    this.coursService.getCoursById(this.id).subscribe(
      (response: any) => {
        // this.examen.title = response.examen.title;
        // this.examen.date = response.examen.date;
        // this.examen.faculte = response.examen.faculte;
        // this.examen.hour_debut = response.examen.hour_debut;
        // this.examen.hour_fin = response.examen.hour_fin;
        // this.examen.promotion = response.examen.promotion;
        // this.examen.statut = response.examen.statut;

        this.cours = new Cours(
          response.title,
          response.date,
          response.hour_debut,
          response.hour_fin,
          response.faculte,
          response.promotion,
          response.groupe,
          response.options ?? '',
          response.id
        );
      },
      (error) => {
        console.log(error);
      },
      () => {
        console.log(this.cours);
        this.loading = false;
      }
    );
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

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Convertit au format "YYYY-MM-DD"
  }

  formatTime(time: string | Date): string {
    if (!time) return '';

    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`; // Format "HH:mm"
  }

  onSubmit(e: any) {
    // this.examenService.ajouter()

    if (!this.validateForm()) {
      return;
    }

    const cours = {
      title: this.form.value.title,
      date: this.form.value.date,
      hour_debut: this.form.value.hour_debut,
      hour_fin: this.form.value.hour_fin,
      faculte: this.form.value.faculte,
      promotion: this.form.value.promotion,
      groupe: this.form.value.groupe,
      option: this.form.value.option ?? '',
    };

    this.coursService.updateCours(this.id, cours).subscribe(
      (response) => {
        this.toastr.success('Cours modifié avec succès');
        this.router.navigate(['/cours']);
        console.log(response);
      },
      (error) => {
        this.toastr.error("Erreur lors de l'ajout du cours");
      }
    );
  }
}
