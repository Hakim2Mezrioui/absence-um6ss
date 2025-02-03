import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css']
})
export class SideBarComponent implements OnInit {
  isMinimized = true;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
  }


  toggleSidebar() {
    this.isMinimized = !this.isMinimized;
  }

  logout() {
    // this.authService.
  }

}
