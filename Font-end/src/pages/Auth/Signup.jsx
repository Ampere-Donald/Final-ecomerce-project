import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import './Auth.scss';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { t } = useI18n();

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

    if (!form.nom.trim()) return setError(t('auth.signupReqName'));
    if (!form.email.trim()) return setError(t('auth.signupReqEmail'));
    if (form.motDePasse.length < 6) return setError(t('auth.signupPwdLen'));
    if (form.motDePasse !== form.confirmer) return setError(t('auth.signupPwdMatch'));
    if (!acceptTerms) return setError(t('auth.signupReqTerms'));

    setLoading(true);
    try {
      await signup({
        nom: form.nom,
        email: form.email,
        telephone: form.telephone || undefined,
        typeClient: form.typeClient,
        motDePasse: form.motDePasse,
      });
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      let msg = t('auth.signupErr');

      if (data?.message) {
        msg = Array.isArray(data.message) ? data.message.join('. ') : data.message;
      }

      // Specific UX for duplicate conflicts
      if (status === 409) {
        msg = data?.message || t('auth.signupConflict');
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Helmet>
      <title>{t('auth.signupTitle')} — NEWOTEG SARL</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="auth-page">
      <div className="auth-page__card">
        <button className="auth-page__back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> {t('auth.back')}
        </button>

        <p className="auth-page__brand">{t('auth.brand')}</p>
        <h1 className="auth-page__title">{t('auth.joinUs')}</h1>
        <p className="auth-page__subtitle">
          {t('auth.joinSub')}
        </p>

        {error && <div className="auth-page__error">{error}</div>}

        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label>{t('auth.labelFullName')}</label>
            <input type="text" placeholder={t('auth.placeFullName')} value={form.nom} onChange={e => set('nom', e.target.value)} />
          </div>

          <div className="auth-page__field">
            <label>{t('auth.labelEmail')}</label>
            <input type="email" placeholder={t('auth.placeEmail')} value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div className="auth-page__field">
            <label>{t('auth.labelPhone')}</label>
            <input type="tel" placeholder={t('auth.placePhone')} value={form.telephone} onChange={e => set('telephone', e.target.value)} />
            <span className="auth-page__helper">{t('auth.phoneHelper')}</span>
          </div>

          <div className="auth-page__field">
            <label>{t('auth.labelClientType')}</label>
            <div className="auth-page__segment">
              <button type="button" className={form.typeClient === 'PARTICULIER' ? 'active' : ''} onClick={() => set('typeClient', 'PARTICULIER')}>
                {t('auth.typeIndividual')}
              </button>
              <button type="button" className={form.typeClient === 'PROFESSIONNEL' ? 'active' : ''} onClick={() => set('typeClient', 'PROFESSIONNEL')}>
                {t('auth.typePro')}
              </button>
            </div>
          </div>

          <div className="auth-page__field">
            <label>{t('auth.labelPwd')}</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} placeholder={t('auth.placePwdSignup')} value={form.motDePasse} onChange={e => set('motDePasse', e.target.value)} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-page__field">
            <label>{t('auth.labelConfirm')}</label>
            <input type="password" placeholder={t('auth.placeConfirm')} value={form.confirmer} onChange={e => set('confirmer', e.target.value)} />
          </div>

          <div className="auth-page__checkbox">
            <input type="checkbox" id="terms" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} />
            <label htmlFor="terms">
              {t('auth.acceptTermsPrefix')}<Link to="/terms">{t('auth.termsLink')}</Link>{t('auth.acceptTermsMid')}<Link to="/privacy">{t('auth.privacyLink')}</Link>
            </label>
          </div>

          <button type="submit" className="auth-page__submit" disabled={loading}>
            {loading ? t('auth.creating') : t('auth.createBtn')}
          </button>
        </form>

        <p className="auth-page__footer">
          {t('auth.alreadyMember')} <Link to="/login">{t('auth.connectBtn')}</Link>
        </p>
      </div>
    </div>
    </>
  );
};

export default Signup;
