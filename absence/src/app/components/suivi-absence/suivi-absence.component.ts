import { ExamenService } from 'src/app/services/examen.service';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Etudiant } from 'src/app/models/Etudiant';
import { map, tap } from 'rxjs';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-suivi-absence',
  templateUrl: './suivi-absence.component.html',
  styleUrls: ['./suivi-absence.component.css']
})
export class SuiviAbsenceComponent implements OnInit {
  etudiants: Etudiant[] = [];
  @ViewChild('inputFilter') inputerFilter!: ElementRef;
  @ViewChild('dt') dt!: Table;

  localStudents: Etudiant[] = [];
  studiantsWithFaceId: Etudiant[] = [];

  constructor(private http: HttpClient, private examenService: ExamenService) { }

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

    this.examenService.localStudents.subscribe(value => this.localStudents = value);
  }

  handleSearch(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dt.filterGlobal(value, 'contains');
  }

  handleExport() {
    const filteredData = this.dt.filteredValue || this.etudiants;
    const csvData = this.convertToCSV(filteredData);
    this.downloadCSV(csvData, 'filtered_data.csv');
  }

  convertToCSV(data: any[]): string {
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
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
