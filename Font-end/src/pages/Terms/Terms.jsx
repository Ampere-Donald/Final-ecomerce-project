import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield, FileText, Scale, Building2, Globe, AlertTriangle, Phone } from 'lucide-react';
import Footer from '../../components/Footer/Footer';
import './Terms.scss';

const Terms = () => {
    return (
        <div className="terms-page">
            <Helmet>
                <title>Conditions Générales d'Utilisation — NEWOTEG SARL</title>
                <meta name="description" content="Conditions Générales d'Utilisation de NEWOTEG SARL, conformes au droit OHADA et à la législation camerounaise." />
            </Helmet>
            <div className="terms-header">
                <div className="container">
                    <h1>Conditions Générales d'Utilisation</h1>
                    <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
            </div>

            <div className="container terms-content">
                <section className="legal-section">
                    <div className="legal-section__icon"><Building2 size={24} /></div>
                    <div className="legal-section__body">
                        <h2>1. Identification de l'Éditeur</h2>
                        <p>
                            Le présent site web est édité par <strong>NEWOTEG (New World Technologie Group) SARL</strong>, société à responsabilité limitée de droit camerounais, immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) de Douala.
                        </p>
                        <ul>
                            <li><strong>Siège social :</strong> Akwa, Rue Foch, Douala, Cameroun</li>
                            <li><strong>Point de Service :</strong> Akwa, Lieu-dit Camp Yabassi, Douala</li>
                            <li><strong>Fondateur & Représentant légal :</strong> M. Jude FOGUENG</li>
                            <li><strong>Contact :</strong> contact@newoteg.com | +237 699 966 160</li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><FileText size={24} /></div>
                    <div className="legal-section__body">
                        <h2>2. Acceptation des Conditions</h2>
                        <p>
                            En accédant au site web de NEWOTEG SARL et en l'utilisant, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation (CGU), conformément aux dispositions de l'Acte Uniforme OHADA relatif au Droit Commercial Général et à la loi n° 2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité au Cameroun.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Globe size={24} /></div>
                    <div className="legal-section__body">
                        <h2>3. Objet et Utilisation du Site</h2>
                        <p>
                            Le site web NEWOTEG SARL a pour objet de présenter nos activités d'importation et de distribution de composants électroniques, d'équipements industriels et de solutions de maintenance. Vous vous engagez à utiliser ce site uniquement à des fins licites et conformément à la réglementation camerounaise en vigueur.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Shield size={24} /></div>
                    <div className="legal-section__body">
                        <h2>4. Propriété Intellectuelle</h2>
                        <p>
                            L'ensemble du contenu de ce site (textes, images, logos, vidéos, marques, noms de domaine) est la propriété exclusive de NEWOTEG SARL et est protégé par le droit de la propriété intellectuelle applicable au Cameroun et dans l'espace OAPI (Organisation Africaine de la Propriété Intellectuelle). Toute reproduction, représentation, distribution ou exploitation non autorisée est strictement interdite et constitue un acte de contrefaçon sanctionné pénalement.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Scale size={24} /></div>
                    <div className="legal-section__body">
                        <h2>5. Commandes et Transactions Commerciales</h2>
                        <p>
                            Les informations relatives à nos produits sont fournies à titre indicatif. Toute commande passée via notre plateforme est régie par les dispositions de l'Acte Uniforme OHADA portant sur le Droit Commercial Général. NEWOTEG SARL se réserve le droit de modifier les prix et la disponibilité des produits sans préavis. Les prix sont exprimés en Franc CFA (XAF).
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><AlertTriangle size={24} /></div>
                    <div className="legal-section__body">
                        <h2>6. Limitation de Responsabilité</h2>
                        <p>
                            Dans les limites autorisées par la législation camerounaise et les Actes Uniformes OHADA, NEWOTEG SARL ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser ce site ou nos produits.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Scale size={24} /></div>
                    <div className="legal-section__body">
                        <h2>7. Droit Applicable et Juridiction</h2>
                        <p>
                            Les présentes CGU sont régies par le droit camerounais et les Actes Uniformes de l'Organisation pour l'Harmonisation en Afrique du Droit des Affaires (OHADA). En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents de Douala, Cameroun, seront seuls compétents.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Phone size={24} /></div>
                    <div className="legal-section__body">
                        <h2>8. Contact</h2>
                        <p>
                            Pour toute question relative aux présentes CGU, veuillez nous contacter :
                        </p>
                        <ul>
                            <li><strong>Email :</strong> contact@newoteg.com</li>
                            <li><strong>Téléphone :</strong> +237 699 966 160 / 670 478 228</li>
                            <li><strong>Adresse :</strong> Akwa, Rue Foch, Douala, Cameroun</li>
                        </ul>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
};

export default Terms;
