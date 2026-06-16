import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Filter, X } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { productTypes, materials } from '@/data/products';
import { api, API_URL } from '@/lib/api';
import { toast } from 'sonner';

// Define the shape of data coming from Python
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

// FIXED: Define strict types to match ProductCard expectations
export interface Product {
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

const priceRanges = [
  { label: 'Under ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 - ₹3,000', min: 1000, max: 3000 },
  { label: '₹3,000 - ₹5,000', min: 3000, max: 5000 },
  { label: 'Above ₹5,000', min: 5000, max: Infinity },
];

// Constants for category filter
const CATEGORIES = ['men', 'women', 'children'] as const;

// Helper to determine category from backend category string
const mapCategory = (backendCategory?: string): 'men' | 'women' | 'children' => {
  if (!backendCategory) return 'men';
  const lower = backendCategory.toLowerCase();
  if (lower.includes('women') || lower.includes('woman')) return 'women';
  if (lower.includes('kid') || lower.includes('child')) return 'children';
  return 'men';
};

// Helper to determine type from backend category string
const mapType = (backendCategory?: string): 'shirts' | 'pants' | 'kurtas' | 'dresses' | 'jackets' => {
  if (!backendCategory) return 'shirts';
  const lower = backendCategory.toLowerCase();
  if (lower.includes('kurta') || lower.includes('ethnic')) return 'kurtas';
  if (lower.includes('dress') || lower.includes('gown')) return 'dresses';
  if (lower.includes('jacket') || lower.includes('coat')) return 'jackets';
  if (lower.includes('pant') || lower.includes('trouser')) return 'pants';
  return 'shirts';
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch from Backend
  useEffect(() => {
    let isMounted = true;
    
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<BackendProduct[]>('/orders/products');
        
        if (!isMounted) return;
        
        if (!res.data || !Array.isArray(res.data)) {
          throw new Error('Invalid response format');
        }
        
        // Map backend data to frontend UI structure
        const mappedProducts: Product[] = res.data.map((p) => {
          // Helper to make image URL absolute
          const makeAbsolute = (imgPath: string) => {
            if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
              return imgPath;
            }
            return `${API_URL}${imgPath.startsWith('/') ? imgPath : '/' + imgPath}`;
          };

          // Parse images from comma-separated string or use image_url
          let imageList: string[] = [];
          if (p.images) {
            imageList = p.images.split(',').map(img => makeAbsolute(img.trim())).filter(Boolean);
          } else if (p.image_url) {
            imageList = [makeAbsolute(p.image_url)];
          }
          
          // Fallback to placeholder if no images
          if (imageList.length === 0) {
            imageList = [`https://placehold.co/600x800/e2e8f0/1e293b?text=${encodeURIComponent(p.name)}`];
          }
          
          return {
            id: p.id.toString(),
            name: p.name,
            description: p.description || 'Premium quality apparel designed for comfort and style.',
            price: p.price,
            tax: p.price * 0.18, 
            stock: p.current_stock,
            images: imageList,
            category: mapCategory(p.category),
            type: mapType(p.category),
            material: 'cotton' as const,
            colors: ['White', 'Blue', 'Black'],
            sizes: ['S', 'M', 'L', 'XL'],
            featured: p.id % 2 === 0,
            published: true
          };
        });

        setProducts(mappedProducts);
      } catch (err) {
        console.error("Failed to fetch products", err);
        if (isMounted) {
          setError("Could not load products from server");
          toast.error("Could not load products from server");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const categoryParam = searchParams.get('category');
  const typeParam = searchParams.get('type');
  const materialParam = searchParams.get('material');
  const priceParam = searchParams.get('price');

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (!product.published) return false;
      if (categoryParam && product.category !== categoryParam) return false;
      if (typeParam && product.type !== typeParam) return false;
      if (materialParam && product.material !== materialParam) return false;
      if (priceParam) {
        const range = priceRanges.find(r => r.label === priceParam);
        if (range && (product.price < range.min || product.price > range.max)) return false;
      }
      return true;
    });
  }, [products, categoryParam, typeParam, materialParam, priceParam]);

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = categoryParam || typeParam || materialParam || priceParam;

  return (
    <>
      <Helmet>
        <title>Shop All Products | ApparelDesk</title>
      </Helmet>
      <Layout>
        <div className="bg-muted/30 py-8 lg:py-12">
          <div className="container mx-auto px-4 lg:px-8">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
              {categoryParam ? `${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)}'s Collection` : 'All Products'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {loading ? 'Loading...' : `${filteredProducts.length} products found`}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className={`lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-card rounded-lg p-6 shadow-soft sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-lg font-semibold">Filters</h2>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <h3 className="font-medium text-sm text-foreground mb-3">Category</h3>
                  <div className="space-y-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => updateFilter('category', categoryParam === cat ? null : cat)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors capitalize ${
                          categoryParam === cat
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div className="mb-6">
                  <h3 className="font-medium text-sm text-foreground mb-3">Type</h3>
                  <div className="space-y-2">
                    {productTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => updateFilter('type', typeParam === type ? null : type)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors capitalize ${
                          typeParam === type
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Material Filter */}
                <div className="mb-6">
                  <h3 className="font-medium text-sm text-foreground mb-3">Material</h3>
                  <div className="space-y-2">
                    {materials.map(material => (
                      <button
                        key={material}
                        onClick={() => updateFilter('material', materialParam === material ? null : material)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors capitalize ${
                          materialParam === material
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {material}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Filter */}
                <div>
                  <h3 className="font-medium text-sm text-foreground mb-3">Price</h3>
                  <div className="space-y-2">
                    {priceRanges.map(range => (
                      <button
                        key={range.label}
                        onClick={() => updateFilter('price', priceParam === range.label ? null : range.label)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          priceParam === range.label
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              <div className="lg:hidden mb-6 flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-1 gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {categoryParam && (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm capitalize">
                      {categoryParam}
                      <button onClick={() => updateFilter('category', null)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {typeParam && (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm capitalize">
                      {typeParam}
                      <button onClick={() => updateFilter('type', null)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {materialParam && (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm capitalize">
                      {materialParam}
                      <button onClick={() => updateFilter('material', null)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {priceParam && (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                      {priceParam}
                      <button onClick={() => updateFilter('price', null)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="h-[400px] bg-muted/50 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-destructive text-lg mb-4">{error}</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="animate-scale-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg mb-4">No products found</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Products;