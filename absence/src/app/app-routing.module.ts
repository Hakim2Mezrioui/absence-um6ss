import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ParametrageComponent } from './components/parametrage/parametrage.component';
import { ImportStudentsComponent } from './components/import-students/import-students.component';
import { AddExamComponent } from './components/add-exam/add-exam.component';
import { AddEtudiantComponent } from './components/add-etudiant/add-etudiant.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { ListExamenItemComponent } from './list-examen-item/list-examen-item.component';
import { ExamensListComponent } from './examens-list/examens-list.component';
import { AuthticatedLayoutComponent } from './components/authticated-layout/authticated-layout.component';

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
        path: 'parametrage',
        component: ParametrageComponent,
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
        path: 'add-exam',
        component: AddExamComponent,
      },
      {
        path: 'add-etudiant',
        component: AddEtudiantComponent,
      },
      {
        path: 'side-bar',
        component: SideBarComponent,
      },
      {
        path: 'list-examen-item',
        component: ListExamenItemComponent,
      },
      {
        path: 'examens-list',
        component: ExamensListComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
