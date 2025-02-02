import { Location } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Examen } from 'src/app/models/Examen';
import { ExamenService } from 'src/app/services/examen.service';

interface Statut {
  name: string;
  code: string;
}

@Component({
  selector: 'app-list-examen-item',
  templateUrl: './list-examen-item.component.html',
  styleUrls: ['./list-examen-item.component.css'],
})
export class ListExamenItemComponent implements OnInit {
  statut!: Statut[];
  selectedStatut!: Statut;

  @Input('examen') examen!: Examen;

  constructor(
    private router: Router,
    private examenService: ExamenService,
    private location: Location
  ) {}

  ngOnInit() {}

  onExplore() {
    this.router.navigate(['suivi-absence']);
  }

  convertTimeStringToDate(timeString: string): Date {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  onArchive(examen: Examen) {
    this.examenService.archiver(examen).subscribe((response) => {
      this.reloadCurrentRoute();
    });
  }
  onActiver(examen: Examen) {
    this.examenService.activer(examen).subscribe((response) => {
      this.reloadCurrentRoute();
    });
  }

  private reloadCurrentRoute() {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }
}
