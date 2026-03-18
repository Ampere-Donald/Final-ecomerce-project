import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Truck, 
  Filter, 
  Download, 
  CheckCircle2, 
  MessageSquare, 
  Mail,
  PlusCircle,
  TrendingUp,
  BarChart3,
  PackageSearch,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Order, User } from '../types';
import { venteApi, varianteApi, caisseApi } from '../services/api';

const MOCK_USER: User = {
  name: 'Jean Dupont',
  email: 'jean.dupont@ecommerce-solutions.sa',
  role: 'GROSSISTE VIP',
  id: '#NW-98442',
  joinedDate: 'Jan 2023',
  ordersTotal: 48,
  creditLimit: 25000,
  availableCredit: 12450,
  balance: 3420.50,
  nextInvoiceDue: '15 Aoû',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5OgupmfclAPLVOnbiV602OFuJw6J5K_Xt8bZFTIzDltY7lQi4oElZeEtxmZuQ7NmFCuuYhBhKDS0lVNEnEWhmqPdzG5xse_7cc5GJdl8P-Vy44gsHT5zobUwWNUI9wHVCsQvPm2yhFAGbboefSnWVz59UG-NlBaAMD73R8i4L02i698xxOPRHWV9c7U6L2MmyBdPpfWtMqQeessPxUgwJI7yT_mLVntXahoDHd_nfjNNJl_wkjVnQUHp3j9Hbp8q9aaVRRsHyTYA'
};

