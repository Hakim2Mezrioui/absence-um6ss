import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CoursService } from 'src/app/services/cours.service';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-import-cours',
  templateUrl: './import-cours.component.html',
  styleUrls: ['./import-cours.component.css'],
})
export class ImportCoursComponent implements OnInit {
  loading: boolean = false;
  constructor(
    private toast: ToastrService,
    private coursService: CoursService,
    private router: Router,
    private startupService: StartupService
  ) {}

  ngOnInit(): void {
    this.startupService.page.next('Importer les cours');
  }

  async onFileSelected(event: Event) {
    this.loading = true;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      const formData = new FormData();
      formData.append('file', file, file.name);
      this.coursService.importer(formData).subscribe(
        (response) => {
          this.loading = false;
          this.toast.success('File has been uploaded successfully');
          input.value = ''; // Reset the input
          this.router.navigate(['cours']);
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
