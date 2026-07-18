-- Le code-barres correspond directement a produit.code. La base historique
-- contient cependant quelques doublons : l'API les signale explicitement au
-- lieu de bloquer toutes les migrations ou de supprimer un produit au hasard.
CREATE INDEX IF NOT EXISTS "idx_produit_code" ON "produit"("code");
CREATE INDEX IF NOT EXISTS "idx_produit_code_famille" ON "produit"("code_famille");
