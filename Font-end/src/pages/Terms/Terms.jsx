import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield, FileText, Scale, Building2, Globe, AlertTriangle, Phone } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import Footer from '../../components/Footer/Footer';
import './Terms.scss';

const Terms = () => {
    const { t } = useI18n();

    return (
        <div className="terms-page">
            <Helmet>
                <title>{t('terms.metaTitle')}</title>
                <meta name="description" content={t('terms.metaDesc')} />
                <link rel="canonical" href="https://newoteg.com/terms" />
                <meta property="og:title" content={t('terms.metaTitle')} />
                <meta property="og:description" content={t('terms.metaDesc')} />
                <meta property="og:url" content="https://newoteg.com/terms" />
                <meta property="og:image" content="https://newoteg.com/logo.png" />
            </Helmet>
            <div className="terms-header">
                <div className="container">
                    <h1>{t('terms.title')}</h1>
                    <p>{t('terms.lastUpdate').replace('{{date}}', new Date().toLocaleDateString('fr-FR'))}</p>
                </div>
            </div>

            <div className="container terms-content">
                <section className="legal-section">
                    <div className="legal-section__icon"><Building2 size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('terms.s1Title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('terms.s1P1') }}></p>
                        <ul>
                            <li dangerouslySetInnerHTML={{ __html: t('terms.s1L1') }}></li>
                            <li dangerouslySetInnerHTML={{ __html: t('terms.s1L2') }}></li>
                            <li dangerouslySetInnerHTML={{ __html: t('terms.s1L3') }}></li>
                            <li dangerouslySetInnerHTML={{ __html: t('terms.s1L4') }}></li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><FileText size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('terms.s2Title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('terms.s2P1') }}></p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Globe size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('terms.s3Title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('terms.s3P1') }}></p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Shield size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('terms.s4Title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('terms.s4P1') }}></p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Scale size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('terms.s5Title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('terms.s5P1') }}></p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><AlertTriangle size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('terms.s6Title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('terms.s6P1') }}></p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Scale size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('terms.s7Title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('terms.s7P1') }}></p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Phone size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('terms.s8Title')}</h2>
                        <p dangerouslySetInnerHTML={{ __html: t('terms.s8P1') }}></p>
                        <ul>
                            <li dangerouslySetInnerHTML={{ __html: t('terms.s8L1') }}></li>
                            <li dangerouslySetInnerHTML={{ __html: t('terms.s8L2') }}></li>
                            <li dangerouslySetInnerHTML={{ __html: t('terms.s8L3') }}></li>
                        </ul>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
};

export default Terms;
