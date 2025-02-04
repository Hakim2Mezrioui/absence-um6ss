import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { AuthService } from 'src/app/services/auth.service';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css'],
})
export class SideBarComponent implements OnInit {
  isMinimized = true;
  role: String = 'user';
  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
    private router: Router,
    private startupService: StartupService
  ) {}

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
  }

  toggleSidebar() {
    this.isMinimized = !this.isMinimized;
  }

  logout() {
    this.authService.logout();
    this.cookieService.delete('token');
    this.router.navigate(['login']);
  }
}
