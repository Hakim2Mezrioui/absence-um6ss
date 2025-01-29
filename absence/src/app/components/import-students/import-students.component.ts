import { StartupService } from './../../services/startup.service';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-import-students',
  templateUrl: './import-students.component.html',
  styleUrls: ['./import-students.component.css'],
  providers: [MessageService],
})
export class ImportStudentsComponent implements OnInit {
  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private startupService: StartupService,
  ) {}
  uploadedFiles: any[] = [];

  class = {
    name: '',
    faculte: '',
    promotion: '',
  };

  ngOnInit(): void {}

  onSubmit() {}
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      const formData = new FormData();
      formData.append('file', file, file.name);
      console.log(file)
      this.http.post(`${this.startupService.baseUrl}/import-etudiants`, formData).subscribe(
        (response) => {
          this.messageService.add({
            severity: 'info',
            summary: 'File Uploaded',
            detail: 'File has been uploaded successfully',
          });
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Upload Error',
            detail: 'Error uploading file',
          });
        }
      );
    }
  }
}
