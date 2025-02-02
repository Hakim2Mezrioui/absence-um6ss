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
  actualPage: number = 1;
  statutActual: String = 'tous';
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
    this.examenService.actualPage.subscribe((value) => {
      this.actualPage = value;
    });

    this.examenService.statutActual.subscribe(
      (value) => (this.statutActual = value)
    );

    this.examenService
      .fetchExamens(this.actualPage, this.statutActual)
      .subscribe((examens) => {
        this.examens = examens;
        console.log(examens);
      });
  }

  getPage(number: number) {
    let statut;
    this.examenService.statutActual.subscribe((value) => (statut = value));

    this.examenService.fetchExamens(number, statut).subscribe((examens) => {
      this.examens = examens;
    });
  }
  filterByStatut(statut: String) {
    this.examenService.statutActual.next(statut);
    this.examenService.fetchExamens(1, statut).subscribe((examens) => {
      this.examens = examens;
    });
  }

  next() {
    let totalPage = 1;
    this.examenService.totalPages.subscribe((value) => (totalPage = value));
    if (this.actualPage == this.totalPages) return;
    this.examenService
      .fetchExamens(this.actualPage + 1)
      .subscribe((examens) => {
        this.examens = examens;
      });
  }

  back() {
    if (this.actualPage == 1) return;
    this.examenService
      .fetchExamens(this.actualPage - 1)
      .subscribe((examens) => {
        this.examens = examens;
      });
  }
}
