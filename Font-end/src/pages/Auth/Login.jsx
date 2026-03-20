import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import './Auth.scss';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const { login, googleLogin } = useAuth();

  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifiant.trim()) return setError("L'email ou le téléphone est requis.");
    if (!motDePasse) return setError('Le mot de passe est requis.');

    setLoading(true);
    try {
      await login(identifiant, motDePasse);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Identifiants invalides.';
      if (data?.message) {
        msg = Array.isArray(data.message) ? data.message.join('. ') : data.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Erreur lors de la connexion avec Google.';
      if (data?.message) {
        msg = Array.isArray(data.message) ? data.message.join('. ') : data.message;
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

        <div className="auth-page__icon-block">
          <ShieldCheck size={32} />
        </div>

        <h1 className="auth-page__title" style={{ textAlign: 'center' }}>Bienvenue</h1>
        <p className="auth-page__subtitle" style={{ textAlign: 'center' }}>
          Connectez-vous à votre espace professionnel
        </p>

        {error && <div className="auth-page__error">{error}</div>}

        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label>Email ou Téléphone</label>
            <input type="text" placeholder="vous@exemple.com" value={identifiant} onChange={e => setIdentifiant(e.target.value)} />
          </div>

          <div className="auth-page__field">
            <label>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} placeholder="Votre mot de passe" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Link to="/forgot-password" className="auth-page__link">Mot de passe oublié ?</Link>

          <div className="auth-page__checkbox">
            <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <label htmlFor="remember">Se souvenir de moi</label>
          </div>

          <button type="submit" className="auth-page__submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="auth-page__divider">
          <span>OU CONTINUER AVEC</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Erreur lors de la connexion avec Google.')}
            text="signin_with"
            shape="rectangular"
            size="large"
            width="100%"
            locale="fr"
          />
        </div>

        <p className="auth-page__footer">
          Pas encore de compte ? <Link to="/signup">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
