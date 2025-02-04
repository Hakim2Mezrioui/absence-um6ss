import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.css'],
})
export class AddUserComponent implements OnInit {
  @ViewChild('f') form!: NgForm;
  roleValue: string = ''; // Valeur par défaut
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  onRoleChange() {
    this.roleValue = this.form.value.role;
  }

  onSubmit() {
    this.loading = true;
    this.authService.create(this.form.value).subscribe(
      (response) => {
        this.loading = false;
        this.toastr.success('Utilisateur ajouté avec succès', 'Success');
        this.router.navigate(['users']);
      },
      (error) => {
        this.loading = false;
        this.toastr.error("Erreur lors de l'ajout de l'utilisateur", 'Error');
      }
    );
  }
}
