import {
  ReplacementCaseDto,
  EvaluateReplacementDto,
  ReviewReplacementDto,
} from './dto/replacement-case.dto';
import {
  caseKey,
  replacementData,
  scopeApplication,
} from './replacement-case-data';
import { validate } from 'class-validator';

const uuid = 'dde305b1-3b66-46f7-8e4a-e6b09d5a9561';
const input = () =>
  Object.assign(new ReplacementCaseDto(), {
    version: 0,
    reference: 'BC547B',
    candidatId: uuid,
    application: 'Montage de recette 1 mA',
    verdict: 'DIRECT_DOCUMENTE',
    justification: 'Synthetic test only',
    limites: 'Only for the declared fixture',
    sourceUrl: 'https://manufacturer.example/reference.pdf',
    sourceDocument: 'Fixture reference',
    sourceRepere: 'Page 1',
    valeurIds: [uuid],
    retire: false,
  });
describe('Human replacement case contract', () => {
  it('requires exact scope and preserves critical suffixes, punctuation and unit case', () => {
    const key = (ref: string, application: string) =>
      caseKey(ref, null, uuid, application);
    expect(key(' BC547B ', 'usage  1 mA')).toBe(key('BC547B', ' usage 1 mA '));
    expect(key('bc547b', 'usage 1 mA')).not.toBe(key('BC547B', 'usage 1 mA'));
    expect(key('condensateur 1 mF', 'usage')).not.toBe(
      key('condensateur 1 MF', 'usage'),
    );
    expect(key('BC547C', 'usage 1 mA')).not.toBe(key('BC547B', 'usage 1 mA'));
    expect(key('BC-547B', 'usage 1 mA')).not.toBe(key('BC547B', 'usage 1 mA'));
    expect(key('BC547B', 'usage 1 MA')).not.toBe(key('BC547B', 'usage 1 mA'));
    expect(scopeApplication('  12 V  DC ')).toBe('12 V DC');
  });
  it('does not accept an adaptation hidden as a direct replacement or an unsafe source URL', () => {
    expect(() =>
      replacementData({ ...input(), adaptations: 'Change pinout' }),
    ).toThrow(/adaptation/);
    expect(() =>
      replacementData({ ...input(), verdict: 'ADAPTATION_NECESSAIRE' }),
    ).toThrow(/adaptations/);
    expect(() =>
      replacementData({
        ...input(),
        sourceUrl: 'https://user:secret@manufacturer.example/file',
      }),
    ).toThrow(/HTTPS/);
    expect(() => replacementData({ ...input(), application: ' ' })).toThrow(
      /usage/,
    );
  });
  it('validates explicit verdicts, bounded candidate/value lists and a separate confirmed review', async () => {
    expect(await validate(input())).toEqual([]);
    expect(
      await validate(Object.assign(input(), { verdict: '100% IA' })),
    ).not.toHaveLength(0);
    expect(
      await validate(
        Object.assign(new ReviewReplacementDto(), {
          version: 1,
          empreinte: 'a'.repeat(64),
          confirmerRelecture: false,
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        Object.assign(new EvaluateReplacementDto(), {
          query: 'BC547B',
          application: '',
          candidatIds: Array(6).fill(uuid),
        }),
      ),
    ).not.toHaveLength(0);
  });
});
