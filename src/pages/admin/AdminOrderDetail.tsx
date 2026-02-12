import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Truck,
  Clock,
  MessageSquare,
  Save,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminOrder,
  useUpdateOrderStatus,
  useUpdateOrderNotes,
  useUpdateTrackingCode,
} from "@/hooks/useAdmin";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { OrderStatus } from "@/types/database";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  paid: "Pago",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  returned: "Devolvido",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  preparing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800",
};

const allStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
};

const shippingLabels: Record<string, string> = {
  pac: "PAC",
  sedex: "SEDEX",
  free: "Frete Grátis",
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, error } = useAdminOrder(id);

  const updateStatus = useUpdateOrderStatus();
  const updateNotes = useUpdateOrderNotes();
  const updateTracking = useUpdateTrackingCode();

  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNote, setStatusNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);

  // Load notes when order loads
  if (order && !notesLoaded) {
    setAdminNotes(order.adminNotes ?? "");
    setTrackingCode(order.trackingCode ?? "");
    setNotesLoaded(true);
  }

  const handleStatusUpdate = async () => {
    if (!id || !newStatus) return;
    try {
      await updateStatus.mutateAsync({
        orderId: id,
        status: newStatus as OrderStatus,
        note: statusNote || undefined,
      });
      toast({ title: `Status atualizado para "${statusLabels[newStatus]}"` });
      setNewStatus("");
      setStatusNote("");
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      await updateNotes.mutateAsync({ orderId: id, notes: adminNotes });
      toast({ title: "Notas salvas" });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  const handleSaveTracking = async () => {
    if (!id) return;
    try {
      await updateTracking.mutateAsync({ orderId: id, trackingCode });
      toast({ title: "Código de rastreio salvo" });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-60" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button asChild className="mt-4">
          <Link to="/admin/pedidos">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/pedidos">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Pedido
            </h1>
            <button
              className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => copyToClipboard(order.id)}
            >
              {order.id.slice(0, 8)}...
              <Copy className="w-3 h-3" />
            </button>
            <Badge
              variant="secondary"
              className={statusColors[order.status] ?? ""}
            >
              {statusLabels[order.status] ?? order.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Itens do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tamanho: {item.size} • Qtd: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete ({shippingLabels[order.shippingMethod] ?? order.shippingMethod})</span>
                  <span>{order.shippingPrice === 0 ? "Grátis" : formatPrice(order.shippingPrice)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto</span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Shipping */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Cliente & Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{order.customerName}</p>
                <p className="text-muted-foreground">{order.customerEmail}</p>
                {order.customerPhone && (
                  <p className="text-muted-foreground">{order.customerPhone}</p>
                )}
                <Separator className="my-2" />
                <p>
                  <span className="text-muted-foreground">Método: </span>
                  {paymentLabels[order.paymentMethod] ?? order.paymentMethod}
                </p>
                {order.paymentId && (
                  <p className="text-xs text-muted-foreground">
                    ID: {order.paymentId}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{order.shippingAddress.name}</p>
                <p>
                  {order.shippingAddress.street}, {order.shippingAddress.number}
                  {order.shippingAddress.complement && ` - ${order.shippingAddress.complement}`}
                </p>
                <p>{order.shippingAddress.neighborhood}</p>
                <p>
                  {order.shippingAddress.city} - {order.shippingAddress.state}
                </p>
                <p className="text-muted-foreground">
                  CEP: {order.shippingAddress.cep}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tracking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Código de Rastreio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ex: BR123456789BR"
                />
                <Button
                  variant="outline"
                  onClick={handleSaveTracking}
                  disabled={updateTracking.isPending}
                >
                  {updateTracking.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Notas Internas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notas internas (não visíveis ao cliente)..."
                rows={3}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleSaveNotes}
                disabled={updateNotes.isPending}
              >
                {updateNotes.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar notas
              </Button>
              {order.customerNotes && (
                <div className="mt-3 p-3 bg-muted rounded-xl">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Nota do cliente:
                  </p>
                  <p className="text-sm">{order.customerNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          {/* Update Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Atualizar Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  {allStatuses
                    .filter((s) => s !== order.status)
                    .map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Nota (opcional)"
              />

              <Button
                className="w-full btn-primary"
                disabled={!newStatus || updateStatus.isPending}
                onClick={handleStatusUpdate}
              >
                {updateStatus.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Atualizar Status"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado</span>
                <span>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pago</span>
                  <span>{new Date(order.paidAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enviado</span>
                  <span>{new Date(order.shippedAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entregue</span>
                  <span>{new Date(order.deliveredAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {order.cancelledAt && (
                <div className="flex justify-between text-red-600">
                  <span>Cancelado</span>
                  <span>{new Date(order.cancelledAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {order.statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem histórico de alterações
                </p>
              ) : (
                <div className="space-y-4">
                  {order.statusHistory.map((entry, i) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                        </div>
                        {i < order.statusHistory.length - 1 && (
                          <div className="w-px h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">
                          {entry.oldStatus ? (
                            <>
                              {statusLabels[entry.oldStatus]} →{" "}
                              <span className="text-primary">
                                {statusLabels[entry.newStatus]}
                              </span>
                            </>
                          ) : (
                            <span className="text-primary">
                              {statusLabels[entry.newStatus]}
                            </span>
                          )}
                        </p>
                        {entry.note && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {entry.note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
