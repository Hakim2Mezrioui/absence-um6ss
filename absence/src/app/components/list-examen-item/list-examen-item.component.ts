import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface Statut {
  name: string;
  code: string;
}

@Component({
  selector: 'app-list-examen-item',
  templateUrl: './list-examen-item.component.html',
  styleUrls: ['./list-examen-item.component.css']
})
export class ListExamenItemComponent implements OnInit {
  statut!: Statut[];
  selectedStatut!: Statut;

  constructor(private router: Router) { }

  ngOnInit() {
    this.statut = [
        {name: "", code: ""},
        { name: 'New York', code: 'NY' },
        { name: 'Rome', code: 'RM' },
        { name: 'London', code: 'LDN' },
        { name: 'Istanbul', code: 'IST' },
        { name: 'Paris', code: 'PRS' }
    ];
}

  onExplore() {
    this.router.navigate(['suivi-absence']);
  }
}
