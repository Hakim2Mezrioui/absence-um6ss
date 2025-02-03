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
  faculteActual: String = 'toutes';
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

    this.examenService.faculteActual.subscribe(
      (value) => (this.faculteActual = value)
    );

    this.examenService
      .fetchExamens(this.actualPage, this.statutActual, this.faculteActual)
      .subscribe((examens) => {
        this.examens = examens;
        console.log(examens);
      });
  }

  getPage(number: number) {
    let statut;
    let faculte;
    this.examenService.statutActual.subscribe((value) => (statut = value));
    this.examenService.faculteActual.subscribe((value) => (faculte = value));

    this.examenService
      .fetchExamens(number, statut, faculte)
      .subscribe((examens) => {
        this.examens = examens;
      });
  }
  filterByStatut(statut: String) {
    let faculte;
    this.examenService.faculteActual.subscribe((value) => (faculte = value));

    this.examenService.statutActual.next(statut);

    this.examenService.fetchExamens(1, statut, faculte).subscribe((examens) => {
      this.examens = examens;
    });
  }

  filterByFaculte(faculte: String) {
    let statut;
    this.examenService.statutActual.subscribe((value) => (statut = value));

    this.examenService.faculteActual.next(faculte);

    this.examenService.fetchExamens(1, statut, faculte).subscribe((examens) => {
      this.examens = examens;
    });
  }

  next() {
    let totalPage = 1;
    let statut;
    let faculte;

    this.examenService.statutActual.subscribe((value) => (statut = value));
    this.examenService.faculteActual.subscribe((value) => (faculte = value));

    this.examenService.totalPages.subscribe((value) => (totalPage = value));
    if (this.actualPage == this.totalPages) return;
    this.examenService
      .fetchExamens(this.actualPage + 1, statut, faculte)
      .subscribe((examens) => {
        this.examens = examens;
      });
  }

  back() {
    let statut;
    let faculte;

    this.examenService.statutActual.subscribe((value) => (statut = value));
    this.examenService.faculteActual.subscribe((value) => (faculte = value));

    if (this.actualPage == 1) return;
    this.examenService
      .fetchExamens(this.actualPage - 1, statut, faculte)
      .subscribe((examens) => {
        this.examens = examens;
      });
  }
}
