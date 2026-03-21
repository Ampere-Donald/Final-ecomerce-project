import React from 'react';
import { motion } from 'motion/react';
import { User, Bell, Shield, Wallet, Globe, Smartphone } from 'lucide-react';

export const Settings = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Paramètres du Compte</h2>
        <p className="text-slate-500 text-sm">Gérez votre profil, votre sécurité et vos préférences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <nav className="space-y-1">
            {[
              { label: 'Infos Profil', icon: User, active: true },
              { label: 'Notifications', icon: Bell },
              { label: 'Sécurité', icon: Shield },
              { label: 'Détails Facturation', icon: Wallet },
              { label: 'Régional', icon: Globe },
              { label: 'Appareils', icon: Smartphone },
            ].map((item) => (
              <button 
                key={item.label}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  item.active 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h3 className="font-bold text-lg mb-6 text-slate-900">Profil Public</h3>
            <div className="flex items-center gap-6 mb-8">
              <div className="relative group">
                <div className="size-20 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-200">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5OgupmfclAPLVOnbiV602OFuJw6J5K_Xt8bZFTIzDltY7lQi4oElZeEtxmZuQ7NmFCuuYhBhKDS0lVNEnEWhmqPdzG5xse_7cc5GJdl8P-Vy44gsHT5zobUwWNUI9wHVCsQvPm2yhFAGbboefSnWVz59UG-NlBaAMD73R8i4L02i698xxOPRHWV9c7U6L2MmyBdPpfWtMqQeessPxUgwJI7yT_mLVntXahoDHd_nfjNNJl_wkjVnQUHp3j9Hbp8q9aaVRRsHyTYA" 
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button className="absolute -bottom-2 -right-2 p-1.5 bg-white border border-slate-200 rounded-lg text-primary shadow-sm hover:bg-slate-50 transition-colors">
                  <Smartphone size={14} />
                </button>
              </div>
              <div>
                <p className="font-bold text-slate-900">Jean Dupont</p>
                <p className="text-sm text-slate-500">Membre Grossiste VIP depuis 2023</p>
                <div className="flex gap-3 mt-2">
                  <button className="text-xs font-bold text-primary hover:underline">Changer la photo</button>
                  <button className="text-xs font-bold text-red-500 hover:underline">Supprimer</button>
                </div>
              </div>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Prénom</label>
                <input type="text" defaultValue="Jean" className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Nom</label>
                <input type="text" defaultValue="Dupont" className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Adresse Email</label>
                <input type="email" defaultValue="jean.dupont@ecommerce-solutions.sa" className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Nom de l'entreprise</label>
                <input type="text" defaultValue="E-commerce Solutions S.A." className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <button type="button" className="px-6 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-all shadow-sm shadow-primary/20">Mettre à jour le profil</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h3 className="font-bold text-lg mb-6 text-slate-900">Sécurité</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg text-slate-400 border border-slate-100">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Authentification à deux facteurs</p>
                    <p className="text-xs text-slate-500">Ajoutez une couche de sécurité supplémentaire à votre compte</p>
                  </div>
                </div>
                <button className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Activer</button>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Changer le mot de passe</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="password" placeholder="Mot de passe actuel" className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                  <input type="password" placeholder="Nouveau mot de passe" className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                  <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all">Mettre à jour</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
