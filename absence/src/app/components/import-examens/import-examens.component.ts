import { Router } from '@angular/router';
import { StartupService } from './../../services/startup.service';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ExamenService } from 'src/app/services/examen.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-import-examens',
  templateUrl: './import-examens.component.html',
  styleUrls: ['./import-examens.component.css'],
})
export class ImportExamensComponent implements OnInit {
  loading: boolean = false;
  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private startupService: StartupService,
    private examenService: ExamenService,
    private toast: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.startupService.page.next('Importer les examens');
  }

  async onFileSelected(event: Event) {
    this.loading = true;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      const formData = new FormData();
      formData.append('file', file, file.name);
      this.examenService.importer(formData).subscribe(
        (response) => {
          this.loading = false;
          this.toast.success('File has been uploaded successfully');
          input.value = ''; // Reset the input
          this.router.navigate(['examens-list']);
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
