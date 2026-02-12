import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Heart, 
  Minus, 
  Plus, 
  ChevronLeft,
  MessageCircle,
  Truck,
  Shield,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useProduct } from '@/hooks/useSupabase';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-custom">
          <Skeleton className="h-4 w-40 mb-6" />
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <Skeleton className="aspect-square rounded-3xl" />
            <div className="space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Produto() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, error } = useProduct(slug);
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return <ProductSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            Produto não encontrado
          </h1>
          <Button asChild>
            <Link to="/produtos">Ver todos os produtos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast({
        title: 'Selecione um tamanho',
        description: 'Por favor, escolha o tamanho antes de adicionar ao carrinho.',
        variant: 'destructive'
      });
      return;
    }
    addItem(product, selectedSize, quantity);
    toast({
      title: 'Produto adicionado!',
      description: `${product.name} foi adicionado ao carrinho.`
    });
  };

  const handleBuyWhatsApp = () => {
    if (!selectedSize) {
      toast({
        title: 'Selecione um tamanho',
        description: 'Por favor, escolha o tamanho antes de comprar.',
        variant: 'destructive'
      });
      return;
    }
    const message = encodeURIComponent(
      `Olá! Gostaria de comprar:\n\n` +
      `📦 ${product.name}\n` +
      `📏 Tamanho: ${selectedSize}\n` +
      `🔢 Quantidade: ${quantity}\n` +
      `💰 Valor: ${formatPrice(product.price * quantity)}`
    );
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
  };

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />

      <main className="pt-24 pb-16">
        <div className="container-custom">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Link
              to="/produtos"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar para produtos
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div className="aspect-square bg-card rounded-3xl overflow-hidden shadow-card">
                <img
                  src={product.images[activeImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-3">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImage(index)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                        activeImage === index
                          ? 'border-primary'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Title & Price */}
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {product.name}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-bold text-primary">
                    {formatPrice(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.originalPrice!)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  ou 3x de {formatPrice(product.price / 3)} sem juros
                </p>
              </div>

              {/* Short Description */}
              <p className="text-muted-foreground">
                {product.description}
              </p>

              {/* Size Selector */}
              <div>
                <h3 className="font-medium text-foreground mb-3">Tamanho</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <Button
                      key={size}
                      variant={selectedSize === size ? 'default' : 'outline'}
                      className={`rounded-xl min-w-[60px] ${
                        selectedSize === size ? 'btn-primary' : ''
                      }`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <h3 className="font-medium text-foreground mb-3">Quantidade</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-l-xl"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-r-xl"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1 btn-primary h-14"
                  onClick={handleAddToCart}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl"
                  onClick={() => {}}
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Favoritar
                </Button>
              </div>

              <Button
                size="lg"
                className="w-full btn-whatsapp h-14"
                onClick={handleBuyWhatsApp}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Comprar pelo WhatsApp
              </Button>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <Truck className="w-6 h-6 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">Frete Grátis</p>
                  <p className="text-xs text-muted-foreground">acima de R$150</p>
                </div>
                <div className="text-center">
                  <Shield className="w-6 h-6 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">Compra</p>
                  <p className="text-xs text-muted-foreground">Segura</p>
                </div>
                <div className="text-center">
                  <RefreshCw className="w-6 h-6 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">Troca em</p>
                  <p className="text-xs text-muted-foreground">30 dias</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Product Details Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12"
          >
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full justify-start bg-card rounded-2xl p-1 h-auto flex-wrap">
                <TabsTrigger value="description" className="rounded-xl">
                  Descrição
                </TabsTrigger>
                <TabsTrigger value="measurements" className="rounded-xl">
                  Medidas
                </TabsTrigger>
                <TabsTrigger value="care" className="rounded-xl">
                  Cuidados
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 bg-card rounded-3xl p-6 shadow-card">
                <TabsContent value="description" className="mt-0">
                  <p className="text-foreground leading-relaxed">
                    {product.description}
                  </p>
                </TabsContent>

                <TabsContent value="measurements" className="mt-0">
                  <div className="space-y-3">
                    {Object.entries(product.measurements).map(([size, measure]) => (
                      <div
                        key={size}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <span className="font-medium text-foreground">{size}</span>
                        <span className="text-muted-foreground">{measure}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="care" className="mt-0">
                  <ul className="space-y-2">
                    {product.careInstructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-foreground"
                      >
                        <span className="text-primary">•</span>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
