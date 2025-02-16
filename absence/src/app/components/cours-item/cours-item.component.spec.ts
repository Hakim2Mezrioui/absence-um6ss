import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoursItemComponent } from './cours-item.component';

describe('CoursItemComponent', () => {
  let component: CoursItemComponent;
  let fixture: ComponentFixture<CoursItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CoursItemComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoursItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
