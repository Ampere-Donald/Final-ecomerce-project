const uuidV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const acceptanceKey = (ownerId, demandeId) =>
  `newoteg-devis-accept-v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(demandeId)}`;

export function offerIsValid(request) {
  const offer = request?.offre;
  if (
    !Number.isSafeInteger(request?.version) ||
    request.version < 1 ||
    !["RETRAIT_MAGASIN", "LIVRAISON"].includes(request.modeReception) ||
    (request.modeReception === "LIVRAISON" && !request.destination?.trim()) ||
    !offer ||
    typeof offer.numero !== "string" ||
    !offer.numero.trim() ||
    !Number.isFinite(Date.parse(offer.dateExpiration)) ||
    !Number.isFinite(offer.montantArticles) ||
    offer.montantArticles <= 0 ||
    !Array.isArray(offer.lignes) ||
    !offer.lignes.length ||
    offer.lignes.length > 50
  )
    return false;
  let cents = 0;
  const ids = new Set();
  for (const line of offer.lignes) {
    if (
      typeof line.produitId !== "string" ||
      !line.produitId ||
      ids.has(line.produitId) ||
      typeof line.nomProduit !== "string" ||
      !line.nomProduit.trim() ||
      !Number.isSafeInteger(line.quantite) ||
      line.quantite < 1 ||
      line.quantite > 100000 ||
      !Number.isFinite(line.prixUnitaire) ||
      line.prixUnitaire <= 0 ||
      !Number.isFinite(line.sousTotal) ||
      line.sousTotal <= 0
    )
      return false;
    ids.add(line.produitId);
    const lineCents = Math.round(line.prixUnitaire * 100) * line.quantite;
    if (
      !Number.isSafeInteger(lineCents) ||
      lineCents !== Math.round(line.sousTotal * 100)
    )
      return false;
    cents += lineCents;
  }
  return (
    Number.isSafeInteger(cents) &&
    cents === Math.round(offer.montantArticles * 100)
  );
}

export function canAcceptOffer(request, now = Date.now()) {
  return (
    request?.statut === "ENVOYEE" &&
    offerIsValid(request) &&
    Date.parse(request.offre.dateExpiration) > now
  );
}

export function readAcceptance(ownerId, demandeId, storage) {
  try {
    storage ||= globalThis.sessionStorage;
    const raw = storage.getItem(acceptanceKey(ownerId, demandeId));
    if (!raw) return { attempt: null, blocked: false };
    const value = JSON.parse(raw);
    // The storage key and the record must both belong to this signed-in customer and request.
    if (value?.ownerId && value.ownerId !== ownerId)
      return { attempt: null, blocked: false };
    const p = value?.payload;
    if (
      value?.ownerId !== ownerId ||
      value?.demandeId !== demandeId ||
      !["pending", "review"].includes(value?.phase) ||
      !p ||
      !uuidV4.test(p.requestId) ||
      !Number.isSafeInteger(p.version) ||
      p.version < 1 ||
      p.conditionsAcceptees !== true ||
      Object.keys(p).some(
        (key) => !["requestId", "version", "conditionsAcceptees"].includes(key),
      )
    )
      throw new Error("Unreadable acceptance");
    return {
      attempt: { ownerId, demandeId, phase: value.phase, payload: { ...p } },
      blocked: false,
    };
  } catch {
    return { attempt: null, blocked: true };
  }
}

export function saveAcceptance(attempt, storage) {
  try {
    storage ||= globalThis.sessionStorage;
    const key = acceptanceKey(attempt.ownerId, attempt.demandeId);
    const text = JSON.stringify(attempt);
    storage.setItem(key, text);
    return storage.getItem(key) === text;
  } catch {
    return false;
  }
}

export function clearAcceptance(ownerId, demandeId, storage) {
  try {
    storage ||= globalThis.sessionStorage;
    const key = acceptanceKey(ownerId, demandeId);
    storage.removeItem(key);
    return storage.getItem(key) === null;
  } catch {
    return false;
  }
}

export function acceptedResponseValid(data, demandeId) {
  const order = data?.commande;
  return (
    data?.demandeId === demandeId &&
    typeof data?.replayed === "boolean" &&
    typeof order?.id === "string" &&
    order.id.length > 0 &&
    typeof order.numeroSuivi === "string" &&
    order.numeroSuivi.length > 0 &&
    ["EN_ATTENTE", "CONFIRMEE", "EN_LIVRAISON", "LIVREE", "ANNULEE"].includes(
      order.statut,
    ) &&
    Number.isFinite(order.montantTotal) &&
    order.montantTotal > 0 &&
    ["RETRAIT_MAGASIN", "LIVRAISON"].includes(order.modeReception)
  );
}
