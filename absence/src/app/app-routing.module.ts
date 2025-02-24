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
import { AuthGard } from './guards/auth.guard';
import { WhitePageComponent } from './components/white-page/white-page.component';
import { AddUserComponent } from './components/add-user/add-user.component';
import { UsersComponent } from './components/users/users.component';
import { AdminGuard } from './guards/admin.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminAndAdminGuard } from './guards/super-admin-and-admin.guard';
import { CoursComponent } from './components/cours/cours.component';
import { AddCoursComponent } from './components/add-cours/add-cours.component';
import { UpdateCoursComponent } from './components/update-cours/update-cours.component';
import { ImportCoursComponent } from './components/import-cours/import-cours.component';
import { UpdateExameComponent } from './components/update-exame/update-exame.component';
import { FooterComponent } from './components/footer/footer.component';
import { ScolariteGuard } from './guards/scolarite.guard';
import { SuperAdminAndScolariteGuard } from './guards/super-admin-and-scolarite.guard';

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
    canActivate: [AuthGard],
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
        canActivate: [SuperAdminAndAdminGuard],
      },
      {
        path: 'import-examens',
        component: ImportExamensComponent,
        canActivate: [SuperAdminAndAdminGuard],
      },
      {
        path: 'parametrer-examen',
        component: AddExamComponent,
        canDeactivate: [ExamenFormGuard],
        canActivate: [SuperAdminAndAdminGuard],
      },
      {
        path: 'update-exam/:id',
        component: UpdateExameComponent,
        canActivate: [SuperAdminAndAdminGuard],
      },
      {
        path: 'add-etudiant',
        component: AddEtudiantComponent,
        canDeactivate: [PreventUnsavedChangesGuardGuard],
        canActivate: [SuperAdminAndAdminGuard],
      },
      {
        path: 'list-examen-item',
        component: ListExamenItemComponent,
      },
      {
        path: 'examens-list',
        component: ExamensListComponent,
        canActivate: [SuperAdminAndAdminGuard],
      },
      {
        path: 'suivi-absence',
        component: SuiviAbsenceComponent,
      },
      {
        path: 'etudiants',
        component: EtudiantsComponent,
        canActivate: [SuperAdminAndAdminGuard],
      },
      {
        path: 'whitePage',
        component: WhitePageComponent,
      },
      {
        path: 'add-user',
        component: AddUserComponent,
        canActivate: [SuperAdminGuard],
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [SuperAdminAndAdminGuard],
      },
      {
        path: 'cours',
        component: CoursComponent,
        canActivate: [SuperAdminAndScolariteGuard],
      },
      {
        path: 'add-cours',
        component: AddCoursComponent,
        canActivate: [ScolariteGuard],
      },
      {
        path: 'update-cours/:id',
        component: UpdateCoursComponent,
        canActivate: [ScolariteGuard],
      },
      {
        path: 'import-cours',
        component: ImportCoursComponent,
        canActivate: [ScolariteGuard],
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
