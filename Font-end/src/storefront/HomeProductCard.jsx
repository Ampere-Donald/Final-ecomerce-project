import ProductCard from "./ProductCard";
// Homepage uses the shared card without repeated comparison controls.
export default function HomeProductCard(props) {
  return <ProductCard {...props} compare={false} />;
}
