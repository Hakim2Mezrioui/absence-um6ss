import { Location } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Etudiant } from 'src/app/models/Etudiant';
import { Examen } from 'src/app/models/Examen';
import { ExamenService } from 'src/app/services/examen.service';
import { RattrapageService } from 'src/app/services/rattrapage.service';

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
  isLoading: boolean = false;
  studiantsWithFaceId: String[] = [];
  localStudents: Etudiant[] = [];

  @Input('examen') examen!: Examen;

  constructor(
    private router: Router,
    private examenService: ExamenService,
    private location: Location,
    private toastr: ToastrService
  ) {}

  ngOnInit() {}

  onExplore(examen: Examen) {
    // console.log(examen);
    // this.router.navigate(['suivi-absence']);
    this.examenService
      .suivi({
        hour1: examen.hour_debut_pointage.toString(),
        hour2: examen.hour_fin.toString(),
        date: examen.date.toString(),
        faculte: examen.faculte,
        promotion: examen.promotion,
      })
      .subscribe(
        (response: any) => {
          console.log(response.local_students);

          this.isLoading = false;
          // this.studiantsWithFaceId = response.students_with_face_id;
          this.localStudents = response.local_students;
          // console.log(this.studiantsWithFaceId);
          this.examenService.localStudents.next(this.localStudents);
          this.router.navigate(['suivi-absence']);
        },
        (error) => {
          this.isLoading = false;
          this.toastr.error('An error occurred while processing your request');
        }
      );
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
    this.router
      .navigateByUrl('/whitePage', { skipLocationChange: true })
      .then(() => {
        this.router.navigate([currentUrl]);
      });
  }
}
