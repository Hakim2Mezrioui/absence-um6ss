import { CoursService } from 'src/app/services/cours.service';
import { Component, Input, OnInit } from '@angular/core';
import { Cours } from 'src/app/models/Cours';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-cours-item',
  templateUrl: './cours-item.component.html',
  styleUrls: ['./cours-item.component.css'],
})
export class CoursItemComponent implements OnInit {
  @Input('cours') course!: Cours;
  statut: String = 'en attente';
  isLoading: Boolean = false;
  role: String = 'user';

  constructor(private coursService: CoursService, private datePipe: DatePipe) {}

  ngOnInit(): void {}

  onExplore(cours: Cours) {
    this.isLoading = true;
    // this.coursService.coursExploring.next(cours);
    // this.coursService
    //   .suivi({
    //     hour1: examen.hour_debut_pointage.toString(),
    //     hour2: examen.hour_fin.toString(),
    //     date: examen.date.toString(),
    //     faculte: examen.faculte,
    //     promotion: examen.promotion,
    //   })
    //   .subscribe(
    //     (response: any) => {
    //       console.log(response.local_students);

    //       this.isLoading = false;
    //       this.studiantsWithFaceId = response.students_with_face_id;
    //       this.localStudents = response.local_students;
    //       // console.log(this.studiantsWithFaceId);
    //       this.examenService.localStudents.next(this.localStudents);
    //       this.examenService.studiantsWithFaceId.next(this.studiantsWithFaceId);
    //       this.router.navigate(['suivi-absence']);
    //     },
    //     (error) => {
    //       this.isLoading = false;
    //       this.toastr.error('An error occurred while processing your request');
    //     }
    //   );
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

  onDelete(id: Number) {}
  onUpdate(id: Number) {}
}
