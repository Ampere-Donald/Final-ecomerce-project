import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LogOut, Package, Heart, ShoppingBag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useI18n } from '../../context/I18nContext';
import { formatFCFA } from '../../utils/formatFCFA';
import Footer from '../../components/Footer/Footer';
import './Profile.scss';

const _rawApi = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API = _rawApi.endsWith('/api') ? _rawApi : `${_rawApi}/api`;
const WHATSAPP_NUMBER = '237699966160';

// WhatsApp SVG icon inline
const WhatsAppIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Profile = () => {
  const { user, token, loading, logout } = useAuth();
  const { favoritesCount } = useFavorites();
  const { t } = useI18n();
  const navigate = useNavigate();

  const STATUS_LABELS = {
    EN_ATTENTE: t('profile.statusPending'),
    CONFIRMEE: t('profile.statusConfirmed'),
    EN_LIVRAISON: t('profile.statusDelivering'),
    LIVREE: t('profile.statusDelivered'),
    ANNULEE: t('profile.statusCancelled'),
  };

  const MODE_LABELS = {
    LIVRAISON: t('profile.modeDelivery'),
    RETRAIT_MAGASIN: t('profile.modePickup'),
  };

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
    if (!window.confirm(t('profile.confirmCancel'))) return;
    setCancellingId(id);
    setCancelError('');
    try {
      await axios.patch(`${API}/commandes/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrders();
    } catch (err) {
      setCancelError(err.response?.data?.message || t('profile.errCancel'));
    } finally {
      setCancellingId(null);
    }
  };

  // ── Mission 2: Confirm reception ──────────────────────
  const handleConfirmReception = async (id) => {
    if (!window.confirm(t('profile.confirmReception'))) return;
    setConfirmingId(id);
    setCancelError('');
    try {
      await axios.patch(`${API}/commandes/${id}/reception`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrders();
    } catch (err) {
      setCancelError(err.response?.data?.message || t('profile.errReception'));
    } finally {
      setConfirmingId(null);
    }
  };

  // ── Mission 2: WhatsApp link builder ──────────────────
  const buildWhatsAppLink = (order) => {
    const statusText = STATUS_LABELS[order.statut] || order.statut;
    const message = t('profile.whatsappMsg')
      .replace('{{id}}', order.numeroSuivi)
      .replace('{{amount}}', Number(order.montantTotal).toLocaleString())
      .replace('{{status}}', statusText);
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
      <Helmet>
        <title>{t('profile.metaTitle')}</title>
        <meta name="robots" content="index, follow" />
      </Helmet>
      <div className="profile container">
        {/* Header */}
        <div className="profile__header">
          <div className="profile__avatar">{initials}</div>
          <div className="profile__info">
            <h1>{user?.nom}</h1>
            <p>{user?.email} {user?.telephone && `· ${user.telephone}`}</p>
            <p style={{ marginTop: 4 }}>{user?.typeClient === 'PROFESSIONNEL' ? t('profile.clientPro') : t('profile.clientIndiv')}</p>
          </div>
          <button className="profile__logout" onClick={handleLogout}>
            <LogOut size={16} /> {t('profile.logoutBtn')}
          </button>
        </div>

        {/* Summary cards */}
        <div className="profile__cards">
          <div className="profile__card">
            <div className="profile__card-icon profile__card-icon--primary"><ShoppingBag size={20} /></div>
            <span className="profile__card-value">{orders.length}</span>
            <span className="profile__card-label">{t('profile.orders')}</span>
          </div>
          <div className="profile__card">
            <div className="profile__card-icon profile__card-icon--danger"><Heart size={20} /></div>
            <span className="profile__card-value">{favoritesCount}</span>
            <span className="profile__card-label">{t('profile.favorites')}</span>
            <Link to="/favourites">{t('profile.viewFavorites')}</Link>
          </div>
          <div className="profile__card">
            <div className="profile__card-icon profile__card-icon--success"><Package size={20} /></div>
            <span className="profile__card-value">{orders.filter(o => o.statut === 'LIVREE' || o.statut === 'CONFIRMEE').length}</span>
            <span className="profile__card-label">{t('profile.delivered')}</span>
          </div>
        </div>

        {/* Orders */}
        <div className="profile__section">
          <h2><Package size={20} /> {t('profile.historyTitle')}</h2>

          {cancelError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontSize: 14, marginBottom: 16, background: '#FEE2E2', padding: '8px 16px', borderRadius: 8 }}>
              <AlertTriangle size={16} /> {cancelError}
            </div>
          )}

          <div className="profile__table-wrap">
            {loadingOrders ? (
              <div className="profile__empty">{t('profile.loading')}</div>
            ) : orders.length === 0 ? (
              <div className="profile__empty">
                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{ margin: '0 auto 1rem', opacity: 0.6 }}>
                  <circle cx="50" cy="50" r="46" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 4" />
                  <rect x="25" y="30" width="50" height="38" rx="4" stroke="#2A2FCE" strokeWidth="2" fill="rgba(42,47,206,0.04)" />
                  <line x1="32" y1="42" x2="68" y2="42" stroke="#E5E7EB" strokeWidth="1.5" />
                  <line x1="32" y1="50" x2="58" y2="50" stroke="#E5E7EB" strokeWidth="1.5" />
                  <line x1="32" y1="58" x2="50" y2="58" stroke="#E5E7EB" strokeWidth="1.5" />
                </svg>
                <p>{t('profile.noOrders')}</p>
                <Link to="/catalogue" style={{ marginTop: 8, display: 'inline-block' }}>{t('profile.exploreCatalogue')}</Link>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <table className="profile__table profile__table--desktop">
                  <thead>
                    <tr>
                      <th>{t('profile.colTrack')}</th>
                      <th>{t('profile.colDate')}</th>
                      <th>{t('profile.colAmount')}</th>
                      <th>{t('profile.colMode')}</th>
                      <th>{t('profile.colStatus')}</th>
                      <th>{t('profile.colActions')}</th>
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
                            <a href={buildWhatsAppLink(order)} target="_blank" rel="noopener noreferrer" className="profile__action-btn profile__action-btn--whatsapp">
                              <WhatsAppIcon size={14} /> {t('profile.whatsappBtn')}
                            </a>
                            {order.statut === 'EN_LIVRAISON' && (
                              <button onClick={() => handleConfirmReception(order.id)} disabled={confirmingId === order.id} className="profile__action-btn profile__action-btn--confirm">
                                <CheckCircle2 size={14} /> {confirmingId === order.id ? '...' : t('profile.receivedBtn')}
                              </button>
                            )}
                            {canCancel(order.statut) && (
                              <button className="profile__cancel-btn profile__cancel-btn--allowed" onClick={() => handleCancel(order.id)} disabled={cancellingId === order.id}>
                                {cancellingId === order.id ? '...' : t('profile.cancelBtn')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile cards */}
                <div className="profile__mobile-orders">
                  {orders.map(order => (
                    <div key={order.id} className="profile__order-card">
                      <div className="profile__order-card-header">
                        <span className="profile__order-card-track">{order.numeroSuivi}</span>
                        <span className={`profile__status profile__status--${order.statut.toLowerCase()}`}>
                          {STATUS_LABELS[order.statut] || order.statut}
                        </span>
                      </div>
                      <div className="profile__order-card-body">
                        <div className="profile__order-card-row">
                          <span className="profile__order-card-label">{t('profile.colDate')}</span>
                          <span>{new Date(order.dateCommande).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="profile__order-card-row">
                          <span className="profile__order-card-label">{t('profile.colAmount')}</span>
                          <span style={{ fontWeight: 600 }}>{formatFCFA(Number(order.montantTotal))}</span>
                        </div>
                        <div className="profile__order-card-row">
                          <span className="profile__order-card-label">{t('profile.colMode')}</span>
                          <span>{MODE_LABELS[order.modeReception] || order.modeReception}</span>
                        </div>
                      </div>
                      <div className="profile__order-card-actions">
                        <a href={buildWhatsAppLink(order)} target="_blank" rel="noopener noreferrer" className="profile__action-btn profile__action-btn--whatsapp">
                          <WhatsAppIcon size={14} /> {t('profile.whatsappBtn')}
                        </a>
                        {order.statut === 'EN_LIVRAISON' && (
                          <button onClick={() => handleConfirmReception(order.id)} disabled={confirmingId === order.id} className="profile__action-btn profile__action-btn--confirm">
                            <CheckCircle2 size={14} /> {confirmingId === order.id ? '...' : t('profile.receivedBtn')}
                          </button>
                        )}
                        {canCancel(order.statut) && (
                          <button className="profile__cancel-btn profile__cancel-btn--allowed" onClick={() => handleCancel(order.id)} disabled={cancellingId === order.id}>
                            {cancellingId === order.id ? '...' : t('profile.cancelBtn')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Profile;
