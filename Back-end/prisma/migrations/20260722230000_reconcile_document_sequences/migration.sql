-- Reconstitue les compteurs qui peuvent manquer apres un import de documents.
-- next_value represente le dernier numero emis ; le prochain appel l'incremente.
WITH annual_numbers AS (
  SELECT
    "type"::text AS "type",
    SUBSTRING("numero" FROM '^[^-]+-([0-9]{4})-') AS "period",
    MAX(CAST(SUBSTRING("numero" FROM '([0-9]+)$') AS INTEGER)) AS "last_value"
  FROM "facture"
  WHERE "numero" ~ '^(FAC|TIC|BON)-[0-9]{4}-[0-9]+$'
  GROUP BY "type"::text, SUBSTRING("numero" FROM '^[^-]+-([0-9]{4})-')
)
INSERT INTO "document_sequence" ("id", "type", "period", "next_value", "updated_at")
SELECT "type" || ':' || "period", "type", "period", "last_value", CURRENT_TIMESTAMP
FROM annual_numbers
ON CONFLICT ("type", "period") DO UPDATE
SET "next_value" = GREATEST("document_sequence"."next_value", EXCLUDED."next_value"),
    "updated_at" = CURRENT_TIMESTAMP;

WITH daily_tickets AS (
  SELECT
    SUBSTRING("numero_ticket" FROM '^T-([0-9]{8})-') AS "period",
    MAX(CAST(SUBSTRING("numero_ticket" FROM '([0-9]+)$') AS INTEGER)) AS "last_value"
  FROM "ticket_vente"
  WHERE "numero_ticket" ~ '^T-[0-9]{8}-[0-9]+$'
  GROUP BY SUBSTRING("numero_ticket" FROM '^T-([0-9]{8})-')
)
INSERT INTO "document_sequence" ("id", "type", "period", "next_value", "updated_at")
SELECT 'TICKET_QUEUE:' || "period", 'TICKET_QUEUE', "period", "last_value", CURRENT_TIMESTAMP
FROM daily_tickets
ON CONFLICT ("type", "period") DO UPDATE
SET "next_value" = GREATEST("document_sequence"."next_value", EXCLUDED."next_value"),
    "updated_at" = CURRENT_TIMESTAMP;
