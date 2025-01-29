import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css']
})
export class SideBarComponent implements OnInit {
  isMinimized = true;

  constructor() { }

  ngOnInit(): void {
  }


  toggleSidebar() {
    this.isMinimized = !this.isMinimized;
  }

}
