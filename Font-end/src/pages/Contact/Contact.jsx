import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin, Phone, Mail, Send, CheckCircle, User, MessageSquare, FileText, Clock, ArrowRight, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer/Footer';
import useScrollReveal from '../../hooks/useScrollReveal';
import { useI18n } from '../../context/I18nContext';
import './Contact.scss';

const Contact = () => {
    const { t } = useI18n();
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [heroExpanded, setHeroExpanded] = useState(false);

    const revealOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
    const cardsRef   = useScrollReveal(revealOptions);
    const formRef    = useScrollReveal(revealOptions);
    const mapRef     = useScrollReveal(revealOptions);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
            setTimeout(() => setIsSuccess(false), 5000);
        }, 1500);
    };

    return (
        <div className="contact-page">
            <Helmet>
                <title>{t('contact.metaTitle')}</title>
                <meta name="description" content={t('contact.metaDesc')} />
                <link rel="canonical" href="https://newoteg.com/contact" />
                <meta property="og:title" content={t('contact.metaTitle')} />
                <meta property="og:description" content={t('contact.metaDesc')} />
                <meta property="og:url" content="https://newoteg.com/contact" />
                <meta property="og:image" content="https://newoteg.com/logo.png" />
                <script type="application/ld+json">{JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "LocalBusiness",
                    "name": "NEWOTEG SARL",
                    "url": "https://newoteg.com",
                    "logo": "https://newoteg.com/logo.png",
                    "image": "https://newoteg.com/logo.png",
                    "description": "Fournisseur de composants électroniques et équipements industriels à Douala, Cameroun",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "Rue Foch, Akwa",
                        "addressLocality": "Douala",
                        "addressRegion": "Littoral",
                        "addressCountry": "CM"
                    },
                    "geo": {
                        "@type": "GeoCoordinates",
                        "latitude": 4.0435,
                        "longitude": 9.6966
                    },
                    "telephone": "+237699966160",
                    "email": "contact@newoteg.com",
                    "openingHoursSpecification": [
                        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "08:00", "closes": "18:00" },
                        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "14:00" }
                    ],
                    "priceRange": "$$"
                })}</script>
            </Helmet>

            {/* ── Hero ──────────────────────────────────────── */}
            <section className="contact-hero">
                <div className="container contact-hero__content">
                    <span className="contact-hero__tag">{t('contact.heroTag')}</span>
                    <h1 dangerouslySetInnerHTML={{ __html: t('contact.heroTitle') }} />
                    <div className={`contact-hero__text-wrapper ${heroExpanded ? 'contact-hero__text-wrapper--expanded' : ''}`}>
                        <p>{t('contact.heroText')}</p>
                    </div>
                    <button className="contact-hero__read-more" onClick={() => setHeroExpanded(!heroExpanded)}>
                        {heroExpanded ? (<><ChevronUp size={16} /> {t('about.showLess')}</>) : (<><ChevronDown size={16} /> {t('about.readMore')}</>)}
                    </button>
                    <div className="contact-hero__actions">
                        <a href="https://wa.me/237699966160" target="_blank" rel="noopener noreferrer" className="btn btn--gradient">
                            <Phone size={18} />
                            WhatsApp
                        </a>
                        <a href="mailto:contact@newoteg.com" className="btn btn--glass">
                            <Mail size={18} />
                            Email
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Stats Strip ───────────────────────────────── */}
            <section className="contact-stats bg-light">
                <div className="container">
                    <div className="contact-stats__grid">
                        <div className="contact-stat-card">
                            <h3>15+</h3>
                            <p>{t('about.statYears')}</p>
                        </div>
                        <div className="contact-stat-card">
                            <h3>500+</h3>
                            <p>{t('about.statClients')}</p>
                        </div>
                        <div className="contact-stat-card">
                            <h3>24/7</h3>
                            <p>{t('about.statSupport')}</p>
                        </div>
                        <div className="contact-stat-card">
                            <h3>2</h3>
                            <p>{t('contact.statSites')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Contact Cards ─────────────────────────────── */}
            <section className="contact-cards-section container reveal-up" ref={cardsRef}>
                <div className="section-header">
                    <p>{t('contact.infoTitle')}</p>
                    <h2>{t('contact.infoDesc')}</h2>
                </div>
                <div className="contact-cards-grid">
                    <a href="https://maps.google.com/?q=Akwa+Rue+Foch+Douala+Cameroun" target="_blank" rel="noopener noreferrer" className="contact-info-card">
                        <div className="contact-info-card__icon">
                            <MapPin size={28} />
                        </div>
                        <h3>{t('contact.hqTitle')}</h3>
                        <p>{t('contact.hqAddress')}</p>
                        <span className="contact-info-card__link">{t('contact.openMaps')} <ArrowRight size={14} /></span>
                    </a>

                    <a href="https://maps.google.com/?q=Camp+Yabassi+Douala+Cameroun" target="_blank" rel="noopener noreferrer" className="contact-info-card">
                        <div className="contact-info-card__icon">
                            <Globe size={28} />
                        </div>
                        <h3>{t('contact.logisticsTitle')}</h3>
                        <p>{t('contact.logisticsAddress')}</p>
                        <span className="contact-info-card__link">{t('contact.openMaps')} <ArrowRight size={14} /></span>
                    </a>

                    <a href="https://wa.me/237699966160" target="_blank" rel="noopener noreferrer" className="contact-info-card contact-info-card--accent">
                        <div className="contact-info-card__icon">
                            <Phone size={28} />
                        </div>
                        <h3>{t('contact.phoneTitle')}</h3>
                        <p>+237 699 966 160 / 670 478 228</p>
                        <span className="contact-info-card__link">{t('contact.openWhatsApp')} <ArrowRight size={14} /></span>
                    </a>

                    <a href="mailto:contact@newoteg.com" className="contact-info-card">
                        <div className="contact-info-card__icon">
                            <Mail size={28} />
                        </div>
                        <h3>{t('contact.emailTitle')}</h3>
                        <p>contact@newoteg.com</p>
                        <span className="contact-info-card__link">{t('contact.sendEmail')} <ArrowRight size={14} /></span>
                    </a>

                    <div className="contact-info-card">
                        <div className="contact-info-card__icon">
                            <Clock size={28} />
                        </div>
                        <h3>{t('contact.hoursTitle')}</h3>
                        <p>{t('contact.hoursDetail')}</p>
                        <span className="contact-info-card__badge">{t('contact.hoursBadge')}</span>
                    </div>
                </div>
            </section>

            {/* ── Contact Form ──────────────────────────────── */}
            <section className="contact-form-section bg-light reveal-up" ref={formRef}>
                <div className="container contact-form-section__inner">
                    <div className="contact-form-section__left">
                        <div className="section-header text-left">
                            <p>{t('contact.formTag')}</p>
                            <h2>{t('contact.formTitle')}</h2>
                        </div>
                        <p className="contact-form-section__desc">{t('contact.formDesc')}</p>
                        <div className="contact-form-features">
                            <div className="contact-form-feature">
                                <CheckCircle size={20} />
                                <span>{t('contact.featureReply')}</span>
                            </div>
                            <div className="contact-form-feature">
                                <CheckCircle size={20} />
                                <span>{t('contact.featureQuote')}</span>
                            </div>
                            <div className="contact-form-feature">
                                <CheckCircle size={20} />
                                <span>{t('contact.featureSupport')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="contact-form-section__right">
                        {isSuccess ? (
                            <div className="contact-success">
                                <div className="contact-success__icon-wrap">
                                    <CheckCircle size={48} />
                                </div>
                                <h3>{t('contact.successTitle')}</h3>
                                <p>{t('contact.successDesc')}</p>
                                <Link to="/" className="btn btn--primary-contact">{t('contact.backHome')}</Link>
                            </div>
                        ) : (
                            <form className="contact-form" onSubmit={handleSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="name">{t('contact.labelName')}</label>
                                        <div className="form-group__input-wrapper">
                                            <User size={16} className="form-group__icon" />
                                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required placeholder={t('contact.placeName')} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="email">{t('contact.labelEmail')}</label>
                                        <div className="form-group__input-wrapper">
                                            <Mail size={16} className="form-group__icon" />
                                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder={t('contact.placeEmail')} />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="subject">{t('contact.labelSubject')}</label>
                                    <div className="form-group__input-wrapper">
                                        <FileText size={16} className="form-group__icon" />
                                        <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required placeholder={t('contact.placeSubject')} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="message">{t('contact.labelMessage')}</label>
                                    <div className="form-group__input-wrapper form-group__input-wrapper--textarea">
                                        <MessageSquare size={16} className="form-group__icon form-group__icon--textarea" />
                                        <textarea id="message" name="message" value={formData.message} onChange={handleChange} required rows="5" placeholder={t('contact.placeMessage')}></textarea>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn--submit" disabled={isSubmitting}>
                                    {isSubmitting ? t('contact.sending') : <>{t('contact.sendBtn')} <Send size={18} /></>}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Google Map ────────────────────────────────── */}
            <section className="contact-map reveal-up" ref={mapRef}>
                <div className="container">
                    <div className="section-header">
                        <p>{t('contact.mapTag')}</p>
                        <h2>{t('contact.mapTitle')}</h2>
                    </div>
                </div>
                <div className="contact-map__embed">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15919.22723709735!2d9.70428585!3d4.05389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1061128540c4974f%3A0x6bbaaaaae875df6a!2sCamp%20Yabassi%2C%20Douala%2C%20Cameroun!5e0!3m2!1sfr!2sfr!4v1689360000000!5m2!1sfr!2sfr"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Carte Locaux NEWOTEG"
                    ></iframe>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Contact;
