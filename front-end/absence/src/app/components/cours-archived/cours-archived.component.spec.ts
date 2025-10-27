import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoursArchivedComponent } from './cours-archived.component';

describe('CoursArchivedComponent', () => {
  let component: CoursArchivedComponent;
  let fixture: ComponentFixture<CoursArchivedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoursArchivedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoursArchivedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

