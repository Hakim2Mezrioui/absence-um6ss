import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamensArchivedComponent } from './examens-archived.component';

describe('ExamensArchivedComponent', () => {
  let component: ExamensArchivedComponent;
  let fixture: ComponentFixture<ExamensArchivedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamensArchivedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamensArchivedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
