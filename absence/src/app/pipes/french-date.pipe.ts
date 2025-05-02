import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'frenchDate'
})

export class FrenchDatePipe implements PipeTransform {

  transform(value: Date | string | null | undefined, format: string = 'mediumDate'): string {
    if (!value) return '';
    
    const date = typeof value === 'string' ? new Date(value) : value;
    return new DatePipe('fr-FR').transform(date, format) || '';
  }
}