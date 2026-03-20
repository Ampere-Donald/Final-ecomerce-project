import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin, Phone, Mail, Send, CheckCircle, User, MessageSquare, FileText } from 'lucide-react';
import Footer from '../../components/Footer/Footer';
import './Contact.scss';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
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
                <title>Contactez-Nous | NEWOTEG SARL</title>
                <meta name="description" content="Contactez NEWOTEG SARL pour vos besoins en composants électroniques, matériels informatiques et solutions logicielles au Cameroun." />
            </Helmet>

            {/* ── Hero Section ────────────────────────────── */}
            <section className="contact-hero">
                <div className="container contact-hero__content">
                    <span className="contact-hero__tag">À VOTRE ÉCOUTE</span>
                    <h1>Contactez <strong>NEWOTEG</strong></h1>
                    <p>
                        Notre équipe d'experts est disponible pour vous accompagner dans vos projets de maintenance industrielle, d'approvisionnement en composants et de développement logiciel.
                    </p>
                </div>
            </section>

            {/* ── Main Content ────────────────────────────── */}
            <section className="contact-main container">
                <div className="contact-grid">
                    
                    {/* Infos de Contact */}
                    <div className="contact-info">
                        <h2>Nos Coordonnées</h2>
                        <p className="contact-info__desc">
                            Retrouvez-nous dans nos différents sites à Douala ou contactez-nous directement par téléphone ou par email.
                        </p>

                        <div className="contact-cards">
                            <a href="https://maps.google.com/?q=Akwa+Rue+Foch+Douala+Cameroun" target="_blank" rel="noopener noreferrer" className="contact-card contact-card--clickable">
                                <div className="contact-card__icon">
                                    <MapPin size={24} />
                                </div>
                                <div className="contact-card__content">
                                    <h3>Direction Générale & Showroom</h3>
                                    <p>Akwa, Rue Foch, Douala</p>
                                    <span>Cliquez pour ouvrir dans Maps →</span>
                                </div>
                            </a>

                            <a href="https://maps.google.com/?q=Camp+Yabassi+Douala+Cameroun" target="_blank" rel="noopener noreferrer" className="contact-card contact-card--clickable">
                                <div className="contact-card__icon">
                                    <MapPin size={24} />
                                </div>
                                <div className="contact-card__content">
                                    <h3>Point de Service & Logistique</h3>
                                    <p>Akwa, Lieu-dit Camp Yabassi</p>
                                    <span>Cliquez pour ouvrir dans Maps →</span>
                                </div>
                            </a>

                            <a href="https://wa.me/237699966160" target="_blank" rel="noopener noreferrer" className="contact-card contact-card--clickable contact-card--whatsapp">
                                <div className="contact-card__icon contact-card__icon--whatsapp">
                                    <Phone size={24} />
                                </div>
                                <div className="contact-card__content">
                                    <h3>WhatsApp & Téléphone</h3>
                                    <p>+237 699 966 160 / 670 478 228</p>
                                    <span>Cliquez pour ouvrir WhatsApp →</span>
                                </div>
                            </a>

                            <a href="mailto:contact@newoteg.com" className="contact-card contact-card--clickable">
                                <div className="contact-card__icon">
                                    <Mail size={24} />
                                </div>
                                <div className="contact-card__content">
                                    <h3>Email</h3>
                                    <p>contact@newoteg.com</p>
                                    <span>Cliquez pour envoyer un email →</span>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Formulaire de Contact */}
                    <div className="contact-form-wrapper">
                        <div className="contact-form-container">
                            <h2>Envoyez-nous un message</h2>
                            <p>Remplissez le formulaire ci-dessous et nous vous recontacterons dans les plus brefs délais.</p>
                            
                            {isSuccess ? (
                                <div className="contact-success">
                                    <CheckCircle size={48} className="contact-success__icon" />
                                    <h3>Message envoyé !</h3>
                                    <p>Merci de nous avoir contactés. Notre équipe vous répondra très rapidement.</p>
                                </div>
                            ) : (
                                <form className="contact-form" onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label htmlFor="name">Nom complet *</label>
                                        <div className="form-group__input-wrapper">
                                            <User size={16} className="form-group__icon" />
                                            <input 
                                                type="text" 
                                                id="name" 
                                                name="name" 
                                                value={formData.name} 
                                                onChange={handleChange} 
                                                required 
                                                placeholder="Ex: Jean Dupont"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="email">Adresse email *</label>
                                        <div className="form-group__input-wrapper">
                                            <Mail size={16} className="form-group__icon" />
                                            <input 
                                                type="email" 
                                                id="email" 
                                                name="email" 
                                                value={formData.email} 
                                                onChange={handleChange} 
                                                required 
                                                placeholder="Ex: jean.dupont@email.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="subject">Sujet du message *</label>
                                        <div className="form-group__input-wrapper">
                                            <FileText size={16} className="form-group__icon" />
                                            <input 
                                                type="text" 
                                                id="subject" 
                                                name="subject" 
                                                value={formData.subject} 
                                                onChange={handleChange} 
                                                required 
                                                placeholder="Ex: Demande de devis"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="message">Votre message *</label>
                                        <div className="form-group__input-wrapper form-group__input-wrapper--textarea">
                                            <MessageSquare size={16} className="form-group__icon form-group__icon--textarea" />
                                            <textarea 
                                                id="message" 
                                                name="message" 
                                                value={formData.message} 
                                                onChange={handleChange} 
                                                required 
                                                rows="5"
                                                placeholder="Détaillez votre besoin ici..."
                                            ></textarea>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn--primary submit-btn" disabled={isSubmitting}>
                                        {isSubmitting ? 'Envoi en cours...' : (
                                            <>
                                                Envoyer le message <Send size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                </div>
            </section>

            {/* ── Google Maps ────────────────────────────── */}
            <section className="contact-map">
                <div className="container">
                    <div className="section-header text-center">
                        <h2>Retrouvez-nous sur la carte</h2>
                        <p>Nos locaux à Douala sont facilement accessibles. N'hésitez pas à nous rendre visite.</p>
                        <div className="header-divider mx-auto"></div>
                    </div>
                </div>
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15919.22723709735!2d9.70428585!3d4.05389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1061128540c4974f%3A0x6bbaaaaae875df6a!2sCamp%20Yabassi%2C%20Douala%2C%20Cameroun!5e0!3m2!1sfr!2sfr!4v1689360000000!5m2!1sfr!2sfr"
                    width="100%"
                    height="450"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Carte Locaux NEWOTEG"
                    className="map-iframe"
                ></iframe>
            </section>

            <Footer />
        </div>
    );
};

export default Contact;
