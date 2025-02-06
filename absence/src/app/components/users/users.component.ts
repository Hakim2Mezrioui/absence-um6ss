import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

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

  onDelete(id: number) {
    this.authService.delete(id).subscribe(
      (response) => {
        this.loading = false;
        this.toastr.success('Utilisateur supprimé avec succès');
        this.reloadCurrentRoute()
      },
      (error) => {
        this.loading = false;
        this.toastr.error("Erreur lors de la suppression de l'utilisateur");
      }
    );
  }

  private reloadCurrentRoute() {
    const currentUrl = this.router.url;
    this.router
      .navigateByUrl('/whitePage', { skipLocationChange: true })
      .then(() => {
        this.router.navigate([currentUrl]);
      });
  }
}
