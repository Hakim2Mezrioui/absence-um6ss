import { StartupService } from './../../services/startup.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { RattrapageService } from 'src/app/services/rattrapage.service';
import { ToastrService } from 'ngx-toastr';
import { Etudiant } from 'src/app/models/Etudiant';

@Component({
  selector: 'app-rattrapage',
  templateUrl: './rattrapage.component.html',
  styleUrls: ['./rattrapage.component.css'],
})
export class RattrapageComponent implements OnInit {
  @ViewChild('f') f: any;
  role: String = 'user';
  userFaculte!: String;

  isLoading: boolean = false;

  parametrage: String = '';

  studiantsWithFaceId: String[] = [];
  localStudents: Etudiant[] = [];

  constructor(
    private rattrapageSerice: RattrapageService,
    private toastr: ToastrService,
    private startupService: StartupService
  ) {}

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
    this.startupService.userFaculte.subscribe(
      (value) => (this.userFaculte = value)
    );
  }

  anneesUniversitaires = [
    { id: 1, annee: '2020/2021' },
    { id: 2, annee: '2021/2022' },
    { id: 3, annee: '2022/2023' },
    { id: 4, annee: '2023/2024' },
    { id: 5, annee: '2024/2025' },
  ];

  ecoles = [
    { id: 1, name: 'Pharmacie' },
    { id: 2, name: 'Medcine' },
    { id: 3, name: 'Dentaire' },
    { id: 4, name: 'Esgb' },
  ];

  promotions = [
    { id: 1, name: '1ere année' },
    { id: 2, name: '2eme année' },
    { id: 3, name: '3eme année' },
    { id: 4, name: '4eme année' },
    { id: 5, name: '5eme année' },
  ];

  onSubmit() {
    this.isLoading = true;
    this.rattrapageSerice.suivi(this.f.value).subscribe(
      (response: any) => {
        console.log(response.local_students);

        this.isLoading = false;
        this.studiantsWithFaceId = response.students_with_face_id;
        this.localStudents = response.local_students;
        
        this.mettreAJourPresence();
      },
      (error) => {
        this.isLoading = false;
        this.toastr.error('An error occurred while processing your request');
      }
    );
  }

  mettreAJourPresence() {
    this.localStudents.forEach((etudiant) => {
      return (etudiant.etatPresence = this.studiantsWithFaceId.includes(
        etudiant.matricule.toString()
      )
        ? 'P'
        : 'A');
    });
  }

  handlePromotion(e: Event) {
    console.log((e.target as HTMLSelectElement).value);
  }

  async onFileSelected(event: Event) {
    let faculte = this.userFaculte;
    if (this.role == 'super-admin') {
      faculte = this.f.value.faculte;
    }
    console.log(faculte);
    if (faculte === '' || faculte === undefined) {
      this.toastr.error(
        'Vous devez sélectionner une faculté avant de continuer'
      );
      return;
    }

    this.isLoading = true;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      const formData = new FormData();
      formData.append('file', file, file.name);
      this.rattrapageSerice.importer(formData, faculte).subscribe(
        (response) => {
          this.isLoading = false;
          this.toastr.success('The file uploaded successfully');
        },
        (error) => {
          this.isLoading = false;
          this.toastr.error('There was an error uploading the file');
          console.log('warning');
        }
      );
    }

    input.value = '';
  }
}
