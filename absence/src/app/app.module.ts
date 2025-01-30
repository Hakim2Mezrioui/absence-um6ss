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
import { HttpClientModule } from '@angular/common/http';
import { DropdownModule } from 'primeng/dropdown';

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
  ],
  imports: [
    BrowserModule,
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
  ],
  providers: [MessageService],
  bootstrap: [AppComponent],
})
export class AppModule {}
