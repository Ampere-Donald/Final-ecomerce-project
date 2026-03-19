import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Auth.scss';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    typeClient: 'PARTICULIER',
    motDePasse: '',
    confirmer: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.nom.trim()) return setError('Le nom complet est requis.');
    if (!form.email.trim()) return setError("L'email est requis.");
    if (form.motDePasse.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères.');
    if (form.motDePasse !== form.confirmer) return setError('Les mots de passe ne correspondent pas.');
    if (!acceptTerms) return setError('Vous devez accepter les conditions.');

    setLoading(true);
    try {
      await signup({
        nom: form.nom,
        email: form.email,
        telephone: form.telephone || undefined,
        typeClient: form.typeClient,
        motDePasse: form.motDePasse,
      });
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      let msg = "Erreur lors de l'inscription.";

      if (data?.message) {
        msg = Array.isArray(data.message) ? data.message.join('. ') : data.message;
      }

      // Specific UX for duplicate conflicts
      if (status === 409) {
        msg = data?.message || 'Un compte avec cet email ou numéro existe déjà.';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <button className="auth-page__back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Retour
        </button>

        <p className="auth-page__brand">NEWOTEG SARL</p>
        <h1 className="auth-page__title">Rejoignez-nous</h1>
        <p className="auth-page__subtitle">
          Créez votre compte pour accéder à nos services industriels et logistiques.
        </p>

        {error && <div className="auth-page__error">{error}</div>}

        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label>Nom complet</label>
            <input type="text" placeholder="Jean Dupont" value={form.nom} onChange={e => set('nom', e.target.value)} />
          </div>

          <div className="auth-page__field">
            <label>Email</label>
            <input type="email" placeholder="vous@exemple.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div className="auth-page__field">
            <label>Téléphone (Mobile Money)</label>
            <input type="tel" placeholder="+237 6XX XXX XXX" value={form.telephone} onChange={e => set('telephone', e.target.value)} />
            <span className="auth-page__helper">Ce numéro sera utilisé pour les transactions financières</span>
          </div>

          <div className="auth-page__field">
            <label>Type de client</label>
            <div className="auth-page__segment">
              <button type="button" className={form.typeClient === 'PARTICULIER' ? 'active' : ''} onClick={() => set('typeClient', 'PARTICULIER')}>
                Particulier
              </button>
              <button type="button" className={form.typeClient === 'PROFESSIONNEL' ? 'active' : ''} onClick={() => set('typeClient', 'PROFESSIONNEL')}>
                Professionnel
              </button>
            </div>
          </div>

          <div className="auth-page__field">
            <label>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} placeholder="Min. 6 caractères" value={form.motDePasse} onChange={e => set('motDePasse', e.target.value)} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-page__field">
            <label>Confirmer</label>
            <input type="password" placeholder="Répétez le mot de passe" value={form.confirmer} onChange={e => set('confirmer', e.target.value)} />
          </div>

          <div className="auth-page__checkbox">
            <input type="checkbox" id="terms" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} />
            <label htmlFor="terms">
              J'accepte les <Link to="/terms">Conditions Générales de Vente</Link> et la <Link to="/privacy">Politique de confidentialité</Link>
            </label>
          </div>

          <button type="submit" className="auth-page__submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-page__footer">
          Déjà membre ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
