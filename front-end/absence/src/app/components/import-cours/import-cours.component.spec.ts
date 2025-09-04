import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportCoursComponent } from './import-cours.component';

describe('ImportCoursComponent', () => {
  let component: ImportCoursComponent;
  let fixture: ComponentFixture<ImportCoursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportCoursComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportCoursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
