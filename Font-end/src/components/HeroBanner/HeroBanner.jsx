import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import useSwipe from '../../hooks/useSwipe';
import './HeroBanner.scss';

const getHeroSlides = (t) => [
    {
        id: 1,
        image: '/images/hero_1.png',
        badge: t('hero.slide1.badge'),
        title: t('hero.slide1.title'),
        subtitle: t('hero.slide1.subtitle'),
        primaryAction: { label: t('hero.slide1.primaryAction'), link: '/catalogue' },
        secondaryAction: { label: t('hero.slide1.secondaryAction'), link: '/about' }
    },
    {
        id: 2,
        image: '/images/hero_2.png',
        badge: t('hero.slide2.badge'),
        title: t('hero.slide2.title'),
        subtitle: t('hero.slide2.subtitle'),
        primaryAction: { label: t('hero.slide2.primaryAction'), link: '/catalogue?category=components' },
        secondaryAction: { label: t('hero.slide2.secondaryAction'), link: '/product/101001' }
    },
    {
        id: 3,
        image: '/images/hero_4.png',
        badge: t('hero.slide3.badge'),
        title: t('hero.slide3.title'),
        subtitle: t('hero.slide3.subtitle'),
        primaryAction: { label: t('hero.slide3.primaryAction'), link: '/catalogue?category=microchips' },
        secondaryAction: { label: t('hero.slide3.secondaryAction'), link: '/about' }
    },
    {
        id: 4,
        image: '/images/hero_3.png',
        badge: t('hero.slide4.badge'),
        title: t('hero.slide4.title'),
        subtitle: t('hero.slide4.subtitle'),
        primaryAction: { label: t('hero.slide4.primaryAction'), link: '/catalogue?category=automation' },
        secondaryAction: { label: t('hero.slide4.secondaryAction'), link: '/about' }
    },
    {
        id: 5,
        image: '/images/hero-tech.png',
        badge: t('hero.slide5.badge'),
        title: t('hero.slide5.title'),
        subtitle: t('hero.slide5.subtitle'),
        primaryAction: { label: t('hero.slide5.primaryAction'), link: '/checkout' },
        secondaryAction: { label: t('hero.slide5.secondaryAction'), link: '/about' }
    }
];

const HeroBanner = () => {
    const { t } = useI18n();
    const heroSlides = getHeroSlides(t);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto-advance
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        }, 5000); // 5 seconds per slide
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
    };

    const goToSlide = (index) => {
        setCurrentSlide(index);
    };

    const swipeHandlers = useSwipe(nextSlide, prevSlide);

    return (
        <section className="hero-banner" {...swipeHandlers} style={{ touchAction: 'pan-y' }}>
            {/* Slides container */}
            {heroSlides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`hero-banner__slide ${index === currentSlide ? 'hero-banner__slide--active' : ''}`}
                    style={{ backgroundImage: `url('${slide.image}')` }}
                >
                    <div className="hero-banner__overlay"></div>

                    <div className="hero-banner__content container">
                        <div className="hero-banner__text-block">
                            <div className={`hero-banner__badge ${index === currentSlide ? 'animate-up-1' : ''}`}>
                                {slide.badge}
                            </div>

                            <h1 className={`hero-banner__title ${index === currentSlide ? 'animate-up-2' : ''}`}>
                                {slide.title.split('\n').map((line, i) => (
                                    <span key={i}>
                                        {line}
                                        {i === 0 && <br />}
                                    </span>
                                ))}
                            </h1>

                            <p className={`hero-banner__subtitle ${index === currentSlide ? 'animate-up-3' : ''}`}>
                                {slide.subtitle}
                            </p>

                            <div className={`hero-banner__actions ${index === currentSlide ? 'animate-up-4' : ''}`}>
                                <Link to={slide.primaryAction.link} className="hero-banner__button hero-banner__button--primary">
                                    {slide.primaryAction.label}
                                </Link>
                                <Link to={slide.secondaryAction.link} className="hero-banner__button hero-banner__button--secondary">
                                    {slide.secondaryAction.label}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Navigation Arrows */}
            <button className="hero-banner__nav-btn hero-banner__nav-btn--prev" onClick={prevSlide} aria-label="Previous Slide">
                <ChevronLeft size={24} />
            </button>
            <button className="hero-banner__nav-btn hero-banner__nav-btn--next" onClick={nextSlide} aria-label="Next Slide">
                <ChevronRight size={24} />
            </button>

            {/* Pagination Dots */}
            <div className="hero-banner__dots">
                {heroSlides.map((_, index) => (
                    <button
                        key={index}
                        className={`hero-banner__dot ${index === currentSlide ? 'hero-banner__dot--active' : ''}`}
                        onClick={() => goToSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default HeroBanner;
