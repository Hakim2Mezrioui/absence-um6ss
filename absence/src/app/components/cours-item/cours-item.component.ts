import { CoursService } from 'src/app/services/cours.service';
import { Component, Input, OnInit } from '@angular/core';
import { Cours } from 'src/app/models/Cours';
import { DatePipe } from '@angular/common';
import { StartupService } from 'src/app/services/startup.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { Etudiant } from 'src/app/models/Etudiant';

@Component({
  selector: 'app-cours-item',
  templateUrl: './cours-item.component.html',
  styleUrls: ['./cours-item.component.css'],
})
export class CoursItemComponent implements OnInit {
  @Input('cours') course!: Cours;
  statut: String = 'en attente';
  isLoading: Boolean = false;
  studiantsWithFaceId: String[] = [];
  localStudents: Etudiant[] = [];
  role: String = 'user';

  constructor(
    private router: Router,
    private coursService: CoursService,
    private datePipe: DatePipe,
    private startupService: StartupService,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
  }

  onExplore(cours: Cours) {
    this.startupService.typeSuivi.next('cours');
    this.isLoading = true;
    this.coursService.coursExploring.next(cours);
    this.coursService
      .suivi({
        // hour1: this.formatTime(cours.hour_debut.toString()),
        // hour2: this.formatTime(cours.hour_debut.toString()),
        hour1: this.formatTime(this.subtractMinutes(cours.hour_debut, 30)),
        hour2: this.formatTime(
          this.addMinutes(cours.hour_debut, cours.tolerance)
        ),
        date: cours.date.toString(),
        faculte: cours.faculte,
        promotion: cours.promotion,
        groupe: cours.groupe,
      })
      .subscribe(
        (response: any) => {
          console.log(response);

          this.isLoading = false;
          this.studiantsWithFaceId = response.students_with_face_id;
          this.localStudents = response.local_students;
          // console.log(this.studiantsWithFaceId);
          this.coursService.localStudents.next(this.localStudents);
          this.coursService.studiantsWithFaceId.next(this.studiantsWithFaceId);
          this.router.navigate(['suivi-absence']);
        },
        (error) => {
          this.isLoading = false;
          this.toast.error('An error occurred while processing your request');
        }
      );
  }

  isCourseActive(): boolean {
    if (!this.course) return false;

    const now = new Date();
    const courseDate = new Date(this.course.date);

    // Vérifier si la date du cours correspond à aujourd'hui
    if (
      now.getFullYear() !== courseDate.getFullYear() ||
      now.getMonth() !== courseDate.getMonth() ||
      now.getDate() !== courseDate.getDate()
    ) {
      return false;
    }

    // Forcer la conversion des heures si nécessaire
    const startTime =
      this.course.hour_debut instanceof Date
        ? this.course.hour_debut
        : new Date(`1970-01-01T${this.course.hour_debut}`);

    const endTime =
      this.course.hour_fin instanceof Date
        ? this.course.hour_fin
        : new Date(`1970-01-01T${this.course.hour_fin}`);

    return now >= startTime && now <= endTime;
  }

  isCoursPasEncoreCommence(): boolean {
    const now = new Date();

    // Ensure `course.date` is a Date object
    const courseDate = new Date(this.course.date);

    // Convert `course.hour_debut` to Date if it's a string
    let startDateTime = new Date(courseDate);
    if (typeof this.course.hour_debut === 'string') {
      // If it's a string, parse it and set the time
      const [hours, minutes] = this.course.hour_debut.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);
    } else if (this.course.hour_debut instanceof Date) {
      // If it's already a Date, use the time directly
      startDateTime.setHours(
        this.course.hour_debut.getHours(),
        this.course.hour_debut.getMinutes(),
        0,
        0
      );
    }

    // Check if the current time is before the start time (course has not started yet)
    return now < startDateTime;
  }

  getCoursStatusClass(): string {
    if (this.isCoursPasEncoreCommence()) {
      this.statut = 'en attente';
      return 'bg-slate-100'; // Le cours n'a pas encore commencé
    } else if (this.isCourseActive()) {
      this.statut = 'en cours';
      return 'bg-green-100'; // Le cours est en cours
    } else {
      this.statut = 'terminé';
      return 'bg-red-100'; // Le cours est terminé
    }
  }

  // Format date using DatePipe
  formatDate(date: Date): string {
    console.log(this.datePipe.transform(date, 'dd/MM/yyyy'));
    return this.datePipe.transform(date, 'dd/MM/yyyy')!;
  }

  formatTime(time: string | Date): string {
    if (!time) return '';

    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`; // Format "HH:mm"
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

    this.coursService.deleteCours(id).subscribe(
      (value) => {
        this.isLoading = false;
        this.toast.success('Cours supprimé avec succès');
        this.reloadCurrentRoute();
      },
      (error) => {
        this.isLoading = false;
        this.toast.error('Erreur lors de la suppression du cours');
      }
    );
  }

  subtractMinutes(time: string | Date, minutes: number): Date {
    const date = new Date(time);
    date.setMinutes(date.getMinutes() - minutes);
    return date;
  }

  // ✅ Fonction pour ajouter des minutes
  addMinutes(time: string | Date, minutes: number): Date {
    const date = new Date(time);
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }

  onUpdate(id: number) {
    this.router.navigate([`update-cours/${id}`]);
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
