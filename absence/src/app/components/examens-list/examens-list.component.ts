import { Component, OnInit } from '@angular/core';
import { Examen } from 'src/app/models/Examen';
import { ExamenService } from 'src/app/services/examen.service';

@Component({
  selector: 'app-examens-list',
  templateUrl: './examens-list.component.html',
  styleUrls: ['./examens-list.component.css'],
})
export class ExamensListComponent implements OnInit {
  examens: Examen[] = [];
  totalPages: number = 0;
  isLoading!: boolean;
  constructor(private examenService: ExamenService) {}

  ngOnInit(): void {
    this.getExamens();
    this.examenService.totalPages.subscribe(
      (value) => (this.totalPages = value)
    );
    this.examenService.loading.subscribe((value) => (this.isLoading = value));
  }

  getExamens() {
    this.examenService.fetchExamens().subscribe((examens) => {
      this.examens = examens;
      console.log(examens);
    });
  }

  getPage(number: number) {
    this.examenService.fetchExamens(number).subscribe((examens) => {
      this.examens = examens;
    });
  }
  filterByStatut(statut: String) {
    this.examenService.fetchExamens(1, statut).subscribe((examens) => {
      this.examens = examens;
    });
  }
}
