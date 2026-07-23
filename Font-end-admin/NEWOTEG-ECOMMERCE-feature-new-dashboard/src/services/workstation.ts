import { createClientId } from '../utils/clientId';

const WORKSTATION_ID_KEY = 'newoteg_workstation_id';
const WORKSTATION_NAME_KEY = 'newoteg_workstation_name';
let memoryWorkstationId: string | null = null;
let memoryWorkstationName = '';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return key === WORKSTATION_ID_KEY ? memoryWorkstationId : memoryWorkstationName || null;
  }
}

function safeSet(key: string, value: string): void {
  if (key === WORKSTATION_ID_KEY) memoryWorkstationId = value;
  if (key === WORKSTATION_NAME_KEY) memoryWorkstationName = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Repli mémoire pour les navigateurs qui bloquent le stockage local.
  }
}

function safeRemove(key: string): void {
  if (key === WORKSTATION_NAME_KEY) memoryWorkstationName = '';
  try {
    localStorage.removeItem(key);
  } catch {
    // Le repli mémoire a déjà été nettoyé.
  }
}

export function getWorkstationId(): string {
  let id = safeGet(WORKSTATION_ID_KEY);
  if (!id) {
    id = createClientId('pos');
    safeSet(WORKSTATION_ID_KEY, id);
  }
  const name = safeGet(WORKSTATION_NAME_KEY)?.trim();
  return name ? `${name}:${id}` : id;
}

export function getWorkstationName(): string {
  return safeGet(WORKSTATION_NAME_KEY) || '';
}

export function setWorkstationName(value: string): void {
  const normalized = value.trim().slice(0, 50);
  if (normalized) safeSet(WORKSTATION_NAME_KEY, normalized);
  else safeRemove(WORKSTATION_NAME_KEY);
}
