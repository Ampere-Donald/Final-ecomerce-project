import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Cpu, Wrench, Shield, Home, Award, Zap, Users, Quote, MapPin, Camera, PlayCircle, X, Code, Globe, Truck, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer/Footer';
import useScrollReveal from '../../hooks/useScrollReveal';
import { useI18n } from '../../context/I18nContext';
import { renderBoldText } from '../../utils/renderBoldText';
import './About.scss';

const About = () => {
    const { t } = useI18n();
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [heroExpanded, setHeroExpanded] = useState(false);

    const revealOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
    const expertiseRef = useScrollReveal(revealOptions);
    const statsRef = useScrollReveal(revealOptions);
    const offersRef = useScrollReveal(revealOptions);
    const valuesRef = useScrollReveal(revealOptions);
    const teamRef = useScrollReveal(revealOptions);
    const galleryRef = useScrollReveal(revealOptions);

    const openMedia = (media) => setSelectedMedia(media);
    const closeMedia = () => setSelectedMedia(null);

    return (
        <div className="about-page">
            <Helmet>
                <title>{t('about.metaTitle')}</title>
                <meta name="description" content={t('about.metaDesc')} />
                <link rel="canonical" href="https://newoteg.com/about" />
                <meta property="og:title" content={t('about.metaTitle')} />
                <meta property="og:description" content={t('about.metaDesc')} />
                <meta property="og:url" content="https://newoteg.com/about" />
                <meta property="og:image" content="https://newoteg.com/logo.png" />
            </Helmet>
            {/* ── Hero Section ────────────────────────────── */}
            <section className="about-hero">
                <div className="container about-hero__content">
                    <span className="about-hero__tag">{t('about.heroTag')}</span>
                    <h1>{renderBoldText(t('about.heroTitle'))}</h1>
                    <div className={`about-hero__text-wrapper ${heroExpanded ? 'about-hero__text-wrapper--expanded' : ''}`}>
                        <p>
                            {t('about.heroText')}
                        </p>
                    </div>
                    <button className="about-hero__read-more" onClick={() => setHeroExpanded(!heroExpanded)}>
                        {heroExpanded ? (<><ChevronUp size={16} /> {t('about.showLess')}</>) : (<><ChevronDown size={16} /> {t('about.readMore')}</>)}
                    </button>
                    <div className="about-hero__actions">
                        <Link to="/catalogue" className="btn btn--gradient">
                            <ArrowRight size={18} />
                            {t('about.discoverProducts')}
                        </Link>
                        <Link to="/contact" className="btn btn--glass">
                            <Wrench size={18} />
                            {t('about.ourServices')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Expertise / Histoire ─────────────────────────────── */}
            <section className="about-expertise container reveal-up" ref={expertiseRef}>
                <div className="about-expertise__text">
                    <h2>{t('about.expertiseTitle1')}</h2>
                    <p>
                        {t('about.expertiseP1')}
                    </p>
                    <p>
                        {t('about.expertiseP2')}
                    </p>
                    <h2>{t('about.expertiseTitle2')}</h2>
                    <p>{renderBoldText(t('about.expertiseP3'))}</p>
                    <p>
                        {t('about.expertiseP4')}
                    </p>
                </div>
                <div className="about-expertise__image">
                    <img src="/images/about_expertise.png" alt="Ingénieurs NEWOTEG" loading="lazy" />
                </div>
            </section>

            {/* ── Chiffres Clés (Social Proof) ───────────────── */}
            <section className="about-stats bg-light reveal-up" ref={statsRef}>
                <div className="container">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>15+</h3>
                            <p>{t('about.statYears')}</p>
                        </div>
                        <div className="stat-card">
                            <h3>500+</h3>
                            <p>{t('about.statClients')}</p>
                        </div>
                        <div className="stat-card">
                            <h3>10k+</h3>
                            <p>{t('about.statStock')}</p>
                        </div>
                        <div className="stat-card">
                            <h3>24/7</h3>
                            <p>{t('about.statSupport')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Pourquoi nous faire confiance ? (Confiance) ─────────────────────────── */}
            <section className="about-offers bg-light reveal-up" ref={offersRef}>
                <div className="container">
                    <div className="section-header">
                        <h2>{t('about.whyTrustUs')}</h2>
                        <p>{t('about.whyTrustUsSub')}</p>
                    </div>

                    <div className="offers-grid">
                        <div className="offer-card">
                            <div className="offer-card__icon">
                                <Shield size={24} />
                            </div>
                            <h3>{t('about.offer1Title')}</h3>
                            <p>{t('about.offer1Desc')}</p>
                        </div>
                        <div className="offer-card">
                            <div className="offer-card__icon">
                                <Code size={24} />
                            </div>
                            <h3>{t('about.offer2Title')}</h3>
                            <p>{t('about.offer2Desc')}</p>
                        </div>
                        <div className="offer-card">
                            <div className="offer-card__icon">
                                <Truck size={24} />
                            </div>
                            <h3>{t('about.offer3Title')}</h3>
                            <p>{t('about.offer3Desc')}</p>
                        </div>
                        <div className="offer-card">
                            <div className="offer-card__icon">
                                <Wrench size={24} />
                            </div>
                            <h3>{t('about.offer4Title')}</h3>
                            <p>{t('about.offer4Desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Valeurs ───────────────────────────── */}
            <section className="about-values container reveal-up" ref={valuesRef}>
                <div className="section-header">
                    <h2>{t('about.ourValues')}</h2>
                </div>

                <div className="values-grid">
                    <div className="value-card">
                        <div className="value-card__icon-wrap">
                            <div className="value-card__icon">
                                <Shield size={20} />
                            </div>
                        </div>
                        <h3>{t('about.value1Title')}</h3>
                        <p>{t('about.value1Desc')}</p>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon-wrap">
                            <div className="value-card__icon">
                                <Award size={20} />
                            </div>
                        </div>
                        <h3>{t('about.value2Title')}</h3>
                        <p>{t('about.value2Desc')}</p>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon-wrap">
                            <div className="value-card__icon">
                                <Users size={20} />
                            </div>
                        </div>
                        <h3>{t('about.value3Title')}</h3>
                        <p>{t('about.value3Desc')}</p>
                    </div>
                </div>
            </section>

            {/* ── Équipe ───────────────────────────── */}
            <section className="about-team bg-light reveal-up" ref={teamRef}>
                <div className="container">
                    <div className="section-header text-left">
                        <h2>{t('about.teamTitle')}</h2>
                        <p>{t('about.teamSubtitle')}</p>
                    </div>

                    <div className="team-grid">
                        {/* Direction & Approvisionnement (Lead) */}
                        <div className="team-row-lead">
                            <div className="team-card team-card--lead">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/1.png" alt="Jude FOGUENG" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Jude+FOGUENG&background=random'; }} />
                                </div>
                                <h3>M. Jude FOGUENG</h3>
                                <span className="team-card__role">{t('about.roleFounder')}</span>
                            </div>
                            <div className="team-card team-card--lead">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/4.png" alt="Kamla PHILEMON JOSUÉ" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Kamla+PHILEMON+JOSUÉ&background=random'; }} />
                                </div>
                                <h3>M. Kamla PHILEMON J.</h3>
                                <span className="team-card__role">{t('about.roleManager')}</span>
                            </div>
                        </div>

                        {/* Pôle Technique et Maintenance */}
                        <div className="team-row-members team-row-members--4">
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/3.png" alt="Fogueng Noubissi kely Rachel" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Fogueng+Noubissi+kely+Rachel&background=random'; }} />
                                </div>
                                <h3>Mlle Noubissie Kely Rachel</h3>
                                <span className="team-card__role">{t('about.roleEngineering')}</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/zasou.png" alt="Zasou" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Zasou&background=random'; }} />
                                </div>
                                <h3>Zasou</h3>
                                <span className="team-card__role">{t('about.roleExpertTech')}</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/christian.png" alt="Christian" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Christian&background=random'; }} />
                                </div>
                                <h3>Christian</h3>
                                <span className="team-card__role">{t('about.roleExpertTech')}</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/tagne.png" alt="Tagne BONIFACE" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Tagne+BONIFACE&background=random'; }} />
                                </div>
                                <h3>Tagne BONIFACE</h3>
                                <span className="team-card__role">{t('about.roleExpertTech')}</span>
                            </div>
                        </div>

                        {/* Logistique, Admin, Marketing */}
                        <div className="team-row-members team-row-members--4">
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/13.png" alt="Donald FOGUENG" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Donald+FOGUENG&background=random'; }} />
                                </div>
                                <h3>Donald FOGUENG</h3>
                                <span className="team-card__role">{t('about.roleLogistics')}</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/6.png" alt="Betuel Lavoisier FOGUENG" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Betuel+Lavoisier+FOGUENG&background=random'; }} />
                                </div>
                                <h3>Betuel L. FOGUENG</h3>
                                <span className="team-card__role">{t('about.roleInventories')}</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/5.png" alt="Duclair KENMOE" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Duclair+KENMOE&background=random'; }} />
                                </div>
                                <h3>Duclair KENMOE</h3>
                                <span className="team-card__role">{t('about.roleHR')}</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/17.png" alt="Darielle" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Darielle&background=random'; }} />
                                </div>
                                <h3>Darielle</h3>
                                <span className="team-card__role">{t('about.roleMarketing')}</span>
                            </div>
                        </div>

                        {/* Accueil et Service Client */}
                        <div className="team-row-members">
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/15.png" alt="Amélie Aimée NKUIDJEU" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Amélie+Aimée+NKUIDJEU&background=random'; }} />
                                </div>
                                <h3>Amélie Aimée N.</h3>
                                <span className="team-card__role">{t('about.roleSales')}</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/12.png" alt="Doris Gaye MOGUEM" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Doris+Gaye+MOGUEM&background=random'; }} />
                                </div>
                                <h3>Doris Gaye M.</h3>
                                <span className="team-card__role">{t('about.roleSales')}</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/14.png" alt="Edwige DOMBOU JAALA" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Edwige+DOMBOU+JAALA&background=random'; }} />
                                </div>
                                <h3>Edwige DOMBOU J.</h3>
                                <span className="team-card__role">{t('about.roleCashier')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Galerie Médias ─────────────────────────── */}
            <section className="about-gallery bg-light reveal-up" ref={galleryRef}>
                <div className="container">
                    <div className="section-header">
                        <h2>{t('about.galleryTitle')}</h2>
                        <p>{t('about.galleryDesc')}</p>
                        <div className="header-divider"></div>
                    </div>

                    <div className="gallery-grid">
                        <div className="gallery-item" role="button" aria-label="Agrandir l'image des locaux" tabIndex={0} onClick={() => openMedia({ type: 'image', src: '/images/1.jpeg', alt: 'Nos locaux' })}>
                            <div className="gallery-item__overlay">
                                <Camera size={40} />
                                <span>{t('about.viewImage')}</span>
                            </div>
                            <img src="/images/1.jpeg" alt="Nos locaux" loading="lazy" />
                        </div>
                        {/* Video */}
                        <div className="gallery-item gallery-item--video" role="button" aria-label="Lancer la vidéo de présentation" tabIndex={0} onClick={() => openMedia({ type: 'video', src: '/images/1.mp4', alt: 'Présentation' })}>
                            <div className="gallery-item__overlay">
                                <PlayCircle size={48} />
                                <span>{t('about.playVideo')}</span>
                            </div>
                            <video src="/images/1.mp4" alt="Présentation" loading="lazy" autoPlay muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        {/* Image 3 */}
                        <div className="gallery-item" role="button" aria-label="Agrandir l'image du matériel technique" tabIndex={0} onClick={() => openMedia({ type: 'image', src: '/images/2.jpeg', alt: 'Matériel technique' })}>
                            <div className="gallery-item__overlay">
                                <Camera size={40} />
                                <span>{t('about.viewImage')}</span>
                            </div>
                            <img src="/images/2.jpeg" alt="Matériel technique" loading="lazy" />
                        </div>
                        {/* Image 4 */}
                        <div className="gallery-item" role="button" aria-label="Agrandir l'image des équipements" tabIndex={0} onClick={() => openMedia({ type: 'image', src: '/images/4.jpeg', alt: 'Équipements' })}>
                            <div className="gallery-item__overlay">
                                <Camera size={40} />
                                <span>{t('about.viewImage')}</span>
                            </div>
                            <img src="/images/4.jpeg" alt="Équipements" loading="lazy" />
                        </div>
                    </div>
                </div>

                {/* Lightbox Modal */}
                {selectedMedia && (
                    <div className="lightbox-modal" onClick={closeMedia}>
                        <div className="lightbox-modal__content" onClick={(e) => e.stopPropagation()}>
                            <button className="lightbox-modal__close" onClick={closeMedia} aria-label="Fermer">
                                <X size={32} />
                            </button>
                            {selectedMedia.type === 'video' ? (
                                <video src={selectedMedia.src} autoPlay controls style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
                            ) : (
                                <img src={selectedMedia.src} alt={selectedMedia.alt || 'Images'} style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* ── Localisation & Contact ──────────────────── */}
            <section className="about-location">
                <div className="container">
                    <div className="location-wrapper">
                        <div className="location-info">
                            <h2>{t('about.locationTitle')}</h2>
                            <p className="location-subtitle">{t('about.locationSubtitle')}</p>

                            <div className="location-card">
                                <div className="location-card__icon">
                                    <MapPin size={28} />
                                </div>
                                <div className="location-card__content">
                                    <h3>{t('about.hqTitle')}</h3>
                                    <p>{t('about.hqAddress')}</p>
                                    <span>{t('about.hqDesc')}</span>
                                </div>
                            </div>

                            <div className="location-card mt-4">
                                <div className="location-card__icon">
                                    <MapPin size={28} />
                                </div>
                                <div className="location-card__content">
                                    <h3>{t('about.logisticsTitle')}</h3>
                                    <p>{t('about.logisticsAddress')}</p>
                                    <span>{t('about.logisticsDesc')}</span>
                                </div>
                            </div>


                        </div>

                        <div className="location-map">
                            {/* Google Maps iFrame for Camp Yabassi Douala */}
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15919.22723709735!2d9.70428585!3d4.05389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1061128540c4974f%3A0x6bbaaaaae875df6a!2sCamp%20Yabassi%2C%20Douala%2C%20Cameroun!5e0!3m2!1sfr!2sfr!4v1689360000000!5m2!1sfr!2sfr"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Carte Camp Yabassi NEWOTEG"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Témoignages ───────────────────────────── */}
            <section className="about-testimonials">
                <div className="container">
                    <div className="section-header">
                        <h2>{t('about.testimonialsTitle')}</h2>
                        <p>{t('about.testimonialsSubtitle')}</p>
                        <div className="header-divider"></div>
                    </div>

                    <div className="testimonials-grid">
                        <div className="testimonial-card">
                            <Quote className="quote-icon" size={32} />
                            <p className="testimonial-card__text">
                                {t('about.testi1')}
                            </p>
                            <div className="testimonial-card__author">
                                <strong>Jean-Marc Teguo</strong>
                                <span>{t('about.testi1Role')}</span>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <Quote className="quote-icon" size={32} />
                            <p className="testimonial-card__text">
                                {t('about.testi2')}
                            </p>
                            <div className="testimonial-card__author">
                                <strong>Samuel Etiko</strong>
                                <span>{t('about.testi2Role')}</span>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <Quote className="quote-icon" size={32} />
                            <p className="testimonial-card__text">
                                {t('about.testi3')}
                            </p>
                            <div className="testimonial-card__author">
                                <strong>Marie-Louise Ngo</strong>
                                <span>{t('about.testi3Role')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default About;
