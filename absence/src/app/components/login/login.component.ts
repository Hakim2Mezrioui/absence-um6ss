import { AuthService } from './../../services/auth.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { StartupService } from './../../services/startup.service';
import { NgForm } from '@angular/forms';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  @ViewChild('f') form!: NgForm;
  constructor(
    private router: Router,
    private startupService: StartupService,
    private authService: AuthService,    
    private cookieService: CookieService
  ) {}

  ngOnInit(): void {
    this.startupService.isLoginPage(false);
  }

  naviguer() {
    this.router.navigate(['app', 'lists']);
  }

  onSubmit() {
    const email = this.form.value.email;
    const password = this.form.value.password;
    this.authService.login(email, password).subscribe(
      (response) => {
        this.cookieService.set('token', response.authorisation.token, 1);
          this.router.navigate(['/examens-list']);
      },
      (error) => {
        console.error(error);
      }
    );
  }
}
