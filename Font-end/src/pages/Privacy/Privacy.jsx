import React from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '../../components/Footer/Footer';
import './Privacy.scss';

const Privacy = () => {
    return (
        <div className="privacy-page">
            <Helmet>
                <title>Politique de Confidentialité — NEWOTEG SARL</title>
                <meta name="description" content="Découvrez comment NEWOTEG SARL protège vos données personnelles. Politique de confidentialité, droits d'accès et sécurité des informations." />
            </Helmet>
            <div className="privacy-header">
                <div className="container">
                    <h1>Politique de Confidentialité</h1>
                    <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
            </div>

            <div className="container privacy-content">
                <section>
                    <h2>1. Introduction</h2>
                    <p>
                        Chez NEWOTEG SARL, nous accordons une grande importance à la protection de vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons, partageons et protégeons les informations que vous nous confiez lorsque vous utilisez notre site web et nos services.
                    </p>
                </section>

                <section>
                    <h2>2. Données collectées</h2>
                    <p>
                        Nous pouvons collecter les informations suivantes :
                    </p>
                    <ul>
                        <li><strong>Informations d'identification :</strong> Nom, prénom, adresse e-mail, numéro de téléphone (lorsque vous nous contactez ou créez un compte).</li>
                        <li><strong>Données de transaction :</strong> Historique des achats, adresses de facturation et de livraison liées aux commandes de nos équipements et composants.</li>
                        <li><strong>Données de navigation :</strong> Adresse IP, type de navigateur, pages visitées sur notre site, afin d'améliorer l'expérience utilisateur.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. Utilisation de vos données</h2>
                    <p>
                        Vos informations sont utilisées pour :
                    </p>
                    <ul>
                        <li>Traiter vos commandes et assurer la livraison de vos produits en Afrique Centrale.</li>
                        <li>Communiquer avec vous concernant vos achats ou répondre à vos demandes (support technique, devis).</li>
                        <li>Améliorer nos offres, notre site web et personnaliser votre expérience client.</li>
                        <li>Vous envoyer des informations pertinentes sur nos nouveaux arrivages (uniquement si vous y avez consenti via notre newsletter).</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Protection et Sécurité</h2>
                    <p>
                        Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données personnelles contre tout accès non autorisé, altération, divulgation ou destruction. Nos transactions en ligne sont sécurisées selon les standards de l'industrie.
                    </p>
                </section>

                <section>
                    <h2>5. Partage des données</h2>
                    <p>
                        NEWOTEG SARL ne vend pas, ne loue pas et ne commercialise pas vos données personnelles à des tiers. Nous pouvons partager vos informations uniquement avec des prestataires de confiance (par exemple, nos partenaires logistiques pour la livraison) qui s'engagent à respecter la confidentialité de vos données.
                    </p>
                </section>

                <section>
                    <h2>6. Vos droits</h2>
                    <p>
                        Conformément à la réglementation applicable, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition au traitement de vos données personnelles. Si vous souhaitez exercer ces droits, vous pouvez nous contacter à tout moment.
                    </p>
                </section>

                <section>
                    <h2>7. Nous contacter</h2>
                    <p>
                        Pour toute question relative à notre politique de confidentialité ou pour exercer vos droits, veuillez nous contacter à l'adresse <strong>newoteg.com</strong> ou vous rendre dans nos bureaux à Akwa, Rue Foch, Douala.
                    </p>
                </section>
            </div>

            <Footer />
        </div>
    );
};

export default Privacy;
