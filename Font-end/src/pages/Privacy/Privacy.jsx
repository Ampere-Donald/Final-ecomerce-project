import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield, Lock, Eye, UserCheck, Database, Globe, Phone, FileText } from 'lucide-react';
import Footer from '../../components/Footer/Footer';
import './Privacy.scss';

const Privacy = () => {
    return (
        <div className="privacy-page">
            <Helmet>
                <title>Politique de Confidentialité — NEWOTEG SARL</title>
                <meta name="description" content="Politique de Confidentialité de NEWOTEG SARL. Protection de vos données personnelles conformément à la législation camerounaise." />
            </Helmet>
            <div className="privacy-header">
                <div className="container">
                    <h1>Politique de Confidentialité</h1>
                    <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
            </div>

            <div className="container privacy-content">
                <section className="legal-section">
                    <div className="legal-section__icon"><Shield size={24} /></div>
                    <div className="legal-section__body">
                        <h2>1. Engagement de NEWOTEG SARL</h2>
                        <p>
                            NEWOTEG (New World Technologie Group) SARL, société de droit camerounais basée à Akwa, Douala, s'engage à protéger la vie privée et les données personnelles de ses utilisateurs, clients et partenaires. La présente politique est conforme à la loi n° 2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité au Cameroun, ainsi qu'aux standards internationaux de protection des données.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Database size={24} /></div>
                    <div className="legal-section__body">
                        <h2>2. Données Collectées</h2>
                        <p>Dans le cadre de nos activités, nous pouvons collecter :</p>
                        <ul>
                            <li><strong>Informations d'identification :</strong> Nom, prénom, adresse e-mail, numéro de téléphone (lors de la création de compte ou de la prise de contact).</li>
                            <li><strong>Données transactionnelles :</strong> Historique des achats, adresses de livraison, détails des commandes de composants électroniques et équipements.</li>
                            <li><strong>Données de navigation :</strong> Adresse IP, type de navigateur, pages visitées, afin d'améliorer l'expérience utilisateur sur notre plateforme.</li>
                            <li><strong>Données de newsletter :</strong> Adresse email pour les inscriptions à notre newsletter promotionnelle.</li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Eye size={24} /></div>
                    <div className="legal-section__body">
                        <h2>3. Finalités du Traitement</h2>
                        <p>Vos données sont traitées pour :</p>
                        <ul>
                            <li>Traiter et assurer le suivi de vos commandes sur le territoire camerounais et en zone CEMAC.</li>
                            <li>Communiquer avec vous concernant vos achats, demandes de devis ou support technique.</li>
                            <li>Améliorer nos services, personnaliser votre expérience et optimiser notre plateforme e-commerce.</li>
                            <li>Vous informer de nos nouveaux arrivages et promotions (uniquement avec votre consentement préalable).</li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Lock size={24} /></div>
                    <div className="legal-section__body">
                        <h2>4. Sécurité des Données</h2>
                        <p>
                            NEWOTEG SARL met en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, altération, divulgation ou destruction. Les mots de passe sont chiffrés. Les échanges de données sensibles sont sécurisés via protocole HTTPS.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Globe size={24} /></div>
                    <div className="legal-section__body">
                        <h2>5. Partage et Transfert des Données</h2>
                        <p>
                            NEWOTEG SARL ne vend, ne loue et ne commercialise en aucun cas vos données personnelles. Nous pouvons partager vos informations uniquement avec des prestataires de confiance (partenaires logistiques pour la livraison) qui s'engagent contractuellement à respecter la confidentialité de vos données, conformément au droit camerounais.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><UserCheck size={24} /></div>
                    <div className="legal-section__body">
                        <h2>6. Vos Droits</h2>
                        <p>
                            Conformément à la législation camerounaise en vigueur, vous disposez des droits suivants :
                        </p>
                        <ul>
                            <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données personnelles détenues par NEWOTEG.</li>
                            <li><strong>Droit de rectification :</strong> Demander la correction de données inexactes ou incomplètes.</li>
                            <li><strong>Droit de suppression :</strong> Demander l'effacement de vos données, sous réserve des obligations légales de conservation.</li>
                            <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données à des fins de prospection commerciale.</li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><FileText size={24} /></div>
                    <div className="legal-section__body">
                        <h2>7. Conservation des Données</h2>
                        <p>
                            Vos données personnelles sont conservées pendant la durée strictement nécessaire aux finalités pour lesquelles elles ont été collectées, et conformément aux délais de prescription prévus par le droit camerounais et les Actes Uniformes OHADA.
                        </p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Phone size={24} /></div>
                    <div className="legal-section__body">
                        <h2>8. Contact — Délégué à la Protection des Données</h2>
                        <p>
                            Pour exercer vos droits ou pour toute question relative à notre politique de confidentialité :
                        </p>
                        <ul>
                            <li><strong>Email :</strong> contact@newoteg.com</li>
                            <li><strong>Téléphone :</strong> +237 699 966 160 / 670 478 228</li>
                            <li><strong>Adresse :</strong> NEWOTEG SARL — Akwa, Rue Foch, Douala, Cameroun</li>
                        </ul>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
};

export default Privacy;
