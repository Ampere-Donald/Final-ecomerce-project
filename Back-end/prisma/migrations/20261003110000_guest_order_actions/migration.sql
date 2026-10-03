-- Exact action retries return only an immutable outcome, never current PII.
ALTER TABLE "commande_guest_challenge" ADD COLUMN "action_result" JSONB;
