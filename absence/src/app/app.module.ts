import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { ParametrageComponent } from './components/parametrage/parametrage.component';
import { FormsModule } from '@angular/forms';
import { ListPresenceComponent } from './components/list-presence/list-presence.component';
import { TableModule } from 'primeng/table';
import { HttpClientModule } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ImportStudentsComponent } from './components/import-students/import-students.component';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { FileUpload } from 'primeng/fileupload';
import { SuiviAbsenceComponent } from './components/suivi-absence/suivi-absence.component';
import { AddExamComponent } from './components/add-exam/add-exam.component';
import { AddEtudiantComponent } from './components/add-etudiant/add-etudiant.component';
import { ImportExamensComponent } from './components/import-examens/import-examens.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { ExamensListComponent } from './examens-list/examens-list.component';
import { ListExamenItemComponent } from './list-examen-item/list-examen-item.component';
import { DropdownModule } from 'primeng/dropdown';
import { AuthticatedLayoutComponent } from './components/authticated-layout/authticated-layout.component';
import { RouterModule } from '@angular/router';

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
    RouterModule
  ],
  providers: [MessageService],
  bootstrap: [AppComponent],
})
export class AppModule {}
