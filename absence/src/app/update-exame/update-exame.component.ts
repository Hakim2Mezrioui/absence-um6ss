import { AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ExamenService } from '../services/examen.service';
import { StartupService } from '../services/startup.service';
import { NgForm } from '@angular/forms';
import { Examen } from '../models/Examen';

@Component({
  selector: 'app-update-exame',
  templateUrl: './update-exame.component.html',
  
  styleUrls: ['./update-exame.component.css'],
})
export class UpdateExameComponent implements OnInit {
  loading: boolean = false;
  role: String = 'user';
  examen!: Examen;
  id!: number;
  @ViewChild('f') form!: NgForm;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastr: ToastrService,
    private examenService: ExamenService,
    private startupService: StartupService
  ) {}

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
    this.id = this.activatedRoute.snapshot.params['id'];
    // id = this.activatedRoute.snapshot.params['id'];
    this.loading = true;
    this.examenService.fetchExam(this.id).subscribe(
      (response: any) => {
        // this.examen.title = response.examen.title;
        // this.examen.date = response.examen.date;
        // this.examen.faculte = response.examen.faculte;
        // this.examen.hour_debut = response.examen.hour_debut;
        // this.examen.hour_fin = response.examen.hour_fin;
        // this.examen.promotion = response.examen.promotion;
        // this.examen.statut = response.examen.statut;
        
        this.examen = new Examen(
          response.examen.title,
          response.examen.date,
          response.examen.hour_debut,
          response.examen.hour_fin,
          response.examen.hour_debut_pointage,
          response.examen.faculte,
          response.examen.promotion,
          response.examen.statut
        );

      },
      (error) => {
        console.log(error);
      },
      () => {
        this.loading = false;
      }
    );
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

  onSubmit() {
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
    this.examenService.update(examen, this.id).subscribe(
      (response) => {
        this.loading = false;
        this.toastr.success('Examen modifié avec succès');
        this.router.navigate(['examens-list']);
      },
      (error) => {
        this.loading = false;
        this.toastr.error("Erreur lors de la modification de l'examen");
      }
    );
  }
}
