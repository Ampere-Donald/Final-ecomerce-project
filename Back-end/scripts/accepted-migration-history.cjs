// Publication explicitly authorized on 2026-10-05 despite this historical drift.
// Preserve the original Railway ledger. This is not a migration repair.
// Both identities are pinned: a changed source or a different ledger still fails.
const accepted = Object.freeze({
  name: '20260615000000_add_demi_gros',
  recorded: 'e30b0feda9fc83a9e64d3a4c51075300741f40fa33eaaf34ef937ced8032ab6b',
  source: '6d6e422b61ca32767a5b959d2002fcb697f33c2bd09e93e673c4f1819db4e033',
});
// Byte-for-byte CRLF variant of the same SQL; no semantic source difference.
const historicalCrlf = Object.freeze({
  name: '20260613_facture_virtuelle',
  recorded: 'e4067c58f4bf901cda69c9d2698819697d6a63c10850057eaa11f25a03ce557e',
  source: '141551a36d11d1f83eb89bd1f59b02bdcca2f167806b9c62f2c318c316fe0210',
});
function isAcceptedHistoricalMigration(row, source) {
  return [accepted, historicalCrlf].some(
    (entry) =>
      row.migration_name === entry.name &&
      source.name === entry.name &&
      row.checksum === entry.recorded &&
      source.sha256 === entry.source,
  );
}
module.exports = { isAcceptedHistoricalMigration, accepted, historicalCrlf };
