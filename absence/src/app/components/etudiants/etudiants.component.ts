import { EtudiantService } from './../../services/etudiant.service';
import { Etudiant } from './../../models/Etudiant';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { StartupService } from 'src/app/services/startup.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-etudiants',
  templateUrl: './etudiants.component.html',
  styleUrls: ['./etudiants.component.css'],
})
export class EtudiantsComponent implements OnInit {
  @ViewChild('inputFilter') inputerFilter!: ElementRef;
  @ViewChild('dt') dt!: Table;

  etudiants: Etudiant[] = [];
  loading: boolean = false;

  role: String = 'user';
  userFaculte!: String;

  constructor(
    private etudiantService: EtudiantService,
    private startupService: StartupService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.etudiantService.fetch().subscribe((etudiants) => {
      this.etudiants = etudiants;
      this.loading = false;
    });
    this.startupService.page.next('Etudiants');

    this.startupService.role.subscribe((value) => (this.role = value));
    this.startupService.userFaculte.subscribe(
      (value) => (this.userFaculte = value)
    );
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

  onDelete(id: number) {
    this.etudiantService.delete(id).subscribe(
      (response) => {
        this.loading = false;
        this.toastr.success('Etudiant supprimé avec succès');
        this.reloadCurrentRoute();
      },
      (error) => {
        this.loading = false;
        this.toastr.error("Erreur lors de la suppression de l'étudiant");
      }
    );
  }

  private reloadCurrentRoute() {
    const currentUrl = this.router.url;
    this.router
      .navigateByUrl('/whitePage', { skipLocationChange: true })
      .then(() => {
        this.router.navigate([currentUrl]);
      });
  }
}
