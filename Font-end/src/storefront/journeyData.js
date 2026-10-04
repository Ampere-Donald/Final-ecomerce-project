// Closed observations only. No search, URL, product, order or visitor identifier.
const events = new Set([
  "RECHERCHE_VIDE",
  "FICHE_OUVERTE",
  "AJOUT_PANIER",
  "FRAIS_VUS",
  "SORTIE_APRES_FRAIS",
  "REACHAT_AJOUTE",
  "WHATSAPP_OUVERT",
]);
const receptions = new Set([
  "GENERAL",
  "RETRAIT",
  "LIVRAISON_A_CONFIRMER",
  "LIVRAISON_CALCULEE",
]);
export function observation(
  event,
  { lang, width, now, uuid, reception = "GENERAL" },
) {
  if (
    !events.has(event) ||
    !receptions.has(reception) ||
    (["FRAIS_VUS", "SORTIE_APRES_FRAIS"].includes(event)
      ? reception === "GENERAL"
      : reception !== "GENERAL")
  )
    return null;
  try {
    const id = uuid();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      return null;
    return Object.freeze({
      id,
      jour: new Date(now.getTime() + 3600000).toISOString().slice(0, 10),
      evenement: event,
      langue: lang === "en" ? "en" : "fr",
      appareil:
        width < 768 ? "mobile" : width < 1100 ? "tablette" : "ordinateur",
      reception,
    });
  } catch {
    return null;
  }
}

export function validObservation(value) {
  if (
    !value ||
    Object.keys(value).sort().join(",") !==
      "appareil,evenement,id,jour,langue,reception"
  )
    return false;
  if (
    !["fr", "en"].includes(value.langue) ||
    !["mobile", "tablette", "ordinateur"].includes(value.appareil)
  )
    return false;
  const rebuilt = observation(value.evenement, {
    uuid: () => value.id,
    lang: value.langue,
    width: { mobile: 390, tablette: 900, ordinateur: 1440 }[value.appareil],
    now: new Date(value.jour + "T00:00:00Z"),
    reception: value.reception,
  });
  return Boolean(rebuilt && rebuilt.jour === value.jour);
}

// In-memory only. Exact IDs survive bounded retries in this document, not reloads.
export function createJourneyCollector({
  capability,
  send,
  schedule,
  cancel,
  now = () => new Date(),
}) {
  let enabled = null,
    started,
    timer,
    inFlight = false,
    queue = [],
    retries = 0;
  const seen = new Set();
  function arm(delay = 5000) {
    if (timer || inFlight || enabled !== true || !queue.length) return;
    timer = schedule(() => {
      timer = null;
      void flush();
    }, delay);
  }
  function start() {
    if (!started)
      started = Promise.resolve()
        .then(capability)
        .then((active) => {
          enabled = active === true;
          if (!enabled) queue = [];
          else arm();
        })
        .catch(() => {
          enabled = false;
          queue = [];
        });
    return started;
  }
  function push(value) {
    if (enabled === false || !validObservation(value) || seen.has(value.id))
      return;
    seen.add(value.id);
    if (seen.size > 256) seen.delete(seen.values().next().value);
    // Clone closed fields; the caller cannot mutate a retry's identity or body.
    if (queue.length < 60) queue.push(Object.freeze({ ...value }));
    void start();
    arm();
  }
  async function flush(keepalive = false) {
    if (timer) {
      cancel(timer);
      timer = null;
    }
    if (enabled !== true || inFlight || !queue.length) return;
    const today = new Date(now().getTime() + 3600000)
      .toISOString()
      .slice(0, 10);
    const yesterday = new Date(
      new Date(today + "T00:00:00Z").getTime() - 86400000,
    )
      .toISOString()
      .slice(0, 10);
    queue = queue.filter((e) => e.jour === today || e.jour === yesterday);
    if (!queue.length) return;
    const batch = queue.splice(0, 20);
    inFlight = true;
    try {
      const result = await send({ evenements: batch }, keepalive);
      if (result === "disabled") {
        enabled = false;
        queue = [];
      }
      retries = 0;
    } catch {
      // Server may already have committed. Retry the immutable same IDs.
      if (++retries < 3) queue = [...batch, ...queue].slice(0, 60);
      else retries = 0;
    } finally {
      inFlight = false;
      arm(retries ? retries * 2000 : 5000);
    }
  }
  return { start, push, flush };
}

// A departure is a screen signal, never a proven financial abandonment.
// In-flight or uncertain order attempts suppress departures conservatively.
export function createFeeObservation(emit) {
  let shown,
    pending = false,
    closed = false;
  return {
    expose(reception, lang) {
      if (closed || shown?.reception === reception) return;
      shown = { reception, lang };
      emit("FRAIS_VUS", lang, reception);
    },
    orderStarted() {
      pending = true;
    },
    orderRejected() {
      pending = false;
    },
    orderKnown() {
      closed = true;
    },
    resume() {
      closed = false;
      shown = undefined;
    },
    leave() {
      if (!closed && shown && !pending)
        emit("SORTIE_APRES_FRAIS", shown.lang, shown.reception);
      closed = true;
    },
  };
}
