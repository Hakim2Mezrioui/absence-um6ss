import { ExamenService } from 'src/app/services/examen.service';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { Etudiant } from 'src/app/models/Etudiant';
import { map, tap } from 'rxjs';
import { Table } from 'primeng/table';
import { Examen } from 'src/app/models/Examen';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { StartupService } from 'src/app/services/startup.service';
import { CoursService } from 'src/app/services/cours.service';
import { Cours } from 'src/app/models/Cours';
import { DatePipe } from '@angular/common';

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
  examen!: Examen | Cours;
  typeSuivi!: String;
  totalPresent: Number = 0;
  totalEtudiant: Number = 0;

  constructor(
    private http: HttpClient,
    private examenService: ExamenService,
    private coursService: CoursService,
    private toastr: ToastrService,
    private router: Router,
    private startupService: StartupService,
        private datePipe: DatePipe
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

    this.startupService.typeSuivi.subscribe(
      (value) => (this.typeSuivi = value)
    );
    if (this.typeSuivi === 'cours') {
      //
      this.coursService.localStudents.subscribe(
        (value) => (this.localStudents = value)
      );
      this.coursService.studiantsWithFaceId.subscribe(
        (value) => (this.studiantsWithFaceId = value)
      );
      this.coursService.coursExploring.subscribe(
        (value) => (this.examen = value)
      );
      //
    } else if (this.typeSuivi === 'examen') {
      //
      this.examenService.localStudents.subscribe(
        (value) => (this.localStudents = value)
      );
      this.examenService.studiantsWithFaceId.subscribe(
        (value) => (this.studiantsWithFaceId = value)
      );
      this.examenService.examenExploring.subscribe(
        (value) => (this.examen = value)
      );
      //
    }

    this.startupService.page.next(`Suivi ${this.examen.title}-${this.examen.promotion}-${this.typeSuivi == "examen" ? this.examen.date : this.formatDate(new Date(this.examen.date))}-${this.typeSuivi == "examen" ? this.examen.hour_debut : this.formatTime(this.examen.hour_debut)}-${this.typeSuivi == "examen" ? this.examen.hour_fin : this.formatTime(this.examen.hour_fin)}`);
    this.mettreAJourPresence();
    this.totalPresent = this.studiantsWithFaceId.length;
    this.totalEtudiant = this.localStudents.length;
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
    this.typeSuivi === 'examen' &&
      this.examenService
        .suivi({
          hour1: (this.examen as Examen).hour_debut_pointage.toString(),
          hour2: (this.examen as Examen).hour_fin.toString(),
          date: (this.examen as Examen).date.toString(),
          faculte: (this.examen as Examen).faculte,
          promotion: (this.examen as Examen).promotion,
        })
        .subscribe(
          (response: any) => {
            console.log(response.local_students);

            this.isLoading = false;
            this.studiantsWithFaceId = response.students_with_face_id;
            this.localStudents = response.local_students;
            this.totalPresent = this.studiantsWithFaceId.length;

            this.mettreAJourPresence();
            // console.log(this.studiantsWithFaceId);
            // this.examenService.localStudents.next(this.localStudents);
            // this.examenService.studiantsWithFaceId.next(this.studiantsWithFaceId);
            // this.router.navigate(['suivi-absence']);
          },
          (error) => {
            this.isLoading = false;
            this.toastr.error(
              'An error occurred while processing your request'
            );
          }
        );

    this.typeSuivi === 'cours' &&
      this.coursService
        .suivi({
          hour1: this.formatTime(
            this.subtractMinutes((this.examen as Cours).hour_debut, 30)
          ),
          hour2: this.formatTime(
            this.addMinutes(
              (this.examen as Cours).hour_debut,
              (this.examen as Cours).tolerance
            )
          ),
          date: (this.examen as Cours).date.toString(),
          faculte: (this.examen as Cours).faculte,
          promotion: (this.examen as Cours).promotion,
          groupe: (this.examen as Cours).groupe
        })
        .subscribe(
          (response: any) => {
            console.log(response.local_students);

            this.isLoading = false;
            this.studiantsWithFaceId = response.students_with_face_id;
            this.localStudents = response.local_students;
            this.totalPresent = this.studiantsWithFaceId.length;

            this.mettreAJourPresence();
            // console.log(this.studiantsWithFaceId);
            // this.examenService.localStudents.next(this.localStudents);
            // this.examenService.studiantsWithFaceId.next(this.studiantsWithFaceId);
            // this.router.navigate(['suivi-absence']);
          },
          (error) => {
            this.isLoading = false;
            this.toastr.error(
              'An error occurred while processing your request'
            );
          }
        );
  }

  formatTime(time: string | Date): string {
    if (!time) return '';

    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`; // Format "HH:mm"
  }

  formatDate(date: Date): string {
    console.log(this.datePipe.transform(date, 'dd/MM/yyyy'));
    return this.datePipe.transform(date, 'dd/MM/yyyy')!;
  }

  subtractMinutes(time: string | Date, minutes: number): Date {
    const date = new Date(time);
    date.setMinutes(date.getMinutes() - minutes);
    return date;
  }

  addMinutes(time: string | Date, minutes: number): Date {
    const date = new Date(time);
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }

  handleExport() {
    const filteredData = this.dt.filteredValue || this.localStudents;
    const csvData = this.convertToCSV(filteredData);
    this.downloadCSV(csvData, `${this.examen.title}-${this.examen.promotion}-${this.examen.date}-${this.examen.hour_debut}-${this.examen.hour_fin}.csv`);
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
