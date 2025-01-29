import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StartupService } from './../../services/startup.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  constructor(private router: Router, private startupService: StartupService) {}

  ngOnInit(): void {
    this.startupService.isLoginPage(false);
  }

  naviguer() {
    this.router.navigate(['app', 'lists']);
  }
}
