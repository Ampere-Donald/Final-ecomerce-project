import { GuestChallengeMaintenanceService } from './guest-challenge-maintenance.service';

describe('Guest challenge maintenance', () => {
  const flag = process.env.GUEST_CHALLENGE_CLEANUP_ENABLED;
  afterEach(() => {
    if (flag === undefined) delete process.env.GUEST_CHALLENGE_CLEANUP_ENABLED;
    else process.env.GUEST_CHALLENGE_CLEANUP_ENABLED = flag;
  });
  it('defaults to no automatic deletion before rollout activation', async () => {
    delete process.env.GUEST_CHALLENGE_CLEANUP_ENABLED;
    const query = jest.fn();
    await new GuestChallengeMaintenanceService({
      $queryRaw: query,
    } as any).scheduledPrune();
    expect(query).not.toHaveBeenCalled();
  });
  it('bounds a full run to four batches and supports an empty isolated scope', async () => {
    const query = jest.fn().mockResolvedValue([{ count: 500n }]);
    const service = new GuestChallengeMaintenanceService({
      $queryRaw: query,
    } as any);
    expect(await service.prune(new Date(), [])).toBe(0);
    expect(query).not.toHaveBeenCalled();
    expect(await service.prune()).toBe(2000);
    expect(query).toHaveBeenCalledTimes(4);
  });
  it('does not overlap on one instance and retries after a failure without logging its sensitive details', async () => {
    process.env.GUEST_CHALLENGE_CLEANUP_ENABLED = 'true';
    let reject: (error: Error) => void;
    const query = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, fail) => {
            reject = fail;
          }),
      )
      .mockResolvedValue([{ count: 0n }]);
    const service = new GuestChallengeMaintenanceService({
      $queryRaw: query,
    } as any);
    const log = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => {});
    const run = service.scheduledPrune();
    await service.scheduledPrune();
    expect(query).toHaveBeenCalledTimes(1);
    reject!(new Error('SECRET HASH AND SQL'));
    await run;
    await service.scheduledPrune();
    expect(query).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(
      'Échec du nettoyage des codes invités. Réessai au prochain passage.',
    );
  });
});
