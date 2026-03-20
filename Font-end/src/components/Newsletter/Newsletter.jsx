import { useState } from 'react';
import axios from 'axios';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import './Newsletter.scss';

const Newsletter = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'duplicate' | 'error'

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setStatus(null);
        try {
            await axios.post('/api/newsletter', { email: email.trim() });
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
                    <h2 className="newsletter-section__title">Ne manquez pas nos prochaines offres</h2>
                    <p className="newsletter-section__desc">
                        Inscrivez-vous à notre newsletter et recevez en exclusivité nos promotions, nos nouveaux arrivages et des offres spéciales.
                    </p>
                    
                    {status === 'success' ? (
                        <div className="newsletter-section__alert newsletter-section__alert--success">
                            <CheckCircle size={20} />
                            <span>Merci ! Vous êtes maintenant inscrit à notre newsletter.</span>
                        </div>
                    ) : status === 'duplicate' ? (
                        <div className="newsletter-section__alert newsletter-section__alert--info">
                            <AlertCircle size={20} />
                            <span>Cet email est déjà inscrit à notre newsletter.</span>
                        </div>
                    ) : status === 'error' ? (
                        <div className="newsletter-section__alert newsletter-section__alert--error">
                            <AlertCircle size={20} />
                            <span>Une erreur est survenue. Veuillez réessayer.</span>
                        </div>
                    ) : null}

                    <form className="newsletter-section__form" onSubmit={handleSubmit}>
                        <div className="newsletter-section__input-group">
                            <input
                                type="email"
                                placeholder="Votre adresse email"
                                className="newsletter-section__input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <button type="submit" className="newsletter-section__btn" disabled={loading}>
                                {loading ? 'Envoi...' : (
                                    <>
                                        <Send size={16} />
                                        S'inscrire
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                    <p className="newsletter-section__legal">
                        En vous inscrivant, vous acceptez nos <a href="/terms">Conditions d'Utilisation</a> et notre <a href="/privacy">Politique de Confidentialité</a>.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
