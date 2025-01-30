import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ImportStudentsComponent } from './components/import-students/import-students.component';
import { AddExamComponent } from './components/add-exam/add-exam.component';
import { AddEtudiantComponent } from './components/add-etudiant/add-etudiant.component';
import { ListExamenItemComponent } from './components/list-examen-item/list-examen-item.component';
import { ExamensListComponent } from './components/examens-list/examens-list.component';
import { AuthticatedLayoutComponent } from './components/authticated-layout/authticated-layout.component';
import { SuiviAbsenceComponent } from './components/suivi-absence/suivi-absence.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { RattrapageComponent } from './components/rattrapage/rattrapage.component';

const routes: Routes = [
  {
    pathMatch: 'full',
    path: '',
    redirectTo: 'login',
  },
  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: '',
    component: AuthticatedLayoutComponent,
    children: [
      {
        path: 'rattrapage',
        component: RattrapageComponent,
      },
      {
        path: 'import-etudiants',
        component: ImportStudentsComponent,
      },
      {
        path: 'import-examens',
        component: ImportStudentsComponent,
      },
      {
        path: 'parametrer-examen',
        component: AddExamComponent,
      },
      {
        path: 'add-etudiant',
        component: AddEtudiantComponent,
      },
      {
        path: 'list-examen-item',
        component: ListExamenItemComponent,
      },
      {
        path: 'examens-list',
        component: ExamensListComponent,
      },
      {
        path: 'suivi-absence',
        component: SuiviAbsenceComponent,
      },
    ],
  },
  {
    path: 'not-found',
    component: NotFoundComponent,
  },
  {
    path: '*',
    redirectTo: 'not-found',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
