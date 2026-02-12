/**
 * OrderConfirmation — Página pós-checkout.
 *
 * Exibe status do pedido, dados resumidos e QR code PIX (se aplicável).
 * Acessa query params: ?order_id=UUID&status=approved|pending|rejected
 */
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Copy,
  Home,
  ShoppingBag,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface OrderData {
  id: string;
  status: string;
  payment_method: string;
  subtotal: number;
  shipping_price: number;
  discount_amount: number;
  total: number;
  shipping_method: string;
  created_at: string;
  customer: {
    name: string;
    email: string;
  } | null;
  order_items: Array<{
    id: string;
    product_name: string;
    size: string;
    quantity: number;
    unit_price: number;
  }>;
}

const statusConfig = {
  approved: {
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    title: "Pedido Confirmado!",
    description: "Seu pagamento foi aprovado. Agora é só aguardar a entrega.",
  },
  paid: {
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    title: "Pagamento Recebido!",
    description: "Seu pagamento foi confirmado. Em breve enviaremos seu pedido.",
  },
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    title: "Aguardando Pagamento",
    description: "Seu pedido foi criado. Conclua o pagamento para confirmar.",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    title: "Pagamento Recusado",
    description:
      "Houve um problema com o pagamento. Tente novamente ou escolha outra forma.",
  },
} as const;

type StatusKey = keyof typeof statusConfig;

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const urlStatus = searchParams.get("status") as StatusKey | null;

  const {
    data: order,
    isLoading,
    error,
  } = useQuery<OrderData>({
    queryKey: ["order-confirmation", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("ID do pedido não informado");

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          payment_method,
          subtotal,
          shipping_price,
          discount_amount,
          total,
          shipping_method,
          created_at,
          customer:customers(name, email),
          order_items(id, product_name, size, quantity, unit_price)
        `
        )
        .eq("id", orderId)
        .single();

      if (error || !data) throw new Error("Pedido não encontrado");

      return data as unknown as OrderData;
    },
    enabled: !!orderId,
    refetchInterval: (query) => {
      // Poll every 5s while pending (waiting for webhook)
      const status = query.state.data?.status;
      return status === "pending" ? 5000 : false;
    },
  });

  // Determine which status to display
  const displayStatus: StatusKey =
    (order?.status as StatusKey) || urlStatus || "pending";
  const config = statusConfig[displayStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  // Notify on status change
  useEffect(() => {
    if (order?.status === "paid" || order?.status === "confirmed") {
      toast({
        title: "Pagamento confirmado! ✅",
        description: "Seu pedido está sendo preparado.",
      });
    }
  }, [order?.status]);

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      toast({ title: "ID copiado!", description: "ID do pedido copiado." });
    }
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container-custom text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">
              Nenhum pedido encontrado
            </h1>
            <p className="text-muted-foreground mb-6">
              Não foi possível localizar as informações do pedido.
            </p>
            <Button asChild>
              <Link to="/">Voltar ao Início</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container-custom max-w-2xl">
          {/* Status Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl p-8 text-center ${config.bg} border ${config.border} mb-8`}
          >
            <StatusIcon className={`w-16 h-16 mx-auto mb-4 ${config.color}`} />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              {config.title}
            </h1>
            <p className="text-muted-foreground">{config.description}</p>
          </motion.div>

          {/* Order ID */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-3xl p-6 shadow-card mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Número do Pedido
                </p>
                <p className="font-mono text-sm font-medium text-foreground mt-1">
                  {orderId}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyOrderId}
                title="Copiar ID"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Loading state */}
          {isLoading && (
            <div className="bg-card rounded-3xl p-6 shadow-card mb-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">
                Carregando detalhes do pedido...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-6 mb-6 text-center">
              <p className="text-red-600 text-sm">
                {error instanceof Error
                  ? error.message
                  : "Erro ao carregar pedido"}
              </p>
            </div>
          )}

          {/* Order Details */}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-3xl p-6 shadow-card mb-6"
            >
              <h2 className="font-display text-lg font-bold text-foreground mb-4">
                Itens do Pedido
              </h2>

              <div className="space-y-3 mb-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tam: {item.size} | Qtd: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {formatPrice(item.unit_price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span>
                    {order.shipping_price === 0
                      ? "Grátis"
                      : formatPrice(order.shipping_price)}
                  </span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto</span>
                    <span>-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-medium">Total</span>
                  <span className="font-display text-xl font-bold text-primary">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* PIX info — show when payment is PIX and pending */}
          {order?.payment_method === "pix" && displayStatus === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-3xl p-6 shadow-card mb-6 text-center"
            >
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                Pagamento via PIX
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Escaneie o QR Code ou copie o código para pagar.
                <br />O pagamento será confirmado automaticamente.
              </p>
              <div className="inline-flex items-center justify-center p-4 bg-white rounded-xl border">
                <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    QR Code gerado pelo Mercado Pago
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                ⏳ A página será atualizada automaticamente quando o pagamento for
                confirmado.
              </p>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button asChild variant="outline" className="flex-1 rounded-xl">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Link>
            </Button>
            <Button asChild className="flex-1 btn-primary">
              <Link to="/produtos">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Continuar Comprando
              </Link>
            </Button>
          </motion.div>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
