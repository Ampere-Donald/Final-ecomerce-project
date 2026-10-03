import { MailService } from './mail.service';
describe('Private guest email transport', () => {
  const old = process.env.GUEST_EMAIL_ENABLED;
  afterEach(() => {
    if (old === undefined) delete process.env.GUEST_EMAIL_ENABLED;
    else process.env.GUEST_EMAIL_ENABLED = old;
  });
  it('requires explicit activation and an SMTP transport, without logging codes', async () => {
    const service = new MailService();
    (service as any).transporter = null;
    process.env.GUEST_EMAIL_ENABLED = 'true';
    expect(service.guestRecoveryAvailable()).toBe(false);
    expect(
      await service.sendGuestAccessCode('qa@example.invalid', '12345678'),
    ).toBe(false);
    const sendMail = jest.fn().mockResolvedValue({});
    (service as any).transporter = { sendMail };
    process.env.GUEST_EMAIL_ENABLED = 'false';
    expect(
      await service.sendGuestAccessCode('qa@example.invalid', '12345678'),
    ).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
    process.env.GUEST_EMAIL_ENABLED = 'true';
    expect(
      await service.sendGuestAccessCode('qa@example.invalid', '12345678'),
    ).toBe(true);
    expect(sendMail.mock.calls[0][0].text).toContain('12345678');
    expect(sendMail.mock.calls[0][0].html).toBeUndefined();
  });
  it('reports delivery failure without exposing the transport error or code in logs', async () => {
    const service = new MailService();
    process.env.GUEST_EMAIL_ENABLED = 'true';
    (service as any).transporter = {
      sendMail: jest.fn().mockRejectedValue(new Error('SECRET CODE 12345678')),
    };
    const warn = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => {});
    expect(
      await service.sendGuestAccessCode('qa@example.invalid', '12345678'),
    ).toBe(false);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('12345678');
  });
  it('labels linking consent with the destination account and keeps its code out of logs', async () => {
    const service = new MailService();
    process.env.GUEST_EMAIL_ENABLED = 'true';
    const sendMail = jest.fn().mockResolvedValue({});
    (service as any).transporter = { sendMail };
    expect(
      await service.sendGuestLinkCode(
        'guest@example.invalid',
        '12345678',
        'DEMO-ORDER',
        'account@example.invalid',
      ),
    ).toBe(true);
    expect(sendMail.mock.calls[0][0].text).toContain('account@example.invalid');
    expect(sendMail.mock.calls[0][0].text).toContain('DEMO-ORDER');
    expect(sendMail.mock.calls[0][0].text).toContain('coordonnées');
    expect(sendMail.mock.calls[0][0].html).toBeUndefined();
    process.env.GUEST_EMAIL_ENABLED = 'false';
    expect(
      await service.sendGuestLinkCode(
        'guest@example.invalid',
        '12345678',
        'DEMO-ORDER',
        'account@example.invalid',
      ),
    ).toBe(false);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
  it('makes cancellation and receipt codes explicit and different from payment or account linking', async () => {
    const service = new MailService();
    process.env.GUEST_EMAIL_ENABLED = 'true';
    const sendMail = jest.fn().mockResolvedValue({});
    (service as any).transporter = { sendMail };
    for (const action of ['CANCEL', 'RECEIVE'] as const)
      expect(
        await service.sendGuestActionCode(
          'guest@example.invalid',
          '12345678',
          'DEMO',
          action,
        ),
      ).toBe(true);
    expect(sendMail.mock.calls[0][0].text).toContain('annuler');
    expect(sendMail.mock.calls[1][0].text).toContain('reçu tous les articles');
    for (const call of sendMail.mock.calls) {
      expect(call[0].text).toContain('aucun paiement');
      expect(call[0].html).toBeUndefined();
    }
  });
});
