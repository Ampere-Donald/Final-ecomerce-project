import { createClientId } from '../utils/clientId';

const WORKSTATION_ID_KEY = 'newoteg_workstation_id';
const WORKSTATION_NAME_KEY = 'newoteg_workstation_name';

export function getWorkstationId(): string {
  let id = localStorage.getItem(WORKSTATION_ID_KEY);
  if (!id) {
    id = createClientId('pos');
    localStorage.setItem(WORKSTATION_ID_KEY, id);
  }
  const name = localStorage.getItem(WORKSTATION_NAME_KEY)?.trim();
  return name ? `${name}:${id}` : id;
}

export function getWorkstationName(): string {
  return localStorage.getItem(WORKSTATION_NAME_KEY) || '';
}

export function setWorkstationName(value: string): void {
  const normalized = value.trim().slice(0, 50);
  if (normalized) localStorage.setItem(WORKSTATION_NAME_KEY, normalized);
  else localStorage.removeItem(WORKSTATION_NAME_KEY);
}
