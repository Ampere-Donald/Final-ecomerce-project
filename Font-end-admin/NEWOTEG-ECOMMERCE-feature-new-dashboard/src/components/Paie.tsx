import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Banknote, Users, Settings } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';
import { BulletinsPaie } from './paie/BulletinsPaie';
import { Salaries } from './paie/Salaries';
import { ParametresEmployeur } from './paie/ParametresEmployeur';

type Tab = 'bulletins' | 'salaries' | 'parametres';

export const Paie = () => {
  const { admin } = useAdminAuth();
  const role = admin?.role;
  const [tab, setTab] = useState<Tab>('bulletins');

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'bulletins', label: 'Bulletins', icon: Banknote },
    { key: 'salaries', label: 'Salariés', icon: Users },
    { key: 'parametres', label: 'Paramètres employeur', icon: Settings },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Paie</h2>
        <p className="text-slate-500 text-sm">
          Bulletins de salaire, fiches salariés et paramètres de l'employeur.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'bulletins' && <BulletinsPaie role={role} />}
      {tab === 'salaries' && <Salaries />}
      {tab === 'parametres' && <ParametresEmployeur canEdit={can.gererParametresPaie(role)} />}
    </motion.div>
  );
};
