import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { StartupService } from '../services/startup.service';

@Injectable({
  providedIn: 'root',
})
export class ScolariteGuard implements CanActivate {
  role!: String;
  constructor(private startService: StartupService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    this.startService.role.subscribe((value) => (this.role = value));

    if (this.role == 'scolarite') return true;
    this.router.navigate(['cours']);
    return false;
  }
}
