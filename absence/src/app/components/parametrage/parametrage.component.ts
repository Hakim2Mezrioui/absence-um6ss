import { Component, OnInit, ViewChild } from '@angular/core';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-parametrage',
  templateUrl: './parametrage.component.html',
  styleUrls: ['./parametrage.component.css'],
})
export class ParametrageComponent implements OnInit {
  constructor(private startupService: StartupService) {}

  ngOnInit(): void {
    this.startupService.page.next('Parametrage');
  }

  @ViewChild('f') f: any;

  parametrage: String = '';

  anneesUniversitaires = [
    { id: 1, annee: '2020/2021' },
    { id: 2, annee: '2021/2022' },
    { id: 3, annee: '2022/2023' },
    { id: 4, annee: '2023/2024' },
    { id: 5, annee: '2024/2025' },
  ];

  ecoles = [
    { id: 1, name: 'Pharmacie' },
    { id: 2, name: 'medecine' },
    { id: 3, name: 'Dentaire' },
    { id: 4, name: 'Esgb' },
  ];

  promotions = [
    { id: 1, name: '1ere année' },
    { id: 2, name: '2eme année' },
    { id: 3, name: '3eme année' },
    { id: 4, name: '4eme année' },
    { id: 5, name: '5eme année' },
  ];

  onSubmit() {
    console.log(this.f.value);
  }

  handlePromotion(e: Event) {
    console.log((e.target as HTMLSelectElement).value);
  }
}
