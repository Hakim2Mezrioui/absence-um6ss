import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportEnseignantsComponent } from './import-enseignants.component';

describe('ImportEnseignantsComponent', () => {
  let component: ImportEnseignantsComponent;
  let fixture: ComponentFixture<ImportEnseignantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportEnseignantsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportEnseignantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
