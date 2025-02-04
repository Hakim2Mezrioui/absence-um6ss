import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Table } from 'primeng/table';
import { User } from 'src/app/models/Users';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  @ViewChild('dt') dt!: Table;
  loading: boolean = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.getUsers();
  }

  getUsers() {
    this.loading = true;
    this.authService.users().subscribe(
      (response: any) => {
        this.loading = false;
        this.users = response.users;
        console.log(this.users);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  handleSearch(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dt.filterGlobal(value, 'contains');
  }
}
