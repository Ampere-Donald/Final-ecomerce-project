import { useContext, useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import { InitialResourceContext } from './initialResourceContext';

export default function CatalogueGrid({ products, list }) {
  const initial = useContext(InitialResourceContext);
  const [complete, setComplete] = useState(() => Boolean(initial) || typeof window === 'undefined' ||
    typeof requestAnimationFrame !== 'function');
  const [firstBatch] = useState(() => typeof window === 'undefined' ? 24 :
    window.innerWidth <= 760 ? 4 : window.innerWidth <= 1100 ? 6 : 8);
  useEffect(() => {
    if (complete || products.length <= firstBatch) return;
    // Paint the first two rows before constructing the rest of this same page.
    // No pagination change, visibility observer or network dependency: every
    // product follows on the next frame. Existing server HTML stays complete.
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setComplete(true));
    });
    return () => {
      cancelAnimationFrame(first);
      if (second !== undefined) cancelAnimationFrame(second);
    };
  }, [complete, firstBatch, products.length]);
  return <div className={`e-product-grid e-catalog-grid ${list ? 'e-list' : ''}`}>
    {(complete ? products : products.slice(0, firstBatch)).map((product, index) =>
      <ProductCard eager={index === 0} key={product.id} product={product} />)}
  </div>;
}
