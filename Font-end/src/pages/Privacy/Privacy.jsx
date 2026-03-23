import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield, Lock, Eye, UserCheck, Database, Globe, Phone, FileText } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { renderBoldText } from '../../utils/renderBoldText';
import Footer from '../../components/Footer/Footer';
import './Privacy.scss';

const Privacy = () => {
    const { t } = useI18n();

    return (
        <div className="privacy-page">
            <Helmet>
                <title>{t('privacy.metaTitle')}</title>
                <meta name="description" content={t('privacy.metaDesc')} />
                <link rel="canonical" href="https://newoteg.com/privacy" />
                <meta property="og:title" content={t('privacy.metaTitle')} />
                <meta property="og:description" content={t('privacy.metaDesc')} />
                <meta property="og:url" content="https://newoteg.com/privacy" />
                <meta property="og:image" content="https://newoteg.com/logo.png" />
            </Helmet>
            <div className="privacy-header">
                <div className="container">
                    <h1>{t('privacy.title')}</h1>
                    <p>{t('privacy.lastUpdate').replace('{{date}}', new Date().toLocaleDateString('fr-FR'))}</p>
                </div>
            </div>

            <div className="container privacy-content">
                <section className="legal-section">
                    <div className="legal-section__icon"><Shield size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('privacy.s1Title')}</h2>
                        <p>{renderBoldText(t('privacy.s1P1'))}</p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Database size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('privacy.s2Title')}</h2>
                        <p>{renderBoldText(t('privacy.s2P1'))}</p>
                        <ul>
                            <li>{renderBoldText(t('privacy.s2L1'))}</li>
                            <li>{renderBoldText(t('privacy.s2L2'))}</li>
                            <li>{renderBoldText(t('privacy.s2L3'))}</li>
                            <li>{renderBoldText(t('privacy.s2L4'))}</li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Eye size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('privacy.s3Title')}</h2>
                        <p>{renderBoldText(t('privacy.s3P1'))}</p>
                        <ul>
                            <li>{renderBoldText(t('privacy.s3L1'))}</li>
                            <li>{renderBoldText(t('privacy.s3L2'))}</li>
                            <li>{renderBoldText(t('privacy.s3L3'))}</li>
                            <li>{renderBoldText(t('privacy.s3L4'))}</li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Lock size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('privacy.s4Title')}</h2>
                        <p>{renderBoldText(t('privacy.s4P1'))}</p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Globe size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('privacy.s5Title')}</h2>
                        <p>{renderBoldText(t('privacy.s5P1'))}</p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><UserCheck size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('privacy.s6Title')}</h2>
                        <p>{renderBoldText(t('privacy.s6P1'))}</p>
                        <ul>
                            <li>{renderBoldText(t('privacy.s6L1'))}</li>
                            <li>{renderBoldText(t('privacy.s6L2'))}</li>
                            <li>{renderBoldText(t('privacy.s6L3'))}</li>
                            <li>{renderBoldText(t('privacy.s6L4'))}</li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><FileText size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('privacy.s7Title')}</h2>
                        <p>{renderBoldText(t('privacy.s7P1'))}</p>
                    </div>
                </section>

                <section className="legal-section">
                    <div className="legal-section__icon"><Phone size={24} /></div>
                    <div className="legal-section__body">
                        <h2>{t('privacy.s8Title')}</h2>
                        <p>{renderBoldText(t('privacy.s8P1'))}</p>
                        <ul>
                            <li>{renderBoldText(t('privacy.s8L1'))}</li>
                            <li>{renderBoldText(t('privacy.s8L2'))}</li>
                            <li>{renderBoldText(t('privacy.s8L3'))}</li>
                        </ul>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
};

export default Privacy;
