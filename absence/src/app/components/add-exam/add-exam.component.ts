import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-exam',
  templateUrl: './add-exam.component.html',
  styleUrls: ['./add-exam.component.css']
})
export class AddExamComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  goToImportScreen() {
    this.router.navigate(['/import-examens']);
  }
}
