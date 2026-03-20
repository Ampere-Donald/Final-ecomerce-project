import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import './Auth.scss';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const { verifyOtp, resendOtp } = useAuth();
  const { t } = useI18n();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (idx, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    if (value && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      inputsRef.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) return setError(t('auth.verifyReqDigits'));
    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, code);
      setSuccess(t('auth.verifySuccess'));
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.verifyInvalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendOtp(email);
      setCooldown(60);
      setSuccess(t('auth.verifyResendSuccess'));
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.verifyResendErr'));
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
          <Mail size={32} />
        </div>

        <h1 className="auth-page__title" style={{ textAlign: 'center' }}>{t('auth.verifyTitle')}</h1>
        <p className="auth-page__subtitle" style={{ textAlign: 'center' }}>
          {t('auth.verifySubtitleText')}<br />
          <strong>{email}</strong>
        </p>

        {error && <div className="auth-page__error">{error}</div>}
        {success && <div className="auth-page__success">{success}</div>}

        <form onSubmit={handleVerify}>
          <div className="auth-page__otp-inputs" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button type="submit" className="auth-page__submit" disabled={loading}>
            {loading ? t('auth.verifying') : t('auth.verifyBtn')}
          </button>
        </form>

        <div className="auth-page__resend" style={{ marginTop: '1.5rem' }}>
          {cooldown > 0 ? (
            <span>{t('auth.resendIn')} {cooldown}s</span>
          ) : (
            <span>{t('auth.notReceived')} <button onClick={handleResend}>{t('auth.resendBtn')}</button></span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
