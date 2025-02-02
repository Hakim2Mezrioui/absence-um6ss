import { Injectable, Component } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanDeactivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AddEtudiantComponent } from '../components/add-etudiant/add-etudiant.component';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class PreventUnsavedChangesGuardGuard implements CanDeactivate<unknown> {
  async canDeactivate(Component: AddEtudiantComponent): Promise<boolean> {
    if (Component.form.dirty) {
      const response = await Swal.fire({
        title: '',
        text: 'Are you sure!',
        icon: 'info',
        showCancelButton: true,
      });
      return response.isConfirmed;
    }

    return true;
  }
  
}
