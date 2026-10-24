import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { mobileRecoveryResponse, recoveryClient } from '../../mobile-recovery.js';

function setup(healthy = true) {
  const unregister = vi.fn().mockResolvedValue(true);
  const remove = vi.fn().mockResolvedValue(true);
  const replace = vi.fn();
  const send = vi.fn();
  let xhr: any;
  const context = {
    document,
    location: { origin: 'https://admin.newoteg.com', replace },
    navigator: { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([
      { scope: 'https://admin.newoteg.com/', unregister },
      { scope: 'https://admin.newoteg.com/other/', unregister: () => { throw new Error('Unrelated scope'); } },
    ]) } },
    caches: { keys: vi.fn().mockResolvedValue([
      'workbox-precache-v2-https://admin.newoteg.com/',
      'newoteg-admin-ui-v3-precache-v2-https://admin.newoteg.com/',
      'newoteg-on-demand-modules-v2', 'newoteg-offline-data-v1', 'newoteg-update-migration-v3', 'other-app',
    ]), delete: remove },
    // Neither API is needed by recovery; fail the test if it touches business storage.
    localStorage: { clear: () => { throw new Error('Session and local data must survive'); } },
    indexedDB: { deleteDatabase: () => { throw new Error('Offline sales must survive'); } },
    XMLHttpRequest: class {
      status = healthy ? 200 : 503;
      responseText = healthy ? '{"status":"ok"}' : '{"status":"unavailable"}';
      open = vi.fn();
      send = send;
      constructor() { xhr = this; }
    },
  };
  recoveryClient(context);
  return { context, unregister, remove, replace, send, xhr: () => xhr };
}

describe('mobile recovery outside the legacy HTML cache', () => {
  beforeEach(() => { document.body.innerHTML = '<button id="repair">Mettre à jour</button><p id="status"></p>'; });
  it('only changes the display cache after a successful server check and user click', async () => {
    const app = setup();
    expect(app.unregister).not.toHaveBeenCalled();
    document.getElementById('repair')!.click();
    expect(app.xhr().open).toHaveBeenCalledWith('GET', expect.stringMatching(/^\/api\/health\?update=/), true);
    app.xhr().onload();
    await waitFor(() => expect(app.replace).toHaveBeenCalledWith('/?interface=mobile-v3'));
    expect(app.unregister).toHaveBeenCalledOnce();
    expect(app.remove.mock.calls.map(args => args[0])).toEqual([
      'workbox-precache-v2-https://admin.newoteg.com/',
      'newoteg-admin-ui-v3-precache-v2-https://admin.newoteg.com/',
      'newoteg-on-demand-modules-v2',
    ]);
  });
  it('leaves the installed app intact when the network or server is unavailable', async () => {
    const app = setup(false);
    document.getElementById('repair')!.click();
    app.xhr().onload();
    await waitFor(() => expect(document.getElementById('status')!.textContent).toContain('injoignable'));
    expect(app.unregister).not.toHaveBeenCalled();
    expect(app.remove).not.toHaveBeenCalled();
    expect(app.replace).not.toHaveBeenCalled();
    expect((document.getElementById('repair') as HTMLButtonElement).disabled).toBe(false);
  });
  it('serves an independent, uncached HTML document, including a HEAD response', async () => {
    const response = mobileRecoveryResponse();
    expect(response.headers.get('cache-control')).toBe('no-store');
    const html = await response.text();
    expect(html).toContain('Charger la nouvelle version');
    expect(html).not.toContain('/assets/index-');
    expect(await mobileRecoveryResponse('HEAD').text()).toBe('');
  });
});
