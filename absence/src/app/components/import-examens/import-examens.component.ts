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
  selectedFile: File | null = null;  // Add this property

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
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];  // Set the selected file
      // Don't start loading yet - let user see the preview first
    }
  }

  uploadFile() {
    if (!this.selectedFile) return;
    
    this.loading = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    
    this.examenService.importer(formData).subscribe(
      (response) => {
        this.loading = false;
        this.toast.success('File has been uploaded successfully');
        this.selectedFile = null; // Clear the selected file
        this.router.navigate(['examens-list']);
      },
      (error) => {
        this.loading = false;
        this.toast.error('Error uploading file');
        this.selectedFile = null; // Clear the selected file
      }
    );
  }

  removeFile() {
    this.selectedFile = null;
  }
}