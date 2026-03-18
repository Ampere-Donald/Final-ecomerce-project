import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Mail, Phone, HelpCircle, FileText, ChevronRight, Send } from 'lucide-react';

export const Support = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">Comment pouvons-nous vous aider ?</h2>
        <p className="text-slate-500">Notre équipe de support dédiée est là pour vous assister dans vos besoins de vente en gros, vos problèmes techniques ou vos questions de facturation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Chat en direct', desc: 'Attente moyenne : < 2 min', icon: MessageSquare, color: 'bg-blue-500', action: 'Démarrer le chat' },
          { title: 'Support Email', desc: 'Réponse sous 24 heures', icon: Mail, color: 'bg-primary', action: 'Envoyer un email' },
          { title: 'Support Téléphonique', desc: 'Lun-Ven, 9h - 18h CET', icon: Phone, color: 'bg-emerald-500', action: 'Appeler maintenant' },
        ].map((item) => (
          <div key={item.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-primary/40 transition-all">
            <div className={`size-14 rounded-2xl ${item.color} text-white flex items-center justify-center mb-4 shadow-lg shadow-slate-200`}>
              <item.icon size={28} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">{item.desc}</p>
            <button className="w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
              {item.action}
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="font-bold text-xl mb-6 text-slate-900">Envoyez-nous un message</h3>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Sujet</label>
                <select className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  <option>Demande de commande</option>
                  <option>Support Technique</option>
                  <option>Question de Facturation</option>
                  <option>Informations Produit</option>
                  <option>Autre</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">ID Commande (Optionnel)</label>
                <input type="text" placeholder="#ORD-XXXXX" className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Message</label>
              <textarea rows={5} placeholder="Décrivez votre problème en détail..." className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none" />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20">
                <Send size={18} />
                <span>Envoyer le message</span>
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-8 text-white">
            <h3 className="font-bold text-lg mb-6">Questions Fréquentes</h3>
            <div className="space-y-4">
              {[
                'Comment suivre ma commande groupée ?',
                'Quelles sont les conditions de crédit ?',
                'Comment mettre à jour les infos de facturation ?',
                'Puis-je annuler une commande en attente ?',
              ].map((q) => (
                <button key={q} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors text-left group">
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{q}</span>
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-sm font-bold text-primary hover:underline">Voir le centre d'aide</button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Documentation</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Guide de Vente en Gros</p>
                  <p className="text-xs text-slate-500">PDF • 2.4 MB</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Conditions de Service</p>
                  <p className="text-xs text-slate-500">Mis à jour Jan 2024</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
