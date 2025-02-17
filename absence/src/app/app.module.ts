import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { DropdownModule } from 'primeng/dropdown';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DatePipe } from '@angular/common';

import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { ParametrageComponent } from './components/parametrage/parametrage.component';
import { ListPresenceComponent } from './components/list-presence/list-presence.component';
import { ImportStudentsComponent } from './components/import-students/import-students.component';
import { MessageService } from 'primeng/api';
import { FileUpload } from 'primeng/fileupload';
import { SuiviAbsenceComponent } from './components/suivi-absence/suivi-absence.component';
import { AddExamComponent } from './components/add-exam/add-exam.component';
import { AddEtudiantComponent } from './components/add-etudiant/add-etudiant.component';
import { ImportExamensComponent } from './components/import-examens/import-examens.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { AuthticatedLayoutComponent } from './components/authticated-layout/authticated-layout.component';
import { ExamensListComponent } from './components/examens-list/examens-list.component';
import { ListExamenItemComponent } from './components/list-examen-item/list-examen-item.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { RattrapageComponent } from './components/rattrapage/rattrapage.component';
import { PaginatorModule } from 'primeng/paginator';
import { LoadingComponent } from './components/loading/loading.component';
import { EtudiantsComponent } from './components/etudiants/etudiants.component';
import { TokenInterceptor } from './token.interceptor';
import { WhitePageComponent } from './components/white-page/white-page.component';
import { AddUserComponent } from './components/add-user/add-user.component';
import { UsersComponent } from './components/users/users.component';
import { UpdateExameComponent } from './update-exame/update-exame.component';
import { HeaderComponent } from './components/header/header.component';
import { CoursComponent } from './components/cours/cours.component';
import { AddCoursComponent } from './components/add-cours/add-cours.component';
import { UpdateCoursComponent } from './components/update-cours/update-cours.component';
import { ImportCoursComponent } from './components/import-cours/import-cours.component';
import { CoursItemComponent } from './components/cours-item/cours-item.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ParametrageComponent,
    ListPresenceComponent,
    ImportStudentsComponent,
    SuiviAbsenceComponent,
    AddExamComponent,
    AddEtudiantComponent,
    ImportExamensComponent,
    SideBarComponent,
    ExamensListComponent,
    ListExamenItemComponent,
    AuthticatedLayoutComponent,
    NotFoundComponent,
    RattrapageComponent,
    LoadingComponent,
    EtudiantsComponent,
    WhitePageComponent,
    AddUserComponent,
    UsersComponent,
    UpdateExameComponent,
    HeaderComponent,
    CoursComponent,
    AddCoursComponent,
    UpdateCoursComponent,
    ImportCoursComponent,
    CoursItemComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    TableModule,
    HttpClientModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule,
    ToastModule,
    CommonModule,
    DropdownModule,
    RouterModule,
    PaginatorModule,
    ToastrModule.forRoot(),
  ],
  providers: [
    MessageService,
    DatePipe,
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
