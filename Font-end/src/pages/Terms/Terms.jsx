import React from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '../../components/Footer/Footer';
import './Terms.scss';

const Terms = () => {
    return (
        <div className="terms-page">
            <Helmet>
                <title>Conditions d'Utilisation — NEWOTEG SARL</title>
                <meta name="description" content="Consultez les conditions générales d'utilisation du site NEWOTEG SARL. Informations sur les commandes, la propriété intellectuelle et la juridiction compétente." />
            </Helmet>
            <div className="terms-header">
                <div className="container">
                    <h1>Conditions d'utilisation</h1>
                    <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
            </div>

            <div className="container terms-content">
                <section>
                    <h2>1. Acceptation des conditions</h2>
                    <p>
                        En accédant au site web de NEWOTEG SARL et en l'utilisant, vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre site ou nos services.
                    </p>
                </section>

                <section>
                    <h2>2. Utilisation du site</h2>
                    <p>
                        Le site web NEWOTEG SARL a pour but de fournir des informations sur nos produits, équipements techniques industriels et composants électroniques. Vous acceptez d'utiliser ce site uniquement à des fins légales et d'une manière qui ne porte pas atteinte aux droits de tiers, ni ne restreint ou n'empêche l'utilisation et la jouissance du site par qui que ce soit.
                    </p>
                </section>

                <section>
                    <h2>3. Propriété intellectuelle</h2>
                    <p>
                        L'ensemble du contenu de ce site (textes, images, logos, vidéos) est la propriété exclusive de NEWOTEG SARL et est protégé par les lois sur la propriété intellectuelle. Toute reproduction, distribution ou utilisation non autorisée du contenu est strictement interdite.
                    </p>
                </section>

                <section>
                    <h2>4. Produits et commandes</h2>
                    <p>
                        Les informations concernant nos produits sont fournies à titre indicatif. Nous nous efforçons de maintenir ces informations aussi exactes que possible, mais NEWOTEG SARL ne garantit pas que les descriptions de produits ou autres contenus soient parfaitement exacts, complets ou sans erreurs. Les prix et la disponibilité des produits peuvent être modifiés sans préavis.
                    </p>
                </section>

                <section>
                    <h2>5. Limitation de responsabilité</h2>
                    <p>
                        Dans toute la mesure permise par la loi applicable, NEWOTEG SARL ne saurait être tenu responsable des dommages directs, indirects, accessoires ou consécutifs résultant de l'utilisation ou de l'impossibilité d'utiliser ce site ou nos produits.
                    </p>
                </section>

                <section>
                    <h2>6. Juridiction compétente</h2>
                    <p>
                        Ces conditions sont régies et interprétées conformément aux lois en vigueur au Cameroun. Tout litige découlant de l'utilisation de ce site sera soumis à la compétence exclusive des tribunaux de Douala.
                    </p>
                </section>

                <section>
                    <h2>7. Contact</h2>
                    <p>
                        Pour toute question concernant ces conditions d'utilisation, veuillez nous contacter à l'adresse <strong>newoteg.com</strong> ou vous rendre dans nos locaux situés à Akwa, Rue Foch, Douala.
                    </p>
                </section>
            </div>

            <Footer />
        </div>
    );
};

export default Terms;
