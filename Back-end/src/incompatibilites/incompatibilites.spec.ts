import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { incompatibiliteContent } from './incompatibilites.service';
import { PrivateFailureInterceptor } from './private-failure.interceptor';

it('binds only bounded technical content and rejects hidden controls and invalid quantities', () => {
  const content = {
    quantite: 2,
    motif: 'BROCHAGE' as const,
    description: '  Les broches diffèrent du montage.  ',
  };
  expect(
    incompatibiliteContent({
      ...content,
      requestId: 'ignored',
      ligneCommandeId: 'ignored',
    }),
  ).toEqual({
    quantite: 2,
    motif: 'BROCHAGE',
    description: 'Les broches diffèrent du montage.',
  });
  for (const quantite of [0, -1, 1.5, 1000001, Number.MAX_SAFE_INTEGER + 1])
    expect(() =>
      incompatibiliteContent({ ...content, quantite } as any),
    ).toThrow(BadRequestException);
  for (const description of [
    '          ',
    'texte privé\u0000',
    'a'.repeat(2001),
  ])
    expect(() =>
      incompatibiliteContent({ ...content, description } as any),
    ).toThrow(BadRequestException);
});

it('hides unexpected private database failures while preserving expected access/validation errors', async () => {
  const interceptor = new PrivateFailureInterceptor();
  const run = (error: Error) =>
    firstValueFrom(
      interceptor.intercept({} as any, {
        handle: () => throwError(() => error),
      }),
    );
  const privateFailure = new Error(
    'SQL with private diagnostic, token and hash',
  );
  await expect(run(privateFailure)).rejects.toBeInstanceOf(
    ServiceUnavailableException,
  );
  await expect(run(privateFailure)).rejects.not.toHaveProperty(
    'message',
    privateFailure.message,
  );
  const validation = new BadRequestException('Quantité invalide.');
  await expect(run(validation)).rejects.toBe(validation);
});
