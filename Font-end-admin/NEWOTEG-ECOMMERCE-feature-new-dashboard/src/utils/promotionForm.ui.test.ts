import { describe, expect, it } from 'vitest';
import { localPromotionDate, promotionDatePayload } from './promotionForm';
describe('Promotion calendar round trip', () => {
  it('displays local time without moving the stored expiration during unrelated editing', () => {
    const source = '2099-10-02T11:30:29.123Z';
    const input = localPromotionDate(source);
    expect(input).toBe(new Date(new Date(source).getTime() - new Date(source).getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    expect(promotionDatePayload(input, source)).toBe(source);
    expect(promotionDatePayload('2099-10-02T12:35', source)).toBe(new Date('2099-10-02T12:35').toISOString());
  });
  it('supports explicit removal and rejects an unreadable date', () => {
    expect(localPromotionDate('bad')).toBe(''); expect(localPromotionDate()).toBe('');
    expect(promotionDatePayload('', '2099-10-02T11:30:00Z')).toBe('');
    expect(() => promotionDatePayload('bad')).toThrow();
  });
});
