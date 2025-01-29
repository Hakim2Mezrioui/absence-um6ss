import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-etudiant',
  templateUrl: './add-etudiant.component.html',
  styleUrls: ['./add-etudiant.component.css']
})
export class AddEtudiantComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  goToImportScreen() {
    this.router.navigate(["import-etudiants"])
  }

}
