import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Minus, Plus, ShoppingBag, ArrowLeft, Check } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { api, API_URL } from '@/lib/api';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface BackendProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  current_stock: number;
  category?: string;
  image_url?: string;
  images?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  tax: number;
  category: 'men' | 'women' | 'children';
  type: string;
  material: string;
  colors: string[];
  sizes: string[];
  stock: number;
  images: string[];
  featured: boolean;
  published: boolean;
}

// Helper to determine category from backend category string
const mapCategory = (backendCategory?: string): 'men' | 'women' | 'children' => {
  if (!backendCategory) return 'men';
  const lower = backendCategory.toLowerCase();
  if (lower.includes('women') || lower.includes('woman')) return 'women';
  if (lower.includes('kid') || lower.includes('child')) return 'children';
  return 'men';
};

// Helper to determine type from backend category string
const mapType = (backendCategory?: string): string => {
  if (!backendCategory) return 'shirts';
  const lower = backendCategory.toLowerCase();
  if (lower.includes('kurta') || lower.includes('ethnic')) return 'kurtas';
  if (lower.includes('dress') || lower.includes('gown')) return 'dresses';
  if (lower.includes('jacket') || lower.includes('coat')) return 'jackets';
  if (lower.includes('pant') || lower.includes('trouser')) return 'pants';
  return 'shirts';
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let isMounted = true;
    
    const fetchProduct = async () => {
      try {
        const res = await api.get<BackendProduct[]>('/orders/products');
        
        if (!isMounted) return;
        
        const backendProduct = res.data.find(p => p.id.toString() === id);
        
        if (backendProduct) {
          // Helper to make image URL absolute
          const makeAbsolute = (imgPath: string) => {
            if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
              return imgPath;
            }
            return `${API_URL}${imgPath.startsWith('/') ? imgPath : '/' + imgPath}`;
          };

          // Parse images from comma-separated string or use image_url
          let imageList: string[] = [];
          if (backendProduct.images) {
            imageList = backendProduct.images.split(',').map(img => makeAbsolute(img.trim())).filter(Boolean);
          } else if (backendProduct.image_url) {
            imageList = [makeAbsolute(backendProduct.image_url)];
          }
          
          // Fallback to placeholders if no images
          if (imageList.length === 0) {
            const baseImage = `https://placehold.co/600x800/e2e8f0/1e293b?text=${encodeURIComponent(backendProduct.name)}`;
            imageList = [
              baseImage,
              `https://placehold.co/600x800/d1d5db/374151?text=${encodeURIComponent(backendProduct.name + ' - Side')}`,
              `https://placehold.co/600x800/c7d2fe/4338ca?text=${encodeURIComponent(backendProduct.name + ' - Back')}`,
            ];
          }
          
          const MATERIALS = ['cotton', 'silk', 'linen', 'wool', 'polyester'];
          
          const mappedProduct: Product = {
            id: backendProduct.id.toString(),
            name: backendProduct.name,
            description: backendProduct.description || 'Premium quality apparel designed for comfort and style. Made with carefully selected materials for durability and a perfect fit.',
            price: backendProduct.price,
            tax: Math.round(backendProduct.price * 0.18),
            stock: backendProduct.current_stock,
            images: imageList,
            category: mapCategory(backendProduct.category),
            type: mapType(backendProduct.category),
            material: MATERIALS[backendProduct.id % 5],
            colors: ['White', 'Blue', 'Black', 'Beige'],
            sizes: ['S', 'M', 'L', 'XL', 'XXL'],
            featured: backendProduct.id % 2 === 0,
            published: true,
          };
          
          setProduct(mappedProduct);
          setSelectedSize(mappedProduct.sizes[0]);
          setSelectedColor(mappedProduct.colors[0]);
        }
      } catch (error) {
        console.error('Failed to fetch product', error);
        toast.error('Could not load product details');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();
    
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mx-auto mb-4"></div>
            <div className="h-4 w-32 bg-muted rounded mx-auto"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/products">
            <Button variant="outline">Back to Products</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-${selectedSize}-${selectedColor}`,
      name: product.name,
      price: product.price,
      tax: product.tax,
      quantity,
      image: product.images[0],
      size: selectedSize,
      color: selectedColor,
    });
    toast.success(`${product.name} added to cart`);
  };

  const getColorHex = (color: string) => {
    const colorMap: Record<string, string> = {
      white: '#ffffff',
      black: '#1a1a1a',
      blue: '#3b82f6',
      beige: '#d4b896',
      maroon: '#800000',
      navy: '#000080',
      gold: '#ffd700',
      blush: '#de5d83',
      sage: '#9dc183',
      khaki: '#c3b091',
      olive: '#808000',
      charcoal: '#36454f',
      brown: '#8b4513',
      red: '#dc2626',
      green: '#16a34a',
      purple: '#9333ea',
      yellow: '#eab308',
    };
    return colorMap[color.toLowerCase()] || '#888888';
  };

  return (
    <>
      <Helmet>
        <title>{product.name} | ApparelDesk</title>
        <meta name="description" content={product.description} />
      </Helmet>
      <Layout>
        <div className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
          {/* Breadcrumb */}
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Images Carousel */}
            <div className="space-y-4">
              {/* Main Carousel */}
              <Carousel className="w-full">
                <CarouselContent>
                  {product.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square bg-muted rounded-xl overflow-hidden">
                        <img
                          src={image}
                          alt={`${product.name} - View ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>

              {/* Thumbnail Navigation */}
              <div className="flex gap-3 justify-center">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="lg:py-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded capitalize">
                  {product.category}
                </span>
                <span className="text-muted-foreground text-sm capitalize">
                  {product.type}
                </span>
              </div>

              <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
                {product.name}
              </h1>

              <p className="text-muted-foreground leading-relaxed mb-6">
                {product.description}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-3xl font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                <span className="text-muted-foreground">
                  + {formatPrice(product.tax)} tax
                </span>
              </div>

              {/* Color Selection */}
              <div className="mb-6">
                <h3 className="font-medium text-sm text-foreground mb-3">
                  Color: <span className="text-muted-foreground">{selectedColor}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                        selectedColor === color
                          ? 'border-primary scale-110'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: getColorHex(color) }}
                      title={color}
                    >
                      {selectedColor === color && (
                        <Check
                          className={`h-4 w-4 ${
                            color.toLowerCase() === 'white' || color.toLowerCase() === 'yellow' || color.toLowerCase() === 'beige' || color.toLowerCase() === 'gold'
                              ? 'text-foreground'
                              : 'text-primary-foreground'
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div className="mb-6">
                <h3 className="font-medium text-sm text-foreground mb-3">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[3rem] px-4 py-2 rounded-md border text-sm font-medium transition-all ${
                        selectedSize === size
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-8">
                <h3 className="font-medium text-sm text-foreground mb-3">Quantity</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border rounded-md">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-muted transition-colors"
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 font-medium min-w-[3rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 hover:bg-muted transition-colors"
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.stock} in stock
                  </span>
                </div>
              </div>

              {/* Add to Cart */}
              <Button
                variant="hero"
                size="xl"
                className="w-full gap-2"
                onClick={handleAddToCart}
              >
                <ShoppingBag className="h-5 w-5" />
                Add to Cart - {formatPrice((product.price + product.tax) * quantity)}
              </Button>

              {/* Product Info */}
              <div className="mt-8 pt-8 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Material</span>
                    <p className="font-medium capitalize">{product.material}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category</span>
                    <p className="font-medium capitalize">{product.category}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default ProductDetail;
