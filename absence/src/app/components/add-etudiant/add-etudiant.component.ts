import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Etudiant } from 'src/app/models/Etudiant';
import { EtudiantService } from 'src/app/services/etudiant.service';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-add-etudiant',
  templateUrl: './add-etudiant.component.html',
  styleUrls: ['./add-etudiant.component.css'],
})
export class AddEtudiantComponent implements OnInit {
  @ViewChild('f') form!: NgForm;
  loading: boolean = false;
  role: String = 'user';
  selectedFaculte!: String;
  selectedFile: File | null = null;
  userFaculte!: String;

  constructor(
    private router: Router,
    private etudiantService: EtudiantService,
    private toastr: ToastrService,
    private startupService: StartupService
  ) {}

  ngOnInit(): void {
    this.startupService.page.next('Ajouter étudiant');
    this.startupService.role.subscribe((value) => (this.role = value));
    this.startupService.userFaculte.subscribe(
      (value) => (this.userFaculte = value)
    );
  }

  faculteChange(name: String) {
    this.selectedFaculte = name;
  }

  goToImportScreen() {
    this.router.navigate(['import-etudiants']);
  }

  validateData(): boolean {
    const formValues = this.form.value;
  
    // Vérification des champs obligatoires
    if (!formValues.name) {
      this.toastr.error('Le nom est obligatoire !', 'Erreur de Validation');
      return false;
    }
    if (!formValues.matricule) {
      this.toastr.error('Le matricule est obligatoire !', 'Erreur de Validation');
      return false;
    }
    if (!formValues.promotion) {
      this.toastr.error('La promotion est obligatoire !', 'Erreur de Validation');
      return false;
    }
    if (!formValues.faculte) {
      this.toastr.error('La faculté est obligatoire !', 'Erreur de Validation');
      return false;
    }
    if (!formValues.groupe) {
      this.toastr.error('Le groupe est obligatoire !', 'Erreur de Validation');
      return false;
    }
  
    // Validation spécifique pour le matricule
    if (formValues.matricule.toString().length < 6) {
      this.toastr.error(
        'Le matricule doit contenir au moins 6 caractères !', 
        'Erreur de Validation'
      );
      return false;
    }
  
    return true;
  }

  // onSubmit(e: any) {
  //   if (!this.validateData()) {
  //     return;
  //   }

  //   this.loading = true;
  //   const etudiant = new Etudiant(
  //     this.form.value.matricule,
  //     this.form.value.name,
  //     this.form.value.promotion,
  //     this.form.value.faculte,
  //     this.form.value.groupe,
  //     '',
  //     this.form.value.option
  //   );

  //   this.etudiantService.ajouter(etudiant).subscribe(
  //     (response) => {
  //       this.loading = false;
  //       this.toastr.success('Etudiant ajouté avec succès', 'Success');
  //       this.router.navigate(['etudiants']);
  //     },
  //     (error) => {
  //       this.loading = false;
  //       this.toastr.error("Erreur lors de l'ajout de l'etudiant", 'Error');
  //     }
  //   );
  // }

  onSubmit(e: any) {
    if (this.userFaculte) {
      this.form.value.faculte = this.userFaculte;
    }

    if (!this.validateData()) {
      return;
    }

    this.loading = true;

    const formData = new FormData();
    formData.append('matricule', this.form.value.matricule);
    formData.append('name', this.form.value.name);
    formData.append('promotion', this.form.value.promotion);
    formData.append('faculte', this.form.value.faculte);
    formData.append('groupe', this.form.value.groupe);
    formData.append('option', this.form.value.option);

    if (this.selectedFile) {
      formData.append('image', this.selectedFile, this.selectedFile.name);
    }

    // for (let pair of (formData as any).entries()) {
    //   console.log(pair[0] + ': ' + pair[1]);
    // }

    this.etudiantService.ajouter(formData).subscribe(
      (response) => {
        this.loading = false;
        this.toastr.success('Étudiant ajouté avec succès', 'Success');
        this.router.navigate(['etudiants']);
      },
      (error) => {
        this.loading = false;
        this.toastr.error("Erreur lors de l'ajout de l'étudiant", 'Error');
      }
    );
  }

  onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      this.selectedFile = fileInput.files[0];
      console.log('Fichier sélectionné:', this.selectedFile);
    }
  }
  
}
