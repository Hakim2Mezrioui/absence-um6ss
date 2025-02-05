import { StartupService } from './../../services/startup.service';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-import-students',
  templateUrl: './import-students.component.html',
  styleUrls: ['./import-students.component.css'],
  providers: [MessageService],
})
export class ImportStudentsComponent implements OnInit {
  loading: boolean = false;
  role!: String;
  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private startupService: StartupService,
    private toast: ToastrService,
    private router: Router
  ) {}
  uploadedFiles: any[] = [];

  class = {
    name: '',
    faculte: '',
    promotion: '',
  };

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
  }

  onSubmit() {}

  onFileSelected(event: Event) {
    let faculte;
    this.loading = true;
    const input = event.target as HTMLInputElement;
    if (this.role != 'super-admin') {
      this.startupService.userFaculte.subscribe((value) => (faculte = value));
    }

    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      const formData = new FormData();
      formData.append('file', file, file.name);
      console.log(file);
      this.http
        .post(
          `${this.startupService.baseUrl}/import-etudiants?faculte=${faculte}`,
          formData
        )
        .subscribe(
          (response) => {
            this.loading = false;
            this.toast.success('File has been uploaded successfully');
            input.value = ''; // Reset the input
            this.router.navigate(['etudiants']);
          },
          (error) => {
            this.loading = false;
            this.toast.error('Error uploading file');
            input.value = ''; // Reset the input
          }
        );
    }
  }
}
