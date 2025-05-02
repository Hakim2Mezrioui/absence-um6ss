import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { pipe } from 'rxjs';
import { Cours } from 'src/app/models/Cours';
import { CoursService } from 'src/app/services/cours.service';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-cours',
  templateUrl: './cours.component.html',
  styleUrls: ['./cours.component.css'],
})
export class CoursComponent implements OnInit {
  cours: Cours[] = [];
  loading: boolean = false;
  role: String = 'user';
  actualPage: number = 1;
  faculteActual: String = 'toutes';
  userFaculte: String = 'toutes';
  searchVal: String = '';
  totalPages: number = 1;

  @ViewChild('inputFilter') inputerFilter!: ElementRef;
  @ViewChild('dt') dt!: Table;
  constructor(
    private coursService: CoursService,
    private startupService: StartupService
  ) {}

  isDropdownOpen = false;

  faculties = [
    { label: 'Pharmacie', value: 'pharmacie' },
    { label: 'Dentaire', value: 'dentaire' },
    { label: 'ESGB', value: 'esgb' },
    { label: 'Médecine', value: 'medecine' },
    { label: 'FSTS', value: 'fsts' },
    { label: 'Toutes les facultés', value: 'toutes' }
  ];

  trackById(index: number, item: any): number {
    return item.id || index;
  }

toggleDropdown() {
  this.isDropdownOpen = !this.isDropdownOpen;
}

getVisiblePages(): number[] {
  const visiblePages = [];
  const startPage = Math.max(1, this.actualPage - 1);
  const endPage = Math.min(this.totalPages, this.actualPage + 1);

  for (let i = startPage; i <= endPage; i++) {
    visiblePages.push(i);
  }

  return visiblePages;
}


  ngOnInit(): void {
    this.startupService.userFaculte.subscribe((value) => {
      if (value == null) {
        return;
      }
      this.coursService.faculteActual.next(value);
      this.userFaculte = value;
    });
    this.coursService.totalPages.subscribe((value) => {
      this.totalPages = value;
    });

    this.startupService.role.subscribe((value) => (this.role = value));

    this.getCours();
    this.startupService.page.next('les Courses');
  }

  getCours() {
    this.loading = true;
    this.coursService.actualPage.subscribe((value) => {
      this.actualPage = value;
    });

    this.faculteActual = this.userFaculte;
    if (this.userFaculte == null) {
      this.coursService.faculteActual.subscribe(
        (value) => (this.faculteActual = value)
      );
    }

    this.coursService.searchValue.subscribe(
      (value) => (this.searchVal = value)
    );

    this.coursService
      .getAllCours(1, this.faculteActual, this.searchVal)
      .subscribe(
        (response: any) => {
          this.cours = response;
          this.loading = false;
        },
        (error) => {
          this.loading = false;
          console.log(error);
        }
      );
  }

  handleSearch(value: String) {
    this.coursService.searchValue.next(value);
    this.coursService.actualPage.next(1);
    this.getCours();
  }

  // filterByStatut(statut: String) {
  //   let faculte;
  //   this.coursService.faculteActual.subscribe((value) => (faculte = value));

  //   this.coursService.statutActual.next(statut);

  //   this.coursService.getAllCours(1, statut, faculte).subscribe((cours) => {
  //     this.cours = cours;
  //   });
  // }

  filterByFaculte(faculte: String) {
    let statut;
    // this.coursService.statutActual.subscribe((value) => (statut = value));

    this.coursService.faculteActual.next(faculte);

    this.coursService
      .getAllCours(1, faculte, this.searchVal)
      .subscribe((cours) => {
        this.cours = cours;
      });
  }

  getPage(number: number) {
    let statut;
    let faculte;
    let valueSearch;
    this.coursService.statutActual.subscribe((value) => (statut = value));
    this.coursService.faculteActual.subscribe((value) => (faculte = value));
    this.coursService.searchValue.subscribe((value) => (valueSearch = value));
    this.coursService.actualPage.next(number);

    this.coursService
      .getAllCours(number, faculte, valueSearch)
      .subscribe((cours) => {
        this.cours = cours;
      });
  }

  next() {
    let totalPage = 1;
    let faculte;
    let valueSearch;

    this.coursService.faculteActual.subscribe((value) => (faculte = value));
    this.coursService.searchValue.subscribe((value) => (valueSearch = value));
    this.coursService.totalPages.subscribe((value) => (totalPage = value));

    if (this.actualPage == this.totalPages) return;
    this.coursService
      .getAllCours(this.actualPage + 1, faculte, valueSearch)
      .subscribe((cours) => {
        this.cours = cours;
      });
  }

  back() {
    let faculte;
    let valueSearch;

    this.coursService.faculteActual.subscribe((value) => (faculte = value));
    this.coursService.searchValue.subscribe((value) => (valueSearch = value));

    if (this.actualPage == 1) return;
    this.coursService
      .getAllCours(this.actualPage - 1, faculte, valueSearch)
      .subscribe((cours) => {
        this.cours = cours;
      });
  }

  handleExport() {
    const filteredData = this.dt.filteredValue || this.cours;
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
