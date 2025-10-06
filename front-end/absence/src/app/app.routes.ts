import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { AddEnseignantComponent } from './components/add-enseignant/add-enseignant.component';
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
import { EtablissementsComponent } from './components/etablissements/etablissements.component';
import { SallesComponent } from './components/salles/salles.component';
import { RattrapageComponent } from './components/rattrapage/rattrapage.component';
import { RattrapageStudentsComponent } from './components/rattrapage-students/rattrapage-students.component';
import { ProfileComponent } from './components/profile/profile.component';
import { CoursComponent } from './components/cours/cours.component';
import { AddCoursComponent } from './components/add-cours/add-cours.component';
import { EditCoursComponent } from './components/edit-cours/edit-cours.component';
import { AttendanceCoursComponent } from './components/attendance-cours/attendance-cours.component';
import { ImportCoursComponent } from './components/import-cours/import-cours.component';
import { ConfigurationComponent } from './components/configuration/configuration.component';
import { EnseignantsComponent } from './components/enseignants/enseignants.component';
import { ImportEnseignantsComponent } from './import-enseignants/import-enseignants.component';

export const routes: Routes = [
    {path: "", redirectTo: "login", pathMatch: "full"},
    {path: "login", component: LoginComponent},
    // Public access to add-enseignant (no AuthGuard)
    {path: "add-enseignant", component: AddEnseignantComponent},

    // Authenticated area with sidebar layout
    {
        path: "",
        component: LayoutComponent,
        canActivate: [AuthGuard],
        children: [
            // Legacy redirects (compat)
            { path: "dashboard/cours/:id/attendance", redirectTo: "cours/:id/attendance", pathMatch: "full" },

            // Dashboard: everyone authenticated
            { path: "dashboard", component: DashboardComponent },

            // Super-admin and admin and scolarite access; enseignant only to cours-related
            { path: "examens", component: ExamensComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "add-examen", component: AddExamenComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "edit-examen/:id", component: EditExamenComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "import-examens", component: ImportExamensComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },

            { path: "attendance", component: AttendanceComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite', 'enseignant'] } },

            { path: "etudiants", component: EtudiantsComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "add-student", component: AddStudentComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "import-students", component: ImportStudentsComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },

            { path: "absences", component: AbsencesComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "promotions", component: PromotionsComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "etablissements", component: EtablissementsComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin'] } },
            { path: "salles", component: SallesComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },

            { path: "rattrapages", component: RattrapageComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "rattrapages/:id/students", component: RattrapageStudentsComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },

            // Cours: scolarite and enseignant (and admins, super-admin)
            { path: "cours", component: CoursComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite', 'enseignant'] } },
            { path: "add-cours", component: AddCoursComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "edit-cours/:id", component: EditCoursComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "import-cours", component: ImportCoursComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite'] } },
            { path: "cours/:id/attendance", component: AttendanceCoursComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin', 'scolarite', 'enseignant'] } },

            // Configuration: super-admin only
            { path: "configuration", component: ConfigurationComponent, canActivate: [RoleGuard], data: { roles: ['super-admin'] } },

            // Enseignants list: admins and above
            { path: "enseignants", component: EnseignantsComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin'] } },
            { path: "import-enseignants", component: ImportEnseignantsComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin'] } },

            { path: "statistiques", component: DashboardComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin'] } },
            { path: "parametres", component: DashboardComponent, canActivate: [RoleGuard], data: { roles: ['super-admin', 'admin'] } },
            { path: "profile", component: ProfileComponent },
        ]
    },
];
