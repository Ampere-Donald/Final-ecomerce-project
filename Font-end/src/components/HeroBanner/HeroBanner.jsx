import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './HeroBanner.scss';

const heroSlides = [
    {
        id: 1,
        image: '/images/hero_1.png',
        badge: 'NEW GENERATION TECH',
        title: 'Scalable Enterprise\nSolutions',
        subtitle: 'From high-precision microcontrollers to industrial-grade server racks. Powering the future of African industry.',
        primaryAction: { label: 'Explore Infrastructure', link: '/catalogue' },
        secondaryAction: { label: 'Component Catalog', link: '/about' }
    },
    {
        id: 2,
        image: '/images/hero_2.png',
        badge: 'PREMIUM COMPONENTS',
        title: 'Industrial Grade\nElectronics',
        subtitle: 'High-end capacitors, resistors, and transistors for your most demanding projects.',
        primaryAction: { label: 'Shop Components', link: '/catalogue?category=components' },
        secondaryAction: { label: 'View Specifications', link: '/product/101001' }
    },
    {
        id: 3,
        image: '/images/hero_4.png',
        badge: 'ADVANCED MICROCHIPS',
        title: 'Next-Gen\nProcessing Power',
        subtitle: 'Ultra-detailed modern processors. Experience the pinnacle of performance and reliability.',
        primaryAction: { label: 'Discover Processors', link: '/catalogue?category=microchips' },
        secondaryAction: { label: 'Learn More', link: '/about' }
    },
    {
        id: 4,
        image: '/images/hero_3.png',
        badge: 'AUTOMATION SYSTEMS',
        title: 'Industrial Automation &\nRobotics',
        subtitle: 'Precision electronic manufacturing tools and robotic arms for modern laboratories and factories.',
        primaryAction: { label: 'View Automation', link: '/catalogue?category=automation' },
        secondaryAction: { label: 'Our Technologies', link: '/about' }
    },
    {
        id: 5,
        image: '/images/hero-tech.png',
        badge: 'FAST DELIVERY',
        title: 'Express Logistics &\nFulfillment',
        subtitle: 'Our modern tech logistics guarantee stock availability and rapid delivery anywhere in Africa.',
        primaryAction: { label: 'Track Order', link: '/checkout' },
        secondaryAction: { label: 'Contact Us', link: '/about' }
    }
];

const HeroBanner = () => {
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

    return (
        <section className="hero-banner">
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
