import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AddExamComponent } from '../components/add-exam/add-exam.component';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class ExamenFormGuard implements CanDeactivate<unknown> {
  async canDeactivate(component: AddExamComponent): Promise<boolean> {
    if (component.form.dirty) {
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
