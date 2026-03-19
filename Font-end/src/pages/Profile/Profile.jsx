import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { User, LogOut, Package, Heart, ShoppingBag, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { formatFCFA } from '../../utils/formatFCFA';
import Footer from '../../components/Footer/Footer';
import './Profile.scss';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const STATUS_LABELS = {
  EN_ATTENTE: 'En attente',
  CONFIRMEE: 'Confirmée',
  EN_LIVRAISON: 'En livraison',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

const MODE_LABELS = {
  LIVRAISON: 'Livraison',
  RETRAIT_MAGASIN: 'Retrait au magasin',
};

const Profile = () => {
  const { user, logout } = useAuth();
  const { favoritesCount } = useFavorites();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/commandes/my-orders`);
      setOrders(data);
    } catch { /* empty */ }
    setLoadingOrders(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCancel = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;
    setCancellingId(id);
    setCancelError('');
    try {
      await axios.patch(`${API}/commandes/${id}/cancel`);
      fetchOrders();
    } catch (err) {
      setCancelError(err.response?.data?.message || "Impossible d'annuler cette commande.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.nom?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const canCancel = (statut) => statut === 'EN_ATTENTE' || statut === 'CONFIRMEE';

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
            <span className="profile__card-value">{orders.filter(o => o.statut === 'LIVREE').length}</span>
            <span className="profile__card-label">Livrées</span>
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
                    <th>Action</th>
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
                        {canCancel(order.statut) ? (
                          <button
                            className="profile__cancel-btn profile__cancel-btn--allowed"
                            onClick={() => handleCancel(order.id)}
                            disabled={cancellingId === order.id}
                          >
                            {cancellingId === order.id ? '...' : 'Annuler'}
                          </button>
                        ) : (
                          <button className="profile__cancel-btn profile__cancel-btn--disabled" disabled title={
                            order.statut === 'ANNULEE' ? 'Déjà annulée' : 'Annulation impossible pour ce statut'
                          }>
                            {order.statut === 'ANNULEE' ? 'Annulée' : 'Non annulable'}
                          </button>
                        )}
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
