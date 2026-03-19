import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Cpu, Wrench, Shield, Home, Award, Zap, Users, Quote, MapPin, Camera, PlayCircle, X, Code, Globe, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer/Footer';
import './About.scss';

const About = () => {
    const [selectedMedia, setSelectedMedia] = useState(null);

    const openMedia = (media) => setSelectedMedia(media);
    const closeMedia = () => setSelectedMedia(null);

    return (
        <div className="about-page">
            <Helmet>
                <title>À Propos de NEWOTEG — Notre Histoire et Notre Équipe | NEWOTEG SARL</title>
                <meta name="description" content="Découvrez l'histoire de NEWOTEG SARL, de X Electronics à l'excellence technologique. Notre équipe, nos valeurs et nos points de vente à Douala, Cameroun." />
            </Helmet>
            {/* ── Hero Section ────────────────────────────── */}
            <section className="about-hero">
                <div className="container about-hero__content">
                    <span className="about-hero__tag">À PROPOS DE NEWOTEG SARL</span>
                    <h1>Notre Histoire : De <strong>l'Expertise Technique</strong> à l'Innovation <strong>Numérique</strong></h1>
                    <p>
                        L'aventure a débuté sous l'enseigne X Electronics, une structure reconnue à Douala pour sa maîtrise de la maintenance audiovisuelle et informatique. Fondée en 2011 par Monsieur Jude FOGUENG, l'entreprise a évolué pour devenir NEWOTEG (New World Technologie Group) SARL.
                    </p>
                    <div className="about-hero__actions">
                        <Link to="/catalogue" className="btn btn--primary">Découvrir nos produits &rarr;</Link>
                        <Link to="/catalogue" className="btn btn--white">Nos Services</Link>
                    </div>
                </div>
            </section>

            {/* ── Expertise / Histoire ─────────────────────────────── */}
            <section className="about-expertise container">
                <div className="about-expertise__text">
                    <h2>Une évolution motivée par l'excellence</h2>
                    <p>
                        NEWOTEG (New World Technologie Group) SARL reflète notre volonté d'intégrer les nouvelles technologies au cœur de nos services.
                    </p>
                    <p>
                        Historiquement spécialisés dans la maintenance de haute précision, nous avons forgé notre réputation sur le terrain. Pour répondre aux besoins croissants du marché camerounais, nous sommes devenus importateurs directs de composants électroniques et d'appareils de pointe en provenance d'Europe, de Chine et du Canada.
                    </p>
                    <h2>Le Tournant Digital : L'Expertise Logicielle</h2>
                    <p>
                        Aujourd'hui, NEWOTEG franchit une étape décisive. Conscients que la performance matérielle est indissociable de l'intelligence logicielle, nous avons structuré un pôle <strong>Développement de Logiciels</strong>.
                    </p>
                    <p>
                        Sous la direction de Mlle Noubissie Kely Rachel, ce département a pour mission initiale l'automatisation intégrale de nos propres processus (gestion de stocks, suivi client, logistique). Cette transformation digitale interne est le socle qui nous permet de garantir une réactivité inégalée et de préparer, à terme, l'accompagnement de nos partenaires vers des solutions numériques sur mesure.
                    </p>
                </div>
                <div className="about-expertise__image">
                    <img src="/images/about_expertise.png" alt="Ingénieurs NEWOTEG" loading="lazy" />
                </div>
            </section>

            {/* ── Chiffres Clés (Social Proof) ───────────────── */}
            <section className="about-stats bg-light">
                <div className="container">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>15+</h3>
                            <p>Années d'Expérience</p>
                        </div>
                        <div className="stat-card">
                            <h3>500+</h3>
                            <p>Clients Satisfaits</p>
                        </div>
                        <div className="stat-card">
                            <h3>10k+</h3>
                            <p>Composants en Stock</p>
                        </div>
                        <div className="stat-card">
                            <h3>24/7</h3>
                            <p>Support Technique</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Pourquoi nous faire confiance ? (Confiance) ─────────────────────────── */}
            <section className="about-offers bg-light">
                <div className="container">
                    <div className="section-header">
                        <h2>Pourquoi nous faire confiance ?</h2>
                        <p>UNE OFFRE BÂTIE SUR LA QUALITÉ, LA RAPIDITÉ ET LA SÉCURITÉ POUR L'AFRIQUE CENTRALE.</p>
                    </div>

                    <div className="offers-grid">
                        <div className="offer-card">
                            <div className="offer-card__icon">
                                <Shield size={24} />
                            </div>
                            <h3>Produits Authentiques</h3>
                            <p>Une traçabilité garantie pour chaque composant importé. Nous sourçons directement d'Europe, de Chine et du Canada.</p>
                        </div>
                        <div className="offer-card">
                            <div className="offer-card__icon">
                                <Code size={24} />
                            </div>
                            <h3>Synergie Hardware & Software</h3>
                            <p>Une vision globale alliant la maintenance physique du matériel et l'optimisation par le code et les solutions logicielles.</p>
                        </div>
                        <div className="offer-card">
                            <div className="offer-card__icon">
                                <Truck size={24} />
                            </div>
                            <h3>Réactivité Logistique</h3>
                            <p>Un réseau optimisé pour couvrir Douala et l'ensemble de la zone CEMAC avec rapidité et fiabilité.</p>
                        </div>
                        <div className="offer-card">
                            <div className="offer-card__icon">
                                <Wrench size={24} />
                            </div>
                            <h3>Support Technique</h3>
                            <p>Des experts dédiés qui connaissent et maîtrisent réellement le matériel industriel qu'ils vous vendent.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Valeurs ───────────────────────────── */}
            <section className="about-values container">
                <div className="section-header">
                    <h2>Nos Valeurs</h2>
                </div>

                <div className="values-grid">
                    <div className="value-card">
                        <div className="value-card__icon-wrap">
                            <div className="value-card__icon">
                                <Shield size={20} />
                            </div>
                        </div>
                        <h3>L’Intégrité</h3>
                        <p>Transparence totale sur l'origine de nos produits.</p>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon-wrap">
                            <div className="value-card__icon">
                                <Award size={20} />
                            </div>
                        </div>
                        <h3>L’Excellence Technique</h3>
                        <p>Plus de 15 ans d'expérience métier à votre service.</p>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon-wrap">
                            <div className="value-card__icon">
                                <Users size={20} />
                            </div>
                        </div>
                        <h3>Le Sens du Service</h3>
                        <p>Chaque client est un partenaire que nous accompagnons vers la réussite.</p>
                    </div>
                </div>
            </section>

            {/* ── Équipe ───────────────────────────── */}
            <section className="about-team bg-light">
                <div className="container">
                    <div className="section-header text-left">
                        <h2>L'Équipe NEWOTEG</h2>
                        <p>DIRECTION, PÔLE INGÉNIERIE & INNOVATION, LOGISTIQUE & ADMINISTRATION — UNE ÉQUIPE COMPLÈTE À VOTRE SERVICE.</p>
                    </div>

                    <div className="team-grid">
                        {/* Direction & Approvisionnement (Lead) */}
                        <div className="team-row-lead">
                            <div className="team-card team-card--lead">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/1.png" alt="Jude FOGUENG" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Jude+FOGUENG&background=random'; }} />
                                </div>
                                <h3>M. Jude FOGUENG</h3>
                                <span className="team-card__role">Fondateur & Import</span>
                            </div>
                            <div className="team-card team-card--lead">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/4.png" alt="Kamla PHILEMON JOSUÉ" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Kamla+PHILEMON+JOSUÉ&background=random'; }} />
                                </div>
                                <h3>M. Kamla PHILEMON J.</h3>
                                <span className="team-card__role">Gérant</span>
                            </div>
                        </div>

                        {/* Pôle Technique et Maintenance */}
                        <div className="team-row-members team-row-members--4">
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/3.png" alt="Fogueng Noubissi kely Rachel" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Fogueng+Noubissi+kely+Rachel&background=random'; }} />
                                </div>
                                <h3>Mlle Noubissie Kely Rachel</h3>
                                <span className="team-card__role">Pôle Ingénierie & Innovation</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/zasou.png" alt="Zasou" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Zasou&background=random'; }} />
                                </div>
                                <h3>Zasou</h3>
                                <span className="team-card__role">Expert Technicien</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/christian.png" alt="Christian" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Christian&background=random'; }} />
                                </div>
                                <h3>Christian</h3>
                                <span className="team-card__role">Expert Technicien</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/tagne.png" alt="Tagne BONIFACE" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Tagne+BONIFACE&background=random'; }} />
                                </div>
                                <h3>Tagne BONIFACE</h3>
                                <span className="team-card__role">Expert Technicien</span>
                            </div>
                        </div>

                        {/* Logistique, Admin, Marketing */}
                        <div className="team-row-members team-row-members--4">
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/13.png" alt="Donald FOGUENG" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Donald+FOGUENG&background=random'; }} />
                                </div>
                                <h3>Donald FOGUENG</h3>
                                <span className="team-card__role">Resp. Logistique</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/6.png" alt="Betuel Lavoisier FOGUENG" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Betuel+Lavoisier+FOGUENG&background=random'; }} />
                                </div>
                                <h3>Betuel L. FOGUENG</h3>
                                <span className="team-card__role">Promoteur / Inventaires</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/5.png" alt="Duclair KENMOE" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Duclair+KENMOE&background=random'; }} />
                                </div>
                                <h3>Duclair KENMOE</h3>
                                <span className="team-card__role">RH & Comptabilité</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/17.png" alt="Darielle" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Darielle&background=random'; }} />
                                </div>
                                <h3>Darielle</h3>
                                <span className="team-card__role">Responsable Marketing</span>
                            </div>
                        </div>

                        {/* Accueil et Service Client */}
                        <div className="team-row-members">
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/15.png" alt="Amélie Aimée NKUIDJEU" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Amélie+Aimée+NKUIDJEU&background=random'; }} />
                                </div>
                                <h3>Amélie Aimée N.</h3>
                                <span className="team-card__role">Vente au Comptoir</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/12.png" alt="Doris Gaye MOGUEM" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Doris+Gaye+MOGUEM&background=random'; }} />
                                </div>
                                <h3>Doris Gaye M.</h3>
                                <span className="team-card__role">Vente au Comptoir</span>
                            </div>
                            <div className="team-card">
                                <div className="team-card__image">
                                    <img src="/images/img-equipe/14.png" alt="Edwige DOMBOU JAALA" loading="lazy" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Edwige+DOMBOU+JAALA&background=random'; }} />
                                </div>
                                <h3>Edwige DOMBOU J.</h3>
                                <span className="team-card__role">Caisse</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Galerie Médias ─────────────────────────── */}
            <section className="about-gallery bg-light">
                <div className="container">
                    <div className="section-header">
                        <h2>Notre Entreprise en Images</h2>
                        <p>Découvrez nos installations, nos produits et notre équipe en action chez NEWOTEG.</p>
                        <div className="header-divider"></div>
                    </div>

                    <div className="gallery-grid">
                        <div className="gallery-item" role="button" aria-label="Agrandir l'image des locaux" tabIndex={0} onClick={() => openMedia({ type: 'image', src: '/images/1.jpeg', alt: 'Nos locaux' })}>
                            <div className="gallery-item__overlay">
                                <Camera size={40} />
                                <span>Voir l'image</span>
                            </div>
                            <img src="/images/1.jpeg" alt="Nos locaux" loading="lazy" />
                        </div>
                        {/* Video */}
                        <div className="gallery-item gallery-item--video" role="button" aria-label="Lancer la vidéo de présentation" tabIndex={0} onClick={() => openMedia({ type: 'video', src: '/images/1.mp4', alt: 'Présentation' })}>
                            <div className="gallery-item__overlay">
                                <PlayCircle size={48} />
                                <span>Lancer la vidéo</span>
                            </div>
                            <video src="/images/1.mp4" alt="Présentation" loading="lazy" autoPlay muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        {/* Image 3 */}
                        <div className="gallery-item" role="button" aria-label="Agrandir l'image du matériel technique" tabIndex={0} onClick={() => openMedia({ type: 'image', src: '/images/2.jpeg', alt: 'Matériel technique' })}>
                            <div className="gallery-item__overlay">
                                <Camera size={40} />
                                <span>Voir l'image</span>
                            </div>
                            <img src="/images/2.jpeg" alt="Matériel technique" loading="lazy" />
                        </div>
                        {/* Image 4 */}
                        <div className="gallery-item" role="button" aria-label="Agrandir l'image des équipements" tabIndex={0} onClick={() => openMedia({ type: 'image', src: '/images/4.jpeg', alt: 'Équipements' })}>
                            <div className="gallery-item__overlay">
                                <Camera size={40} />
                                <span>Voir l'image</span>
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
                            <h2>Une Présence Stratégique</h2>
                            <p className="location-subtitle">Pour assurer la proximité avec nos clients, NEWOTEG s'appuie sur deux sites névralgiques :</p>

                            <div className="location-card">
                                <div className="location-card__icon">
                                    <MapPin size={28} />
                                </div>
                                <div className="location-card__content">
                                    <h3>Direction Générale & Showroom</h3>
                                    <p>Akwa, Rue Foch, Douala</p>
                                    <span>Centre de nos activités administratives et commerciales</span>
                                </div>
                            </div>

                            <div className="location-card mt-4">
                                <div className="location-card__icon">
                                    <MapPin size={28} />
                                </div>
                                <div className="location-card__content">
                                    <h3>Point de Service & Logistique</h3>
                                    <p>Akwa, Lieu-dit Camp Yabassi</p>
                                    <span>(Ancien dépôt de planches)</span>
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
                        <h2>Ce que disent nos clients</h2>
                        <p>Découvrez les retours de nos clients professionnels et particuliers sur nos produits et services.</p>
                        <div className="header-divider"></div>
                    </div>

                    <div className="testimonials-grid">
                        <div className="testimonial-card">
                            <Quote className="quote-icon" size={32} />
                            <p className="testimonial-card__text">
                                "L'excellence des composants techniques est bien au rendez-vous. NEWOTEG s'est devenu mon fournisseur principal pour tous mes projets de maintenance industrielle."
                            </p>
                            <div className="testimonial-card__author">
                                <strong>Jean-Marc Teguo</strong>
                                <span>Responsable Maintenance</span>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <Quote className="quote-icon" size={32} />
                            <p className="testimonial-card__text">
                                "Le matériel de soudure est d'une précision incroyable. On sent que NEWOTEG sélectionne uniquement des produits de qualité professionnelle."
                            </p>
                            <div className="testimonial-card__author">
                                <strong>Samuel Etiko</strong>
                                <span>Électricien Indépendant</span>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <Quote className="quote-icon" size={32} />
                            <p className="testimonial-card__text">
                                "Service client exceptionnel. Ils m'ont conseillé sur le meilleur système de vidéosurveillance pour mon commerce. Je recommande vivement !"
                            </p>
                            <div className="testimonial-card__author">
                                <strong>Marie-Louise Ngo</strong>
                                <span>Gérante de Magasin</span>
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
