import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Etudiant } from 'src/app/models/Etudiant';
import { EtudiantService } from 'src/app/services/etudiant.service';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-add-etudiant',
  templateUrl: './add-etudiant.component.html',
  styleUrls: ['./add-etudiant.component.css'],
})
export class AddEtudiantComponent implements OnInit {
  @ViewChild('f') form!: NgForm;
  loading: boolean = false;

  constructor(
    private router: Router,
    private etudiantService: EtudiantService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {}

  goToImportScreen() {
    this.router.navigate(['import-etudiants']);
  }

  validateData(): boolean {
    if (
      !this.form.value.name ||
      !this.form.value.matricule ||
      !this.form.value.promotion ||
      !this.form.value.faculte
    ) {
      this.toastr.error('All fields are required!', 'Validation Error');
      return false;
    }
    if (this.form.value.matricule.toString().length < 6) {
      this.toastr.error(
        'Matricule must be at least 6 characters long!',
        'Validation Error'
      );
      return false;
    }
    return true;
  }

  onSubmit(e: any) {
    if (!this.validateData()) {
      return;
    }
    this.loading = true;
    const etudiant = new Etudiant(
      this.form.value.matricule,
      this.form.value.name,
      this.form.value.promotion,
      this.form.value.faculte
    );

    this.etudiantService.ajouter(etudiant).subscribe(
      (response) => {
        this.loading = false;
        this.toastr.success('Etudiant ajouté avec succès', 'Success');
        this.router.navigate(['examens-list']);
      },
      (error) => {
        this.loading = false;
        this.toastr.error("Erreur lors de l'ajout de l'etudiant", 'Error');
      }
    );
  }
}
