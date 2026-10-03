import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AvisController } from './avis.controller';
import { avisContent, avisPage, AvisService } from './avis.service';
import { CreateAvisDto, ModererAvisDto } from './avis.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';

const content = {
  requestId: '1ff59776-c654-4c23-b71b-a207fd32feb2',
  ligneCommandeId: '72c6b646-e5ac-4d25-8eb6-a2280086e817',
  note: 1,
  texte: 'Le composant chauffe beaucoup.',
  pseudonyme: 'Maker',
};
describe('Verified reviews contract', () => {
  it('accepts negative ratings as normal content, rejects empty/control/invalid fields', () => {
    expect(avisContent(content).note).toBe(1);
    for (const invalid of [
      { note: 0 },
      { note: 6 },
      { note: 1.5 },
      { texte: '          ' },
      { pseudonyme: ' ' },
      { texte: 'Bonjour\0 mon projet' },
    ])
      expect(() => avisContent({ ...content, ...invalid })).toThrow();
    expect(
      avisContent({ ...content, projetRealise: '  Montage test  ' })
        .projetRealise,
    ).toBe('Montage test');
  });
  it('validates HTTP input and disallows rating as a moderation reason', async () => {
    expect(
      await validate(plainToInstance(CreateAvisDto, content)),
    ).toHaveLength(0);
    expect(
      await validate(plainToInstance(CreateAvisDto, { ...content, note: '5' })),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(ModererAvisDto, {
          requestId: content.requestId,
          expectedVersion: 1,
          action: 'REFUSER',
          motif: 'NOTE_NEGATIVE',
        }),
      ),
    ).not.toHaveLength(0);
  });
  it('bounds pagination and rejects ambiguous numeric input', () => {
    expect(avisPage(undefined, 10, 30)).toBe(10);
    for (const value of [
      '0',
      '-1',
      '1.2',
      '1e2',
      '31',
      '999999999999999999999',
    ])
      expect(() => avisPage(value, 10, 30)).toThrow();
  });
  it('protects private and admin routes with separate guards', () => {
    for (const name of ['create', 'purchases', 'report'])
      expect(
        Reflect.getMetadata(GUARDS_METADATA, AvisController.prototype[name]),
      ).toEqual([JwtAuthGuard]);
    for (const name of ['admin', 'moderate'])
      expect(
        Reflect.getMetadata(GUARDS_METADATA, AvisController.prototype[name]),
      ).toEqual([AdminAuthGuard, RolesGuard]);
  });
  it('refuses moderation without a content reason or unrelated payload before writing', async () => {
    const transaction = jest.fn();
    const service = new AvisService({ $transaction: transaction } as any);
    for (const invalid of [
      { action: 'REFUSER' },
      { action: 'PUBLIER', motif: 'SPAM' },
      { action: 'PUBLIER', reponse: 'merci' },
      { action: 'REPONDRE', reponse: '  ' },
    ])
      await expect(
        service.moderate('admin', 'id', {
          requestId: content.requestId,
          expectedVersion: 1,
          ...invalid,
        } as any),
      ).rejects.toThrow();
    expect(transaction).not.toHaveBeenCalled();
  });
});
