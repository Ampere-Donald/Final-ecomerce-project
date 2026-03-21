import { useState } from 'react';
import apiClient from '../../utils/apiClient';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import './Newsletter.scss';

const Newsletter = () => {
    const { t } = useI18n();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'duplicate' | 'error'

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setStatus(null);
        try {
            await apiClient.post('/newsletter', { email: email.trim() });
            setStatus('success');
            setEmail('');
        } catch (err) {
            if (err.response?.status === 409) {
                setStatus('duplicate');
            } else {
                setStatus('error');
            }
        } finally {
            setLoading(false);
            setTimeout(() => setStatus(null), 5000);
        }
    };

    return (
        <section className="newsletter-section">
            <div className="container newsletter-section__inner">
                <div className="newsletter-section__content">
                    <h2 className="newsletter-section__title">{t('newsletter.title')}</h2>
                    <p className="newsletter-section__desc">
                        {t('newsletter.desc')}
                    </p>
                    
                    {status === 'success' ? (
                        <div className="newsletter-section__alert newsletter-section__alert--success">
                            <CheckCircle size={20} />
                            <span>{t('newsletter.success')}</span>
                        </div>
                    ) : status === 'duplicate' ? (
                        <div className="newsletter-section__alert newsletter-section__alert--info">
                            <AlertCircle size={20} />
                            <span>{t('newsletter.duplicate')}</span>
                        </div>
                    ) : status === 'error' ? (
                        <div className="newsletter-section__alert newsletter-section__alert--error">
                            <AlertCircle size={20} />
                            <span>{t('newsletter.error')}</span>
                        </div>
                    ) : null}

                    <form className="newsletter-section__form" onSubmit={handleSubmit}>
                        <div className="newsletter-section__input-group">
                            <input
                                type="email"
                                placeholder={t('newsletter.placeholder')}
                                className="newsletter-section__input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <button type="submit" className="newsletter-section__btn" disabled={loading}>
                                {loading ? t('newsletter.sending') : (
                                    <>
                                        <Send size={16} />
                                        {t('newsletter.subscribe')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                    <p className="newsletter-section__legal">
                        {t('newsletter.legal1')}<a href="/terms">{t('newsletter.legalTerms')}</a>{t('newsletter.legal2')}<a href="/privacy">{t('newsletter.legalPrivacy')}</a>{t('newsletter.legal3')}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