export const Dashboard = () => {
  const [ventesJour, setVentesJour] = useState(0);
  const [caJour, setCaJour] = useState(0);
  const [stockData, setStockData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [soldeCaisse, setSoldeCaisse] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ventesRes, variantesRes, caissesRes] = await Promise.all([
          venteApi.getAll(),
          varianteApi.getAll(),
          caisseApi.getAll()
        ]);

        // KPIs Ventes
        const today = new Date().toDateString();
        const ventesToday = ventesRes.filter((v: any) => new Date(v.dateVente).toDateString() === today);
        setVentesJour(ventesToday.length);
        const ca = ventesToday.reduce((acc: number, v: any) => acc + parseFloat(v.montantTotal), 0);
        setCaJour(ca);
        setRecentOrders(ventesRes.slice(0, 5)); // 5 dernières ventes

        // Stocks (top 4 alertes/stocks)
        const stocksFormatted = variantesRes.slice(0, 4).map((v: any) => ({
          name: v.produit?.nomProduit || v.codeVariante,
          count: v.quantiteStock,
          status: v.quantiteStock <= 0 ? 'Rupture' : v.quantiteStock <= v.seuilAlerte ? 'Critique' : 'Optimal'
        }));
        setStockData(stocksFormatted);

        // Caisse
        const totalCaisse = caissesRes.reduce((acc: number, op: any) => {
          const montant = parseFloat(op.montant);
          return op.typeOperation === 'ENTREE' ? acc + montant : acc - montant;
        }, 0);
        setSoldeCaisse(totalCaisse);

      } catch (error) {
        console.error("Erreur chargement dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Manager KPIs Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600">
              <ArrowUpRight size={14} /> +12%
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Ventes Récents</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : ventesJour} Commandes</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart3 size={20} />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600">
              <ArrowUpRight size={14} /> +8%
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Chiffre d'Affaires (CA)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : caJour.toLocaleString()} €</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <PackageSearch size={20} />
              </div>
              <h4 className="font-bold text-slate-900">État des Stocks en Temps Réel</h4>
            </div>
            <button className="text-xs font-bold text-primary hover:underline">Voir tout l'inventaire</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? <p className="text-xs text-slate-400">Chargement...</p> : stockData.length === 0 ? <p className="text-xs text-slate-400">Aucun produit en stock</p> : stockData.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 truncate">{item.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">{item.count}</span>
                  <span className={`size-2 rounded-full ${
                    item.status === 'Optimal' ? 'bg-emerald-500' : item.status === 'Critique' ? 'bg-amber-500' : 'bg-red-500'
                  }`}></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profile Summary Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-primary/10 shrink-0">
            <img 
              src={MOCK_USER.avatar} 
              alt={MOCK_USER.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{MOCK_USER.name}</h2>
              <span className="px-3 py-1 bg-primary text-white text-[10px] uppercase font-black tracking-widest rounded-full">
                {MOCK_USER.role}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              E-commerce Solutions S.A. • ID Client : {MOCK_USER.id}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar size={14} />
                <span>Membre depuis {MOCK_USER.joinedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Truck size={14} />
                <span>{MOCK_USER.ordersTotal} Commandes au total</span>
              </div>
            </div>
          </div>
          <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Limite de Crédit</p>
            <p className="text-2xl font-black text-primary">{MOCK_USER.creditLimit.toLocaleString()} €</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Disponible : {MOCK_USER.availableCredit.toLocaleString()} €</p>
          </div>
        </div>

        <div className="bg-primary rounded-2xl p-6 text-white flex flex-col justify-between shadow-lg shadow-primary/20">
          <div>
            <p className="text-white/70 text-sm font-medium">Solde Actuel de Caisse</p>
            <p className="text-3xl font-bold mt-2">{loading ? '...' : soldeCaisse.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-white/60">Prochaine facture : {MOCK_USER.nextInvoiceDue}</span>
            <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors">
              Payer Maintenant
            </button>
          </div>
        </div>
      </section>

      {/* Order History Table */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">Historique Récent des Commandes</h3>
          <div className="flex gap-2">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500">
              <Filter size={18} />
            </button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500">
              <Download size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ID Commande</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Articles</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucune vente trouvée.</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-primary font-mono text-sm">{order.id.substring(0,8)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(order.dateVente).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{order.client ? `${order.client.nom}` : 'Client Anonyme'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{parseFloat(order.montantTotal).toLocaleString()} €</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.statutPaiement === 'PAYE' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        order.statutPaiement === 'PAYE' ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}></span>
                      {order.statutPaiement}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sm font-bold text-primary hover:underline underline-offset-4">Voir</button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Settings and Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h3 className="font-bold text-lg mb-6 text-slate-900">Paramètres du Profil</h3>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Nom Complet</label>
                <input 
                  type="text" 
                  defaultValue={MOCK_USER.name}
                  className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Adresse Email</label>
                <input 
                  type="email" 
                  defaultValue={MOCK_USER.email}
                  className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Nouveau Mot de Passe</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Confirmer le Mot de Passe</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" className="px-6 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-all shadow-sm shadow-primary/20">
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-slate-900">Adresses Enregistrées</h3>
              <button className="text-sm font-bold text-primary flex items-center gap-1.5 hover:underline underline-offset-4">
                <PlusCircle size={16} />
                <span>Ajouter</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-primary/20 bg-primary/5 p-4 rounded-xl relative group cursor-pointer hover:bg-primary/[0.08] transition-colors">
                <div className="absolute top-4 right-4 text-primary">
                  <CheckCircle2 size={20} />
                </div>
                <p className="text-xs font-black uppercase text-primary tracking-widest mb-2">Livraison par défaut</p>
                <p className="font-bold text-slate-900">Entrepôt Principal A</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  452 Industrial Drive, Zone 4<br />
                  Paris, 75001, FR
                </p>
              </div>
              <div className="border border-slate-200 p-4 rounded-xl hover:border-primary/40 transition-colors cursor-pointer group">
                <p className="text-xs font-black uppercase text-slate-400 group-hover:text-primary/60 tracking-widest mb-2 transition-colors">Adresse de Facturation</p>
                <p className="font-bold text-slate-900">Siège Social</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  12 Avenue des Champs-Élysées<br />
                  Paris, 75008, FR
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl shadow-slate-900/20">
            <h4 className="font-bold text-lg mb-4">Support Dédié</h4>
            <div className="flex items-center gap-4 mb-6">
              <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwAcyRAt6tgDjsEfxeDu_js9JkFgx6sUtC_LdA9RpLP1pXiSivj7FLkZHygjRVHm2kSwHrnQCPRhgqZNxGEgZW6Z79P0E-NqjhvTZgAfhOlHFaNjXcl13dudUHwfQ3ebBexkGDnnxnxd13K9EpGbmKaUXEjYGLovMuf4w3OohxZdA2Lt5zrtgbDwbT5Qqx5JBBeU5GzyfmndM1fapes12QadQVlBhgIsYJlohS7ctKf6aZLxQHTqYHHDYHKR5iccdbQNM8cmEMjTo" 
                  alt="Sarah Jenkins"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="font-bold">Sarah Jenkins</p>
                <p className="text-xs text-slate-400">Gestionnaire de Compte</p>
              </div>
            </div>
            <div className="space-y-3">
              <button className="w-full py-2.5 bg-primary rounded-lg text-sm font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                <MessageSquare size={16} />
                <span>Discuter avec Sarah</span>
              </button>
              <button className="w-full py-2.5 bg-slate-800 rounded-lg text-sm font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-white/5">
                <Mail size={16} />
                <span>Email Support</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-400">Stats Rapides</h4>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Panier Moyen</span>
                  <span className="font-bold text-slate-900">4 250 €</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '70%' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-primary h-full"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Dépenses Annuelles</span>
                  <span className="font-bold text-slate-900">84 000 €</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="bg-primary h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
