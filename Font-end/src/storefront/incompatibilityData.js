const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREFIX = "newoteg_incompatibility_v1:";
export const reasons = {
  TENSION: ["Tension", "Voltage"],
  BROCHAGE: ["Brochage", "Pinout"],
  FORMAT: ["Format ou dimensions", "Size or package"],
  FONCTION: ["Fonction", "Function"],
  AUTRE: ["Autre problème", "Other issue"],
};
export const states = {
  SIGNALE: ["Signalement reçu", "Report received"],
  EN_EXAMEN: ["En cours d’examen", "Under review"],
  RESOLU_SANS_RETOUR: ["Résolu sans retour", "Resolved without a return"],
  CLOTURE: ["Dossier clôturé", "Case closed"],
  RETOUR_CONFIRME: [
    "Retour confirmé par la boutique",
    "Return confirmed by the shop",
  ],
};
export function issueContent(value) {
  const description = value?.description?.trim();
  if (
    !Number.isSafeInteger(value?.quantite) ||
    value.quantite < 1 ||
    value.quantite > 1000000 ||
    !Object.hasOwn(reasons, value?.motif || "") ||
    typeof description !== "string" ||
    description.length < 10 ||
    description.length > 2000 ||
    [...description].some((char) => {
      const code = char.charCodeAt(0);
      return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
    })
  )
    throw Error("Invalid issue content");
  return { quantite: value.quantite, motif: value.motif, description };
}
export function issueReceipt(value) {
  return UUID.test(value?.id || "") && value?.enregistre === true;
}
export function issuePurchases(value, orderId, guest) {
  if (
    typeof value?.eligible !== "boolean" ||
    !Array.isArray(value.lignes) ||
    (guest &&
      (value.commandeId !== orderId ||
        typeof value.codeAvailable !== "boolean"))
  )
    throw Error("Invalid purchase proof");
  const seen = new Set();
  value.lignes.forEach((line) => {
    if (
      !UUID.test(line.id) ||
      seen.has(line.id) ||
      typeof line.nomProduit !== "string" ||
      !Number.isSafeInteger(line.quantite) ||
      line.quantite < 1
    )
      throw Error("Invalid purchased line");
    seen.add(line.id);
    const issue = line.incompatibilite;
    if (!issue) return;
    issueContent(issue);
    if (
      !UUID.test(issue.id) ||
      issue.ligneCommandeId !== line.id ||
      issue.quantite > line.quantite ||
      !Object.hasOwn(states, issue.statut) ||
      !Number.isSafeInteger(issue.version) ||
      issue.version < 1 ||
      !Number.isFinite(Date.parse(issue.createdAt)) ||
      (issue.reponseBoutique !== null &&
        (typeof issue.reponseBoutique !== "string" ||
          issue.reponseBoutique.length > 1000))
    )
      throw Error("Invalid private issue");
    if (
      issue.statut === "RETOUR_CONFIRME" &&
      (!Number.isSafeInteger(issue.retourQuantite) ||
        issue.retourQuantite < 1 ||
        issue.retourQuantite > issue.quantite ||
        !Number.isFinite(Date.parse(issue.retourConfirmeAt)))
    )
      throw Error("Invalid return fact");
  });
  return value;
}
function validate(value, scope) {
  if (
    !value ||
    value.scope !== scope ||
    !UUID.test(value.orderId || "") ||
    !UUID.test(value.body?.requestId || "") ||
    !UUID.test(value.body?.ligneCommandeId || "") ||
    !["account", "guest"].includes(value.mode)
  )
    throw Error("Invalid saved issue");
  issueContent(value.body);
  if (
    value.mode === "guest" &&
    (!/^[A-Za-z0-9_-]{43}$/.test(value.accessToken || "") ||
      !/^[A-Za-z0-9_-]{43}$/.test(value.actionKey || "") ||
      (value.challengeId && !UUID.test(value.challengeId)))
  )
    throw Error("Invalid private proof");
  return {
    scope: value.scope,
    mode: value.mode,
    orderId: value.orderId,
    body: {
      requestId: value.body.requestId,
      ligneCommandeId: value.body.ligneCommandeId,
      ...issueContent(value.body),
    },
    ...(value.mode === "guest"
      ? {
          accessToken: value.accessToken,
          actionKey: value.actionKey,
          challengeId: value.challengeId || "",
        }
      : {}),
  };
}
export function readIssueAttempt(scope, storage = sessionStorage) {
  const raw = storage.getItem(PREFIX + scope);
  return raw ? validate(JSON.parse(raw), scope) : null;
}
export function saveIssueAttempt(value, storage = sessionStorage) {
  const closed = validate(value, value.scope);
  // Explicit projection: never persist the email code, JWT, errors or loaded dossier.
  const raw = JSON.stringify(closed);
  storage.setItem(PREFIX + closed.scope, raw);
  if (storage.getItem(PREFIX + closed.scope) !== raw)
    throw Error("Attempt not retained");
  return closed;
}
export function clearIssueAttempt(scope, storage = sessionStorage) {
  storage.removeItem(PREFIX + scope);
}
export function clearIssueAttempts(mode, storage = sessionStorage) {
  try {
    const keys = Array.from({ length: storage.length }, (_, i) =>
      storage.key(i),
    ).filter((key) => key?.startsWith(PREFIX + mode + ":"));
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    /* Denied storage cannot be read by this session either. */
  }
}
export function guestIssueOrder(token, storage = sessionStorage) {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(PREFIX + "guest:")) continue;
    const attempt = readIssueAttempt(key.slice(PREFIX.length), storage);
    if (attempt?.accessToken === token) return attempt.orderId;
  }
  return null;
}
