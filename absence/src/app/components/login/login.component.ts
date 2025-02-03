import { AuthService } from './../../services/auth.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { StartupService } from './../../services/startup.service';
import { NgForm } from '@angular/forms';
import { CookieService } from 'ngx-cookie-service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  @ViewChild('f') form!: NgForm;
  loading: boolean = false;
  constructor(
    private router: Router,
    private startupService: StartupService,
    private authService: AuthService,
    private cookieService: CookieService,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    this.startupService.isLoginPage(false);
  }

  naviguer() {
    this.router.navigate(['app', 'lists']);
  }

  onSubmit() {
    this.loading = true;
    const email = this.form.value.email;
    const password = this.form.value.password;
    this.authService.login(email, password).subscribe(
      (response) => {
        this.cookieService.set('token', response.authorisation.token, 1);
        this.loading = false;
        this.router.navigate(['/examens-list']);
        this.toast.success('Login successful!');
      },
      (error) => {
        this.toast.error('Your credentials are incorrect. Please try again.');
        this.loading = false;
      }
    );
  }
}
