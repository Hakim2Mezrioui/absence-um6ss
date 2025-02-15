import { Component, OnInit } from '@angular/core';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  role!: String;
  name!: String;
  page!: String;
  constructor(private startupService: StartupService) {}

  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
    this.startupService.name.subscribe((value) => (this.name = value));
    this.startupService.page.subscribe((value) => (this.page = value));
  }
}
