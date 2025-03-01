import { HttpClient } from '@angular/common/http';
import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  enableProdMode,
} from '@angular/core';
import { Table } from 'primeng/table';
import { map, tap } from 'rxjs';
import { Etudiant } from 'src/app/models/Etudiant';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-list-presence',
  templateUrl: './list-presence.component.html',
  styleUrls: ['./list-presence.component.css'],
})
export class ListPresenceComponent implements OnInit {
  // etudiants: Etudiant[] = [];
  @ViewChild('inputFilter') inputerFilter!: ElementRef;
  @ViewChild('dt') dt!: Table;

  constructor(
    private http: HttpClient,
    private startupService: StartupService
  ) {}

  @Input('promotion') promotion!: String;

  @Input('etudiants') etudiants: Etudiant[] = [];
  @Input('studiantsWithFaceId') studiantsWithFaceId: String[] = [];
  role: String = 'user';

  @Input('totalPresent') totalPresent: Number = 0;
  @Input('totalEtudiant') totalEtudiant: Number = 0;

  // totalPresent: Number = 0;
  // totalEtudiant: Number = 0;

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

    this.startupService.role.subscribe((value) => (this.role = value));
    this.mettreAJourPresence();

    // this.totalPresent = this.studiantsWithFaceId.length;
    // this.totalEtudiant = this.etudiants.length;
  }

  checkEtudiantMatricule(matricule: String): boolean {
    // return this.studiantsWithFaceId.includes(matricule.toString());
    const present = this.studiantsWithFaceId.includes(matricule.toString());

    // Mise à jour de l'état de présence de l'étudiant correspondant
    const etudiant = this.etudiants.find((e) => e.matricule === matricule);
    if (etudiant) {
      etudiant.etatPresence = present ? 'P' : 'A';
    }

    return present;
  }

  mettreAJourPresence() {
    this.etudiants.forEach((etudiant) => {
      return (etudiant.etatPresence = this.studiantsWithFaceId.includes(
        etudiant.matricule.toString()
      )
        ? 'P'
        : 'A');
    });
  }

  clear(table: Table) {
    table.clear();
    this.inputerFilter.nativeElement.value = '';
  }

  applyFilterGlobal($event: Event, stringVal: string) {
    const inputElement = $event.target as HTMLInputElement;
    this.dt.filterGlobal(inputElement.value, stringVal);
  }

  handleChange(e: Event) {
    // const value = (e.target as HTMLInputElement).value;
    // this.dt.filter(value, 'name', 'contains');
  }

  handleSearch(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dt.filterGlobal(value, 'contains');
  }

  handleFilter(e: Event) {
    const value = (e.target as HTMLInputElement).value;
  }

  handleExport() {
    const filteredData = this.dt.filteredValue || this.etudiants;
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
