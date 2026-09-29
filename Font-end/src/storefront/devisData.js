export function parseReferenceList(text) {
  const entries = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!entries.length || entries.length > 50) throw new Error("lineCount");
  return entries.map((line, index) => {
    const columns = line.split(/[;\t]/).map((value) => value.trim());
    const reference = columns[0];
    const rawQuantity = columns.length === 1 ? "1" : columns[1];
    if (
      columns.length > 2 ||
      !reference ||
      reference.length > 100 ||
      !/^\d+$/.test(rawQuantity)
    )
      throw new Error(`line:${index + 1}`);
    const quantite = Number(rawQuantity);
    if (!Number.isSafeInteger(quantite) || quantite < 1 || quantite > 100000)
      throw new Error(`line:${index + 1}`);
    return { reference, quantite };
  });
}

// A resolver response never selects a replacement, including an exact match.
export function resolvedReferenceList(data, input) {
  if (!Array.isArray(data?.lignes) || data.lignes.length !== input.length)
    throw new Error("Invalid references response");
  return data.lignes.map((row, index) => {
    if (
      row.reference !== input[index].reference ||
      row.quantite !== input[index].quantite ||
      !["exact", "ambiguous", "unknown"].includes(row.match) ||
      !Array.isArray(row.candidates) ||
      row.candidates.length > 8 ||
      row.candidates.some((p) => !p?.id || !p.nomProduit) ||
      new Set(row.candidates.map((p) => p.id)).size !== row.candidates.length
    )
      throw new Error("Invalid references response");
    return {
      ...input[index],
      match: row.match,
      candidates: row.candidates,
      produitId: "",
    };
  });
}

export function requestViewValid(row) {
  return Boolean(
    row?.id &&
    Number.isInteger(row.version) &&
    row.version > 0 &&
    Array.isArray(row.lignes) &&
    row.lignes.length > 0 &&
    row.lignes.every(
      (line) =>
        typeof line.reference === "string" &&
        Number.isInteger(line.quantite) &&
        line.quantite > 0,
    ) &&
    typeof row.statut === "string",
  );
}

export const devisStatus = {
  RECUE: ["Demande reçue", "Request received", "pending"],
  A_PRECISER: ["Précisions nécessaires", "More details needed", "pending"],
  ENVOYEE: ["Proposition disponible", "Offer available", "confirmed"],
  ACCEPTEE: ["Proposition acceptée", "Offer accepted", "done"],
  REFUSEE: ["Demande clôturée", "Request closed", "cancelled"],
  EXPIREE: ["Proposition expirée", "Offer expired", "cancelled"],
};

export function readSession(key, ownerId = null) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    return value && value.ownerId === ownerId ? value : null;
  } catch {
    return null;
  }
}

export function readDevisAttempt(key, ownerId) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { attempt: null, blocked: false };
    const value = JSON.parse(raw);
    if (value?.ownerId && value.ownerId !== ownerId)
      return { attempt: null, blocked: false };
    const p = value?.payload;
    if (
      value?.ownerId !== ownerId ||
      !p ||
      typeof p.requestId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(p.requestId) ||
      typeof p.telephone !== "string" ||
      !["LIVRAISON", "RETRAIT_MAGASIN"].includes(p.modeReception) ||
      !Array.isArray(p.lignes) ||
      !p.lignes.length ||
      p.lignes.length > 50 ||
      p.lignes.some(
        (l) =>
          typeof l.reference !== "string" ||
          !l.reference.trim() ||
          !Number.isInteger(l.quantite) ||
          l.quantite < 1 ||
          l.quantite > 100000,
      ) ||
      (value.id &&
        (typeof value.id !== "string" ||
          !/^[a-z0-9-]{1,100}$/i.test(value.id) ||
          !Number.isInteger(p.version)))
    )
      throw new Error("Unreadable attempt");
    return { attempt: value, blocked: false };
  } catch {
    return { attempt: null, blocked: true };
  }
}

export function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
