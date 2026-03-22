import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useI18n } from '../../context/I18nContext';

const NotFound = () => {
  const { t } = useI18n();

  return (
    <>
      <Helmet>
        <title>{t('notFound.title')} — NEWOTEG SARL</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        textAlign: 'center',
        paddingTop: 'calc(80px + 3rem)',
      }}>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" style={{ marginBottom: '2rem', opacity: 0.7 }}>
          <circle cx="80" cy="80" r="74" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="8 4" />
          <text x="80" y="75" textAnchor="middle" fill="#2A2FCE" fontSize="48" fontWeight="800" fontFamily="Inter, sans-serif">404</text>
          <text x="80" y="100" textAnchor="middle" fill="#6B7280" fontSize="12" fontWeight="500" fontFamily="Inter, sans-serif">{t('notFound.subtitle')}</text>
        </svg>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '0.75rem', color: '#111827' }}>
          {t('notFound.title')}
        </h1>
        <p style={{ fontSize: '1rem', color: '#6B7280', maxWidth: 420, marginBottom: '2rem', lineHeight: 1.6 }}>
          {t('notFound.desc')}
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            to="/"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 8,
              background: '#2A2FCE',
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            {t('notFound.homeBtn')}
          </Link>
          <Link
            to="/catalogue"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              color: '#374151',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            {t('notFound.catalogueBtn')}
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFound;
