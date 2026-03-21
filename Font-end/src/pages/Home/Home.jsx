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
