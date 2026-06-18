import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class FactureVirtuelleEventsService {
  private readonly subject = new Subject<any>();

  emit(factureVirtuelle: any) {
    this.subject.next(factureVirtuelle);
  }

  get stream$(): Observable<any> {
    return this.subject.asObservable();
  }
}
