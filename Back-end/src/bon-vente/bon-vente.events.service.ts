import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class BonVenteEventsService {
  private readonly subject = new Subject<any>();

  emit(bon: any) {
    this.subject.next(bon);
  }

  get stream$(): Observable<any> {
    return this.subject.asObservable();
  }
}
