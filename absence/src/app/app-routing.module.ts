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
import { ImportExamensComponent } from './components/import-examens/import-examens.component';
import { ListPresenceComponent } from './components/list-presence/list-presence.component';
import { PreventUnsavedChangesGuardGuard } from './guards/prevent-unsaved-changes-guard.guard';
import { ExamenFormGuard } from './guards/examen-form.guard';
import { EtudiantsComponent } from './components/etudiants/etudiants.component';

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
        children: [
          {
            path: 'suivi',
            component: ListPresenceComponent,
          },
        ],
      },
      {
        path: 'import-etudiants',
        component: ImportStudentsComponent,
      },
      {
        path: 'import-examens',
        component: ImportExamensComponent,
      },
      {
        path: 'parametrer-examen',
        component: AddExamComponent,
        canDeactivate: [ExamenFormGuard]
      },
      {
        path: 'add-etudiant',
        component: AddEtudiantComponent,
        canDeactivate: [PreventUnsavedChangesGuardGuard]
        
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
      {
        path: 'etudiants',
        component: EtudiantsComponent,
      }
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
