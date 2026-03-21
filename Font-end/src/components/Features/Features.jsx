import { ShieldCheck, Truck, BadgePercent, LifeBuoy } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import './Features.scss';

const getFeatures = (t) => [
    {
        icon: ShieldCheck,
        title: t('features.qualityTitle'),
        description: t('features.qualityDesc')
    },
    {
        icon: BadgePercent,
        title: t('features.wholesaleTitle'),
        description: t('features.wholesaleDesc')
    },
    {
        icon: Truck,
        title: t('features.deliveryTitle'),
        description: t('features.deliveryDesc')
    },
    {
        icon: LifeBuoy,
        title: t('features.supportTitle'),
        description: t('features.supportDesc')
    }
];

const Features = () => {
    const { t } = useI18n();
    const features = getFeatures(t);

    return (
        <section className="features-section">
            <div className="container">
                <div className="features-grid">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <div key={index} className="feature-card">
                                <div className="feature-card__icon-wrapper">
                                    <Icon size={32} strokeWidth={1.5} />
                                </div>
                                <div className="feature-card__content">
                                    <h3 className="feature-card__title">{feature.title}</h3>
                                    <p className="feature-card__description">{feature.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Features;
