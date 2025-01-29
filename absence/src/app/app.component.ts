import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StartupService } from './services/startup.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  constructor(private startupService: StartupService) {}
  title = 'absence';
  isLoginPage = false;

  ngOnInit(): void {
    this.isLoginPage = this.startupService.isLogin;
  }

}
