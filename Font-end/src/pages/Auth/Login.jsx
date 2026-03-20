import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import './Auth.scss';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const { login, googleLogin } = useAuth();
  const { t } = useI18n();

  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifiant.trim()) return setError(t('auth.loginReqEmail'));
    if (!motDePasse) return setError(t('auth.loginReqPwd'));

    setLoading(true);
    try {
      await login(identifiant, motDePasse);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      let msg = t('auth.loginInvalid');
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
      let msg = t('auth.loginGoogleErr');
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
          <ArrowLeft size={16} /> {t('auth.back')}
        </button>

        <p className="auth-page__brand">{t('auth.brand')}</p>

        <div className="auth-page__icon-block">
          <ShieldCheck size={32} />
        </div>

        <h1 className="auth-page__title" style={{ textAlign: 'center' }}>{t('auth.welcomeTitle')}</h1>
        <p className="auth-page__subtitle" style={{ textAlign: 'center' }}>
          {t('auth.welcomeSub')}
        </p>

        {error && <div className="auth-page__error">{error}</div>}

        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label>{t('auth.labelEmail')}</label>
            <input type="text" placeholder={t('auth.placeEmail')} value={identifiant} onChange={e => setIdentifiant(e.target.value)} />
          </div>

          <div className="auth-page__field">
            <label>{t('auth.labelPwd')}</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} placeholder={t('auth.placePwd')} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Link to="/forgot-password" className="auth-page__link">{t('auth.forgotPwd')}</Link>

          <div className="auth-page__checkbox">
            <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <label htmlFor="remember">{t('auth.remember')}</label>
          </div>

          <button type="submit" className="auth-page__submit" disabled={loading}>
            {loading ? t('auth.connecting') : t('auth.connectBtn')}
          </button>
        </form>

        <div className="auth-page__divider">
          <span>{t('auth.orContinue')}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError(t('auth.loginGoogleErr'))}
            text="signin_with"
            shape="rectangular"
            size="large"
            width="100%"
            locale="fr"
          />
        </div>

        <p className="auth-page__footer">
          {t('auth.noAccount')} <Link to="/signup">{t('auth.signup')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
