import './Newsletter.scss';

const Newsletter = () => {
    return (
        <section className="newsletter-section">
            <div className="container newsletter-section__inner">
                <div className="newsletter-section__content">
                    <h2 className="newsletter-section__title">Don't Miss the Next Flash Sale</h2>
                    <p className="newsletter-section__desc">
                        Subscribe to our newsletter and get 15% off your first purchase plus exclusive access to early deals.
                    </p>
                    <form className="newsletter-section__form" onSubmit={(e) => e.preventDefault()}>
                        <div className="newsletter-section__input-group">
                            <input
                                type="email"
                                placeholder="Your email address"
                                className="newsletter-section__input"
                                required
                            />
                            <button type="submit" className="newsletter-section__btn">
                                Join Now
                            </button>
                        </div>
                    </form>
                    <p className="newsletter-section__legal">
                        By subscribing you agree to our Terms & Conditions and Privacy Policy.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
