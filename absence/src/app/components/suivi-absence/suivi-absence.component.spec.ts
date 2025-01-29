import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuiviAbsenceComponent } from './suivi-absence.component';

describe('SuiviAbsenceComponent', () => {
  let component: SuiviAbsenceComponent;
  let fixture: ComponentFixture<SuiviAbsenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SuiviAbsenceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuiviAbsenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
