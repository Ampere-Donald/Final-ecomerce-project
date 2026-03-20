import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LogOut, Package, Heart, ShoppingBag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { formatFCFA } from '../../utils/formatFCFA';
import Footer from '../../components/Footer/Footer';
import './Profile.scss';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WHATSAPP_NUMBER = '237699966160';

const STATUS_LABELS = {
  EN_ATTENTE: 'En attente',
  CONFIRMEE: 'Confirmée / Reçue',
  EN_LIVRAISON: 'En livraison',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

const MODE_LABELS = {
  LIVRAISON: 'Livraison',
  RETRAIT_MAGASIN: 'Retrait au magasin',
};

// WhatsApp SVG icon inline
const WhatsAppIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Profile = () => {
  const { user, token, loading, logout } = useAuth();
  const { favoritesCount } = useFavorites();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancelError, setCancelError] = useState('');

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/commandes/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data);
    } catch { /* empty */ }
    setLoadingOrders(false);
  }, [token]);

  // Initial fetch — wait for auth restore
  useEffect(() => {
    if (!loading) fetchOrders();
  }, [loading, fetchOrders]);

  // ── Mission 4: Polling every 10 seconds ────────────────
  useEffect(() => {
    if (!token || loading) return;

    const intervalId = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [token, loading, fetchOrders]);

  const handleCancel = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;
    setCancellingId(id);
    setCancelError('');
    try {
      await axios.patch(`${API}/commandes/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrders();
    } catch (err) {
      setCancelError(err.response?.data?.message || "Impossible d'annuler cette commande.");
    } finally {
      setCancellingId(null);
    }
  };

  // ── Mission 2: Confirm reception ──────────────────────
  const handleConfirmReception = async (id) => {
    if (!window.confirm('Confirmez-vous avoir bien reçu cette commande ?')) return;
    setConfirmingId(id);
    setCancelError('');
    try {
      await axios.patch(`${API}/commandes/${id}/reception`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrders();
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Erreur lors de la confirmation.');
    } finally {
      setConfirmingId(null);
    }
  };

  // ── Mission 2: WhatsApp link builder ──────────────────
  const buildWhatsAppLink = (order) => {
    const message = `Bonjour NEWOTEG, je vous contacte au sujet de ma commande N°${order.numeroSuivi} d'un montant de ${Number(order.montantTotal).toLocaleString()} FCFA. Statut actuel : ${STATUS_LABELS[order.statut] || order.statut}.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.nom?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const canCancel = (statut) => statut === 'EN_ATTENTE';

  return (
    <>
      <Helmet><title>Mon Profil — NEWOTEG</title></Helmet>
      <div className="profile container">
        {/* Header */}
        <div className="profile__header">
          <div className="profile__avatar">{initials}</div>
          <div className="profile__info">
            <h1>{user?.nom}</h1>
            <p>{user?.email} {user?.telephone && `· ${user.telephone}`}</p>
            <p style={{ marginTop: 4 }}>Client {user?.typeClient === 'PROFESSIONNEL' ? 'Professionnel' : 'Particulier'}</p>
          </div>
          <button className="profile__logout" onClick={handleLogout}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>

        {/* Summary cards */}
        <div className="profile__cards">
          <div className="profile__card">
            <div className="profile__card-icon profile__card-icon--primary"><ShoppingBag size={20} /></div>
            <span className="profile__card-value">{orders.length}</span>
            <span className="profile__card-label">Commandes</span>
          </div>
          <div className="profile__card">
            <div className="profile__card-icon profile__card-icon--danger"><Heart size={20} /></div>
            <span className="profile__card-value">{favoritesCount}</span>
            <span className="profile__card-label">Favoris</span>
            <Link to="/favourites">Voir mes favoris →</Link>
          </div>
          <div className="profile__card">
            <div className="profile__card-icon profile__card-icon--success"><Package size={20} /></div>
            <span className="profile__card-value">{orders.filter(o => o.statut === 'LIVREE' || o.statut === 'CONFIRMEE').length}</span>
            <span className="profile__card-label">Livrées / Reçues</span>
          </div>
        </div>

        {/* Orders */}
        <div className="profile__section">
          <h2><Package size={20} /> Historique des commandes</h2>

          {cancelError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontSize: 14, marginBottom: 16, background: '#FEE2E2', padding: '8px 16px', borderRadius: 8 }}>
              <AlertTriangle size={16} /> {cancelError}
            </div>
          )}

          <div className="profile__table-wrap">
            {loadingOrders ? (
              <div className="profile__empty">Chargement...</div>
            ) : orders.length === 0 ? (
              <div className="profile__empty">
                Aucune commande pour le moment.
                <br />
                <Link to="/catalogue" style={{ marginTop: 8, display: 'inline-block' }}>Explorer le catalogue →</Link>
              </div>
            ) : (
              <table className="profile__table">
                <thead>
                  <tr>
                    <th>N° Suivi</th>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.numeroSuivi}</td>
                      <td>{new Date(order.dateCommande).toLocaleDateString('fr-FR')}</td>
                      <td style={{ fontWeight: 600 }}>{formatFCFA(Number(order.montantTotal))}</td>
                      <td>{MODE_LABELS[order.modeReception] || order.modeReception}</td>
                      <td>
                        <span className={`profile__status profile__status--${order.statut.toLowerCase()}`}>
                          {STATUS_LABELS[order.statut] || order.statut}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* WhatsApp button */}
                          <a
                            href={buildWhatsAppLink(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contacter NEWOTEG via WhatsApp"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: '#25D366',
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 600,
                              textDecoration: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <WhatsAppIcon size={14} />
                            WhatsApp
                          </a>

                          {/* Confirm Reception — only when EN_LIVRAISON */}
                          {order.statut === 'EN_LIVRAISON' && (
                            <button
                              onClick={() => handleConfirmReception(order.id)}
                              disabled={confirmingId === order.id}
                              title="Confirmer la réception de la marchandise"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                borderRadius: 6,
                                background: '#10B981',
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                opacity: confirmingId === order.id ? 0.6 : 1,
                              }}
                            >
                              <CheckCircle2 size={14} />
                              {confirmingId === order.id ? '...' : 'Reçu'}
                            </button>
                          )}

                          {/* Cancel button — existing */}
                          {canCancel(order.statut) && (
                            <button
                              className="profile__cancel-btn profile__cancel-btn--allowed"
                              onClick={() => handleCancel(order.id)}
                              disabled={cancellingId === order.id}
                            >
                              {cancellingId === order.id ? '...' : 'Annuler'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Profile;
