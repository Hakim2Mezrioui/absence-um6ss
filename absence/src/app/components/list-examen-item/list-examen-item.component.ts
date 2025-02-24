import { Location } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Etudiant } from 'src/app/models/Etudiant';
import { Examen } from 'src/app/models/Examen';
import { ExamenService } from 'src/app/services/examen.service';
import { RattrapageService } from 'src/app/services/rattrapage.service';
import { StartupService } from 'src/app/services/startup.service';
import Swal from 'sweetalert2';

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
  role: String = 'user';
  page!: String;

  @Input('examen') examen!: Examen;

  constructor(
    private router: Router,
    private examenService: ExamenService,
    private location: Location,
    private toastr: ToastrService,
    private startupService: StartupService
  ) {}

  ngOnInit() {
    this.startupService.role.subscribe((value) => (this.role = value));
    this.startupService.page.next('Examen list');
  }

  onExplore(examen: Examen) {
    this.startupService.typeSuivi.next('examen');
    this.isLoading = true;
    this.examenService.examenExploring.next(examen);
    this.examenService
      .suivi({
        // hour1: examen.hour_debut_pointage.toString(),
        // hour2: examen.hour_fin.toString(),
        hour1: examen.hour_debut_pointage
          ? examen.hour_debut_pointage.toString()
          : '',
        hour2: examen.hour_fin ? examen.hour_fin.toString() : '',
        date: examen.date.toString(),
        faculte: examen.faculte,
        promotion: examen.promotion,
      })
      .subscribe(
        (response: any) => {
          this.isLoading = false;
          this.studiantsWithFaceId = response.students_with_face_id;
          this.localStudents = response.local_students;
          // console.log(this.studiantsWithFaceId);
          this.examenService.localStudents.next(this.localStudents);
          this.examenService.studiantsWithFaceId.next(this.studiantsWithFaceId);
          this.router.navigate(['suivi-absence']);
        },
        (error) => {
          this.isLoading = false;
          this.toastr.error('An error occurred while processing your request');
        }
      );
  }

  formatTime(time: string | Date): string {
    if (!time) return '';

    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`; // Format "HH:mm"
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

  async onDelete(id: number) {
    const response = await Swal.fire({
      title: '',
      text: 'Vous êtes sûr!',
      icon: 'info',
      showCancelButton: true,
    });
    if (!response.isConfirmed) {
      return;
    }

    this.examenService.delete(id).subscribe(
      (response) => {
        this.isLoading = false;
        this.toastr.success('Examen supprimé avec succès');
        this.reloadCurrentRoute();
      },
      (error) => {
        this.isLoading = false;
        this.toastr.error("Erreur lors de la suppression de l'examen");
      }
    );
  }

  onUpdate(id: number) {
    this.router.navigate([`update-exam/${id}`]);
  }
}
