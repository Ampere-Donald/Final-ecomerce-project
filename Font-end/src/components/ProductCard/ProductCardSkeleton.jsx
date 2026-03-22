import './ProductCardSkeleton.scss';

const ProductCardSkeleton = () => (
  <div className="product-skeleton">
    <div className="product-skeleton__image" />
    <div className="product-skeleton__body">
      <div className="product-skeleton__line product-skeleton__line--xs" />
      <div className="product-skeleton__line product-skeleton__line--lg" />
      <div className="product-skeleton__line product-skeleton__line--md" />
      <div className="product-skeleton__line product-skeleton__line--sm" />
      <div className="product-skeleton__btn" />
    </div>
  </div>
);

const ProductCardSkeletonGrid = ({ count = 8 }) => (
  <div className="catalogue-grid">
    {Array.from({ length: count }, (_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export { ProductCardSkeleton, ProductCardSkeletonGrid };
export default ProductCardSkeleton;
