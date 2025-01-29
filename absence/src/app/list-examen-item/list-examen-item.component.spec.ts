import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListExamenItemComponent } from './list-examen-item.component';

describe('ListExamenItemComponent', () => {
  let component: ListExamenItemComponent;
  let fixture: ComponentFixture<ListExamenItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListExamenItemComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListExamenItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
