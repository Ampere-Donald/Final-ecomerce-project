import { Helmet } from 'react-helmet-async';
import { useI18n } from '../../context/I18nContext';
import HeroBanner from '../../components/HeroBanner/HeroBanner';
import Features from '../../components/Features/Features';
import CategoryGrid from '../../components/CategoryGrid/CategoryGrid';
import FeaturedProducts from '../../components/FeaturedProducts/FeaturedProducts';
import Newsletter from '../../components/Newsletter/Newsletter';
import Footer from '../../components/Footer/Footer';
import './Home.scss';

// Partner Logos (using simple text/svg for B2B electronic brands vibe)
const PartnerBrands = () => {
    const { t } = useI18n();
    const brands = [
        "STMicroelectronics", "Texas Instruments", "Microchip", "Arduino",
        "Raspberry Pi", "NXP", "Analog Devices"
    ];

    return (
        <section className="partner-brands">
            <div className="container">
                <p className="partner-brands__title">{t('home.partnerBrands')}</p>
                <div className="partner-brands__marquee">
                    <div className="partner-brands__track">
                        {[...brands, ...brands, ...brands].map((brand, i) => (
                            <span key={i} className="partner-brands__name">{brand}</span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const Home = () => {
    const { t } = useI18n();
    return (
        <div className="home-page">
            <Helmet>
                <title>{t('home.metaTitle')}</title>
                <meta name="description" content={t('home.metaDesc')} />
                <link rel="canonical" href="https://newoteg.com/" />
                <meta property="og:title" content={t('home.metaTitle')} />
                <meta property="og:description" content={t('home.metaDesc')} />
                <meta property="og:url" content="https://newoteg.com/" />
                <meta property="og:type" content="website" />
                <meta property="og:image" content="https://newoteg.com/logo.png" />
                <script type="application/ld+json">{JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "NEWOTEG SARL",
                    "url": "https://newoteg.com",
                    "logo": "https://newoteg.com/logo.png",
                    "description": "Fournisseur de composants électroniques et équipements industriels au Cameroun",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "Campyabass (Camp Yabassi), Akwa",
                        "addressLocality": "Douala",
                        "addressCountry": "CM"
                    },
                    "contactPoint": {
                        "@type": "ContactPoint",
                        "telephone": "+237699966160",
                        "contactType": "customer service",
                        "availableLanguage": ["French", "English"]
                    }
                })}</script>
            </Helmet>
            <HeroBanner />
            <PartnerBrands />
            <Features />
            <CategoryGrid />
            <div className="home-page__divider"></div>
            <FeaturedProducts />
            <Newsletter />
            <Footer />
        </div>
    );
};

export default Home;
