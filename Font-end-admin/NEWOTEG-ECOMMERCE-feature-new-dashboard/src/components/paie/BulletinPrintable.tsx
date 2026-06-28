import React, { useRef } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { motion } from 'motion/react';
import { fmtFCFA, fmtDateLong, fmtDateCourt } from '../../utils/format';
import { brand } from '../../config/brand';
import {
  Bulletin,
  ParametresEmployeur,
  BulletinLigne,
  STATUT_META,
  formatPeriode,
} from './types';
import { montantEnLettres } from './montantEnLettres';

const num = (v: unknown) => Number(v) || 0;

export const BulletinPrintable = ({
  bulletin,
  parametres,
  onClose,
}: {
  bulletin: Bulletin;
  parametres: ParametresEmployeur | null;
  onClose: () => void;
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const gains = (bulletin.lignes || []).filter((l) => l.type === 'GAIN');
  const retenues = (bulletin.lignes || []).filter((l) => l.type === 'RETENUE');
  const emp = parametres;
  const raison = emp?.raisonSociale || brand.legalName || brand.companyName;

  const openPrintWindow = () => {
    const content = printRef.current;
    if (!content) return;
    const css = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join('\n');
        } catch {
          return sheet.href ? `@import url("${sheet.href}");` : '';
        }
      })
      .join('\n');

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('Veuillez autoriser les popups pour imprimer.');
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin ${bulletin.numero}</title>
  <style>${css}</style>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { margin: 0; padding: 12px; background: white; }
    @media print {
      table td, table th { padding: 4px 8px !important; }
      .bp-footer { break-inside: avoid !important; page-break-inside: avoid !important; }
    }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const LigneRow = ({ ligne }: { ligne: BulletinLigne }) => (
    <tr>
      <td className="py-1.5 px-3 border border-gray-300">{ligne.libelle}</td>
      <td className="py-1.5 px-3 border border-gray-300 text-right">
        {ligne.base != null ? fmtFCFA(ligne.base) : '—'}
      </td>
      <td className="py-1.5 px-3 border border-gray-300 text-center">
        {ligne.taux != null ? `${num(ligne.taux)} %` : '—'}
      </td>
      <td className="py-1.5 px-3 border border-gray-300 text-right">
        {fmtFCFA(ligne.montant)}
      </td>
    </tr>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="my-6 relative"
      >
        {/* Toolbar */}
        <div className="no-print flex items-center justify-between bg-gray-900 text-white rounded-t-xl px-4 py-3 gap-3">
          <span className="text-sm font-semibold">Bulletin {bulletin.numero}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={openPrintWindow}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              <Printer size={15} /> Imprimer
            </button>
            <button
              onClick={openPrintWindow}
              title="Choisir « Enregistrer en PDF » dans le dialogue d'impression"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={15} /> PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* A4 document */}
        <div
          ref={printRef}
          className="bg-white rounded-b-xl shadow-2xl overflow-auto"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          <div
            className="mx-auto bg-white text-black p-8"
            style={{ width: 794, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13 }}
          >
            {/* En-tête employeur */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
              <div className="flex items-start gap-3">
                {emp?.logoUrl ? (
                  <img src={emp.logoUrl} alt="logo" className="w-16 h-16 object-contain" />
                ) : null}
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{raison}</h1>
                  {emp?.secteurActivite && <p className="text-xs text-gray-600">{emp.secteurActivite}</p>}
                  {emp?.niu && <p className="text-xs text-gray-500">NIU : {emp.niu}</p>}
                  {emp?.rccm && <p className="text-xs text-gray-500">RCCM : {emp.rccm}</p>}
                  {emp?.cnpsEmployeur && <p className="text-xs text-gray-500">CNPS employeur : {emp.cnpsEmployeur}</p>}
                  {(emp?.adresse || emp?.ville) && (
                    <p className="text-xs text-gray-500">{[emp?.adresse, emp?.ville].filter(Boolean).join(', ')}</p>
                  )}
                  {emp?.telephone && <p className="text-xs text-gray-500">Tél : {emp.telephone}</p>}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-base font-bold text-gray-800">BULLETIN DE PAIE</h2>
                <p className="text-sm text-gray-600">N° {bulletin.numero}</p>
                <p className="text-sm text-gray-600">Période : {formatPeriode(bulletin.periode)}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${STATUT_META[bulletin.statut].color}`}>
                  {STATUT_META[bulletin.statut].label}
                </span>
              </div>
            </div>

            {/* Bloc salarié */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-gray-300 rounded p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Salarié</p>
                <p className="font-semibold">{bulletin.salarieNom}</p>
                {bulletin.poste && <p className="text-sm text-gray-600">{bulletin.poste}{bulletin.categorie ? ` · Cat. ${bulletin.categorie}` : ''}</p>}
                {bulletin.matricule && <p className="text-xs text-gray-500">Matricule : {bulletin.matricule}</p>}
                {bulletin.numeroCnps && <p className="text-xs text-gray-500">N° CNPS : {bulletin.numeroCnps}</p>}
              </div>
              <div className="border border-gray-300 rounded p-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Date d'embauche</span><span>{bulletin.dateEmbauche ? fmtDateCourt(bulletin.dateEmbauche) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Jours travaillés</span><span>{bulletin.joursTravailles}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mode de paiement</span><span>{bulletin.modePaiement || '—'}</span></div>
                {bulletin.datePaiement && (
                  <div className="flex justify-between"><span className="text-gray-500">Payé le</span><span>{fmtDateCourt(bulletin.datePaiement)}</span></div>
                )}
              </div>
            </div>

            {/* Gains */}
            <table className="w-full mb-4 text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-1.5 px-3 border border-gray-300 font-semibold">Gains</th>
                  <th className="text-right py-1.5 px-3 border border-gray-300 font-semibold w-32">Base</th>
                  <th className="text-center py-1.5 px-3 border border-gray-300 font-semibold w-20">Taux</th>
                  <th className="text-right py-1.5 px-3 border border-gray-300 font-semibold w-36">Montant</th>
                </tr>
              </thead>
              <tbody>
                {gains.map((l, i) => <LigneRow key={i} ligne={l} />)}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-1.5 px-3 border border-gray-300" colSpan={3}>Salaire brut</td>
                  <td className="py-1.5 px-3 border border-gray-300 text-right">{fmtFCFA(bulletin.brutTotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* Retenues */}
            <table className="w-full mb-4 text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-1.5 px-3 border border-gray-300 font-semibold">Retenues</th>
                  <th className="text-right py-1.5 px-3 border border-gray-300 font-semibold w-32">Base</th>
                  <th className="text-center py-1.5 px-3 border border-gray-300 font-semibold w-20">Taux</th>
                  <th className="text-right py-1.5 px-3 border border-gray-300 font-semibold w-36">Montant</th>
                </tr>
              </thead>
              <tbody>
                {retenues.map((l, i) => <LigneRow key={i} ligne={l} />)}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-1.5 px-3 border border-gray-300" colSpan={3}>Total des retenues</td>
                  <td className="py-1.5 px-3 border border-gray-300 text-right">{fmtFCFA(bulletin.totalRetenues)}</td>
                </tr>
              </tbody>
            </table>

            {/* Net + signature */}
            <div className="bp-footer">
              <div className="flex justify-end mb-3">
                <div className="w-80 border-2 border-gray-800 rounded">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="font-bold text-base">NET À PAYER</span>
                    <span className="font-bold text-lg">{fmtFCFA(bulletin.netAPayer)}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600 italic mb-6">
                Arrêté le présent bulletin à la somme de{' '}
                <span className="font-semibold">{montantEnLettres(num(bulletin.netAPayer))} francs CFA</span>.
              </p>

              <div className="flex justify-between items-end mt-8">
                <p className="text-[10px] text-gray-400 max-w-[55%]">
                  Bulletin de paie à conserver sans limitation de durée. Édité le {fmtDateLong(new Date().toISOString())}.
                </p>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-10">
                    {emp?.signataireQualite || "L'employeur"}
                    {emp?.signataireNom ? ` — ${emp.signataireNom}` : ''}
                  </p>
                  <div className="w-52 border-b border-gray-400" />
                  <p className="text-[10px] text-gray-500 mt-1">Signature & cachet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
