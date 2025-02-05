import { ExamenService } from 'src/app/services/examen.service';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { Etudiant } from 'src/app/models/Etudiant';
import { map, tap } from 'rxjs';
import { Table } from 'primeng/table';
import { Examen } from 'src/app/models/Examen';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-suivi-absence',
  templateUrl: './suivi-absence.component.html',
  styleUrls: ['./suivi-absence.component.css'],
})
export class SuiviAbsenceComponent implements OnInit {
  etudiants: Etudiant[] = [];
  @ViewChild('inputFilter') inputerFilter!: ElementRef;
  @ViewChild('dt') dt!: Table;

  localStudents: Etudiant[] = [];
  studiantsWithFaceId: String[] = [];
  isLoading: boolean = false;
  examen!: Examen;

  constructor(
    private http: HttpClient,
    private examenService: ExamenService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // this.http
    //   .get('assets/core/etudiants.json', { responseType: 'text' })
    //   .pipe(
    //     map((data: any) => {
    //       return JSON.parse(data).map(
    //         (etudiant: any) =>
    //           ({
    //             matricule: etudiant.matricule,
    //             name: etudiant.name,
    //             faculte: etudiant.faculte,
    //             promotion: etudiant.promotion,
    //           } as Etudiant)
    //       );
    //     }),
    //     tap((etudiants: Etudiant[]) => {
    //       this.etudiants = etudiants;
    //     })
    //   )
    //   .subscribe(() => {
    //     // console.log(this.etudiants);
    //   });

    this.examenService.localStudents.subscribe(
      (value) => (this.localStudents = value)
    );
    this.examenService.studiantsWithFaceId.subscribe(
      (value) => (this.studiantsWithFaceId = value)
    );
    this.examenService.examenExploring.subscribe(
      (value) => (this.examen = value)
    );
    // this.mettreAJourPresence();
  }

  handleSearch(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dt.filterGlobal(value, 'contains');
  }

  checkEtudiantMatricule(matricule: String): boolean {
    return this.studiantsWithFaceId.includes(matricule.toString());
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

  recharger() {
    this.isLoading = true;
    this.examenService
      .suivi({
        hour1: this.examen.hour_debut_pointage.toString(),
        hour2: this.examen.hour_fin.toString(),
        date: this.examen.date.toString(),
        faculte: this.examen.faculte,
        promotion: this.examen.promotion,
      })
      .subscribe(
        (response: any) => {
          console.log(response.local_students);

          this.isLoading = false;
          this.studiantsWithFaceId = response.students_with_face_id;
          this.localStudents = response.local_students;

          // console.log(this.studiantsWithFaceId);
          // this.examenService.localStudents.next(this.localStudents);
          // this.examenService.studiantsWithFaceId.next(this.studiantsWithFaceId);
          // this.router.navigate(['suivi-absence']);
        },
        (error) => {
          this.isLoading = false;
          this.toastr.error('An error occurred while processing your request');
        }
      );
      this.mettreAJourPresence();
  }

  handleExport() {
    const filteredData = this.dt.filteredValue || this.localStudents;
    const csvData = this.convertToCSV(filteredData);
    this.downloadCSV(csvData, 'filtered_data.csv');
  }

  convertToCSV(data: any[]): string {
    const header = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).join(','));
    return [header, ...rows].join('\n');
  }

  downloadCSV(csvData: string, filename: string) {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
