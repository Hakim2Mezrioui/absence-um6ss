import { CoursService } from 'src/app/services/cours.service';
import { Component, Input, OnInit } from '@angular/core';
import { Cours } from 'src/app/models/Cours';

@Component({
  selector: 'app-cours-item',
  templateUrl: './cours-item.component.html',
  styleUrls: ['./cours-item.component.css'],
})
export class CoursItemComponent implements OnInit {
  @Input('cours') cours!: Cours;
  statut: String = 'en cours';
  isLoading: Boolean = false;
  role: String = 'user';

  constructor(private coursService: CoursService) {}

  ngOnInit(): void {}

  onExplore(cours: Cours) {
    this.isLoading = true;
    this.coursService.coursExploring.next(cours);
    this.coursService
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
}
