import { ShieldCheck, Truck, BadgePercent, LifeBuoy } from 'lucide-react';
import './Features.scss';

const features = [
    {
        icon: ShieldCheck,
        title: 'Authentic Quality',
        description: 'Directly sourced from trusted manufacturers like Adafruit, SparkFun, and Arduino.'
    },
    {
        icon: BadgePercent,
        title: 'Wholesale Pricing',
        description: 'Competitive B2B prices for high-volume orders and local technical resellers.'
    },
    {
        icon: Truck,
        title: 'Local Delivery',
        description: 'Fast and reliable delivery within Douala and same-day shipping across Cameroon.'
    },
    {
        icon: LifeBuoy,
        title: 'Technical Support',
        description: 'Expert advice to help you choose the right components for your complex projects.'
    }
];

const Features = () => {
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
