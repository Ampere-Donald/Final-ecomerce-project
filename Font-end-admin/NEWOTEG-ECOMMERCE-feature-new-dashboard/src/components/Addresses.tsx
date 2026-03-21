import React from 'react';
import { motion } from 'motion/react';
import { MapPin, PlusCircle, CheckCircle2, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const MOCK_ADDRESSES = [
  { 
    id: 1, 
    label: 'Entrepôt Principal A', 
    type: 'Livraison par défaut', 
    address: '452 Industrial Drive, Zone 4', 
    city: 'Paris', 
    zip: '75001', 
    country: 'FR',
    isDefault: true 
  },
  { 
    id: 2, 
    label: 'Siège Social', 
    type: 'Adresse de Facturation', 
    address: '12 Avenue des Champs-Élysées', 
    city: 'Paris', 
    zip: '75008', 
    country: 'FR',
    isDefault: false 
  },
  { 
    id: 3, 
    label: 'Hub de Distribution Lyon', 
    type: 'Adresse de Livraison', 
    address: '88 Rue de la République', 
    city: 'Lyon', 
    zip: '69002', 
    country: 'FR',
    isDefault: false 
  },
];

export const Addresses = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Adresses Enregistrées</h2>
          <p className="text-slate-500 text-sm">Gérez vos lieux de livraison et de facturation</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm shadow-primary/20">
          <PlusCircle size={18} />
          <span>Ajouter une adresse</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_ADDRESSES.map((addr) => (
          <div 
            key={addr.id} 
            className={`relative p-6 rounded-2xl border-2 transition-all group ${
              addr.isDefault 
                ? 'border-primary/20 bg-primary/5' 
                : 'border-slate-200 bg-white hover:border-primary/40'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${addr.isDefault ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                <MapPin size={20} />
              </div>
              <div className="flex items-center gap-2">
                {addr.isDefault && (
                  <div className="text-primary">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${addr.isDefault ? 'text-primary' : 'text-slate-400'}`}>
              {addr.type}
            </p>
            <h3 className="font-bold text-slate-900 text-lg">{addr.label}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {addr.address}<br />
              {addr.city}, {addr.zip}, {addr.country}
            </p>

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition-colors">
                <Edit2 size={14} />
                <span>Modifier</span>
              </button>
              {!addr.isDefault && (
                <button className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                  <span>Supprimer</span>
                </button>
              )}
              {!addr.isDefault && (
                <button className="text-xs font-bold text-primary hover:underline underline-offset-4 ml-auto">
                  Par défaut
                </button>
              )}
            </div>
          </div>
        ))}

        <button className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all group min-h-[220px]">
          <div className="size-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
            <PlusCircle size={24} />
          </div>
          <span className="font-bold">Ajouter un lieu</span>
        </button>
      </div>
    </motion.div>
  );
};
