import { StartupService } from './../services/startup.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { catchError, map, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGard implements CanActivate {
  constructor(
    private cookieService: CookieService,
    private router: Router,
    private http: HttpClient,
    private startupService: StartupService
  ) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    // const token = this.cookieService.get('token'); // Replace 'token' with your actual token key
    // if (token) {
    //   return true;
    // } else {
    //   this.router.navigate(['/login']); // Redirect to login page
    //   return false;
    // }

    return this.http
      .get('http://127.0.0.1:8000/api/user', {
        withCredentials: true,
      })
      .pipe(
        tap((response: any) => {
          // If the user is authenticated (e.g., user information received successfully),
          // return true to allow access to the route
          if (response) {
            console.log(response);
            localStorage.setItem('name', response.name);

            this.startupService.userFaculte.next(response.faculte);
            this.startupService.role.next(response.role);
            return true;
          } else {
            this.router.navigate(['/login']);
            return false;
          }
        }),
        catchError((error) => {
          // If there's an error (e.g., user not authenticated),
          // redirect to the login page
          this.router.navigate(['/login']);
          // Return an observable with a value indicating `that access to the route is denied
          return of(false);
        })
      );
  }
}
