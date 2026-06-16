import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/products/ProductCard';
import { api, API_URL } from '@/lib/api';

interface BackendProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  current_stock: number;
  category?: string;
  image_url?: string;
  images?: string;
  version_id?: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  tax: number;
  category: 'men' | 'women' | 'children';
  type: 'shirts' | 'pants' | 'kurtas' | 'dresses' | 'jackets';
  material: 'cotton' | 'silk' | 'linen' | 'wool' | 'polyester';
  colors: string[];
  sizes: string[];
  stock: number;
  images: string[];
  featured: boolean;
  published: boolean;
}

const mapCategory = (backendCategory?: string): 'men' | 'women' | 'children' => {
  if (!backendCategory) return 'men';
  const lower = backendCategory.toLowerCase();
  if (lower.includes('women') || lower.includes('woman')) return 'women';
  if (lower.includes('kid') || lower.includes('child')) return 'children';
  return 'men';
};

const mapType = (backendCategory?: string): 'shirts' | 'pants' | 'kurtas' | 'dresses' | 'jackets' => {
  if (!backendCategory) return 'shirts';
  const lower = backendCategory.toLowerCase();
  if (lower.includes('kurta') || lower.includes('ethnic')) return 'kurtas';
  if (lower.includes('dress') || lower.includes('gown')) return 'dresses';
  if (lower.includes('jacket') || lower.includes('coat')) return 'jackets';
  if (lower.includes('pant') || lower.includes('trouser')) return 'pants';
  return 'shirts';
};

const FeaturedProducts = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get<BackendProduct[]>('/orders/products');
        const mappedProducts = res.data.map((p, index) => {
          const makeAbsolute = (imgPath: string) => {
            if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
              return imgPath;
            }
            return `${API_URL}${imgPath.startsWith('/') ? imgPath : '/' + imgPath}`;
          };

          let imageList: string[] = [];
          if (p.images) {
            imageList = p.images.split(',').map(img => makeAbsolute(img.trim())).filter(Boolean);
          } else if (p.image_url) {
            imageList = [makeAbsolute(p.image_url)];
          }
          
          if (imageList.length === 0) {
            imageList = [`https://placehold.co/600x800/e2e8f0/1e293b?text=${encodeURIComponent(p.name)}`];
          }

          return {
            id: p.id.toString(),
            name: p.name,
            description: p.description || 'Premium quality apparel',
            price: p.price,
            tax: p.price * 0.18,
            category: mapCategory(p.category),
            type: mapType(p.category),
            material: 'cotton' as const,
            colors: ['White', 'Blue', 'Black'],
            sizes: ['S', 'M', 'L', 'XL'],
            stock: p.current_stock,
            images: imageList,
            featured: index % 2 === 0,
            published: true
          };
        });

        setFeaturedProducts(mappedProducts.filter(p => p.featured).slice(0, 4));
      } catch (err) {
        console.error('Failed to fetch products', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    if (!isAutoPlaying || featuredProducts.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredProducts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, featuredProducts.length]);

  const goNext = () => {
    if (featuredProducts.length === 0) return;
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev + 1) % featuredProducts.length);
  };

  const goPrev = () => {
    if (featuredProducts.length === 0) return;
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
  };

  // Calculate position for each card (0 = front, 1 = right, 2 = back, 3 = left)
  const getCardStyle = (index: number) => {
    if (featuredProducts.length === 0) return {};
    const position = (index - activeIndex + featuredProducts.length) % featuredProducts.length;
    
    const styles: Record<number, React.CSSProperties> = {
      0: { // Front - center and largest
        transform: 'translateX(-50%) translateZ(200px) scale(1)',
        left: '50%',
        zIndex: 40,
        opacity: 1,
        filter: 'brightness(1)',
      },
      1: { // Right
        transform: 'translateX(20%) translateZ(0px) scale(0.8) rotateY(-15deg)',
        left: '50%',
        zIndex: 30,
        opacity: 0.8,
        filter: 'brightness(0.7)',
      },
      2: { // Back - behind center
        transform: 'translateX(-50%) translateZ(-200px) scale(0.6)',
        left: '50%',
        zIndex: 10,
        opacity: 0.5,
        filter: 'brightness(0.5)',
      },
      3: { // Left
        transform: 'translateX(-120%) translateZ(0px) scale(0.8) rotateY(15deg)',
        left: '50%',
        zIndex: 30,
        opacity: 0.8,
        filter: 'brightness(0.7)',
      },
    };

    return styles[position] || styles[2];
  };

  return (
    <section className="py-16 lg:py-24 bg-muted/50 overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Featured Products
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Handpicked favorites that define quality and style
            </p>
          </div>
          <Link to="/products">
            <Button variant="outline" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* 3D Carousel */}
        <div className="relative" style={{ perspective: '1200px' }}>
          {/* Carousel Container */}
          <div 
            className="relative h-[450px] md:h-[500px] mx-auto"
            style={{ transformStyle: 'preserve-3d' }}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse h-64 w-64 bg-muted rounded-lg"></div>
              </div>
            ) : (
              featuredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="absolute w-[280px] md:w-[320px] transition-all duration-700 ease-out cursor-pointer"
                  style={{
                    ...getCardStyle(index),
                    transformStyle: 'preserve-3d',
                  }}
                  onClick={() => {
                    const position = (index - activeIndex + featuredProducts.length) % featuredProducts.length;
                    if (position === 1) goNext();
                    else if (position === 3) goPrev();
                  }}
                >
                  <ProductCard product={product} />
                </div>
              ))
            )}
          </div>

          {!loading && featuredProducts.length > 0 && (
            <>
              {/* Navigation Buttons */}
              <button
                onClick={goPrev}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 bg-background/90 backdrop-blur-sm border border-border rounded-full p-3 shadow-lg hover:bg-background hover:scale-110 transition-all"
                aria-label="Previous product"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 bg-background/90 backdrop-blur-sm border border-border rounded-full p-3 shadow-lg hover:bg-background hover:scale-110 transition-all"
                aria-label="Next product"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-8">
                {featuredProducts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setActiveIndex(index);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      index === activeIndex 
                        ? 'bg-primary w-8' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to product ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
