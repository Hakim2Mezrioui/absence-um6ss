import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ExamensComponent } from './components/examens/examens.component';
import { AddExamenComponent } from './components/add-examen/add-examen.component';
import { EditExamenComponent } from './components/edit-examen/edit-examen.component';
import { ImportExamensComponent } from './components/import-examens/import-examens.component';
import { AttendanceComponent } from './components/attendance/attendance.component';
import { EtudiantsComponent } from './components/etudiants/etudiants.component';
import { AddStudentComponent } from './components/add-student/add-student.component';
import { ImportStudentsComponent } from './components/import-students/import-students.component';
import { AbsencesComponent } from './components/absences/absences.component';
import { PromotionsComponent } from './components/promotions/promotions.component';
import { AuthGuard } from './guards/auth.guard';
import { EtablissementsComponent } from './components/etablissements/etablissements.component';
import { SallesComponent } from './components/salles/salles.component';
import { RattrapageComponent } from './components/rattrapage/rattrapage.component';
import { RattrapageStudentsComponent } from './components/rattrapage-students/rattrapage-students.component';
import { ProfileComponent } from './components/profile/profile.component';
import { CoursComponent } from './components/cours/cours.component';
import { AddCoursComponent } from './components/add-cours/add-cours.component';
import { EditCoursComponent } from './components/edit-cours/edit-cours.component';
import { AttendanceCoursComponent } from './components/attendance-cours/attendance-cours.component';

export const routes: Routes = [
    {path: "", redirectTo: "login", pathMatch: "full"},
    {path: "login", component: LoginComponent},
    {
        path: "dashboard", 
        component: LayoutComponent,
        canActivate: [AuthGuard],
                children: [
                   { path: "", component: DashboardComponent },
                   { path: "examens", component: ExamensComponent },
                   { path: "add-examen", component: AddExamenComponent },
                   { path: "edit-examen/:id", component: EditExamenComponent },
                   { path: "import-examens", component: ImportExamensComponent },
                   { path: "attendance", component: AttendanceComponent },
                   { path: "etudiants", component: EtudiantsComponent },
                   { path: "add-student", component: AddStudentComponent },
                   { path: "import-students", component: ImportStudentsComponent },
                   { path: "absences", component: AbsencesComponent },
                   { path: "promotions", component: PromotionsComponent },
                   { path: "etablissements", component: EtablissementsComponent }, // Placeholder
                   { path: "salles", component: SallesComponent }, // Placeholder
                   { path: "rattrapages", component: RattrapageComponent },
                   { path: "rattrapages/:id/students", component: RattrapageStudentsComponent },
                   { path: "cours", component: CoursComponent },
                   { path: "add-cours", component: AddCoursComponent },
                   { path: "edit-cours/:id", component: EditCoursComponent },
                   { path: "cours/:id/attendance", component: AttendanceCoursComponent },
                   { path: "statistiques", component: DashboardComponent }, // Placeholder
                   { path: "parametres", component: DashboardComponent }, // Placeholder
                   { path: "profile", component: ProfileComponent },
               ]
    },
];
