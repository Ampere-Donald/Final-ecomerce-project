import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
const browser = () => true;
const server = () => false;
// The first hydration pass matches public HTML; browser-only controls and
// portals become available immediately after React attaches their handlers.
export default function useBrowserReady() {
  return useSyncExternalStore(subscribe, browser, server);
}
