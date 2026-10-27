import { useI18n } from '../context/I18nContext';
import ProductCard from './ProductCard';
import ProductRail from './ProductRail';
import './merchandising.css';

export default function ProductCarousel({ products, label, arrival = false }) {
  const { lang } = useI18n();
  return <ProductRail label={label} trackClass="e-carousel-track">
    {products.map(product => <div className="e-carousel-item" key={product.id}>
      {arrival && product.arrivalDate && <p className="e-arrival-date"><time dateTime={product.arrivalDate}>
        {new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CM' : 'en-CM', { dateStyle: 'medium', timeZone: 'Africa/Douala' }).format(new Date(product.arrivalDate))}
      </time></p>}
      <ProductCard product={product} compare={false} imageSizes="(max-width: 760px) 45vw, (max-width: 1199px) 30vw, 260px" />
    </div>)}
  </ProductRail>;
}
