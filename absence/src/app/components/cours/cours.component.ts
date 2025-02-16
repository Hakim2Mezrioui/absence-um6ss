import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { pipe } from 'rxjs';
import { Cours } from 'src/app/models/Cours';
import { CoursService } from 'src/app/services/cours.service';

@Component({
  selector: 'app-cours',
  templateUrl: './cours.component.html',
  styleUrls: ['./cours.component.css'],
})
export class CoursComponent implements OnInit {
  cours: Cours[] = [];
  loading: boolean = false;

  @ViewChild('inputFilter') inputerFilter!: ElementRef;
  @ViewChild('dt') dt!: Table;
  constructor(private coursService: CoursService) {}

  ngOnInit(): void {
    this.getCours();
  }

  getCours() {
    this.coursService.getAllCours().subscribe(
      (response) => {
        this.cours = response;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  handleSearch(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dt.filterGlobal(value, 'contains');
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
