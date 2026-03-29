import './PlaceholderImage.scss';

const PlaceholderImage = ({ className = '' }) => (
    <div className={`placeholder-img ${className}`}>
        <div className="placeholder-img__glass">
            <img src="/logo.png" alt="" className="placeholder-img__logo" draggable="false" />
            <span className="placeholder-img__text">NEWOTEG</span>
        </div>
    </div>
);

export default PlaceholderImage;
