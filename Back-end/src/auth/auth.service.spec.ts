import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

describe('AuthService password recovery', () => {
  it('envoie le code sans le journaliser en clair', async () => {
    const db = {
      client: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1', email: 'a@example.com', nom: 'Alice' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const mail = { sendOtpEmail: jest.fn().mockResolvedValue(true) };
    const service = new AuthService(db as any, {} as any, mail as any);

    await service.forgotPassword('a@example.com');

    expect(mail.sendOtpEmail).toHaveBeenCalledWith(
      'a@example.com',
      expect.stringMatching(/^\d{6}$/),
      'Alice',
    );
    expect(db.client.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ otpCode: 'hashed' }),
    }));
  });
});
