import { EtudiantService } from './../../services/etudiant.service';
import { Etudiant } from './../../models/Etudiant';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-etudiants',
  templateUrl: './etudiants.component.html',
  styleUrls: ['./etudiants.component.css'],
})
export class EtudiantsComponent implements OnInit {
  @ViewChild('inputFilter') inputerFilter!: ElementRef;
  @ViewChild('dt') dt!: Table;

  etudiants: Etudiant[] = [];

  constructor(private etudiantService: EtudiantService) {}

  ngOnInit(): void {
    this.etudiantService
      .fetch()
      .subscribe((etudiants) => (this.etudiants = etudiants));
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
}
