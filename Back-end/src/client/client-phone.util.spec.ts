import { normalizeCameroonPhone } from './client-phone.util';

describe('normalizeCameroonPhone', () => {
  it.each([
    ['+237 699 12 34 56', '699123456'],
    ['00237-699-12-34-56', '699123456'],
    ['699 12 34 56', '699123456'],
    ['', null],
    [undefined, null],
  ])('normalise %p en %p', (input, expected) => {
    expect(normalizeCameroonPhone(input)).toBe(expected);
  });
});
