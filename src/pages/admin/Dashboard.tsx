import { motion } from "framer-motion";
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/useAdmin";
import { formatPrice } from "@/lib/utils";
import { Link } from "react-router-dom";

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

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  index,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Erro ao carregar dashboard. Verifique suas permissões.
        </p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Visão geral do seu negócio
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Produtos"
          value={String(stats.totalProducts)}
          icon={Package}
          description="Produtos cadastrados"
          index={0}
        />
        <StatCard
          title="Pedidos"
          value={String(stats.totalOrders)}
          icon={ShoppingCart}
          description={`${stats.pendingOrders} pendente(s)`}
          index={1}
        />
        <StatCard
          title="Receita Total"
          value={formatPrice(stats.totalRevenue)}
          icon={DollarSign}
          description="Pedidos pagos"
          index={2}
        />
        <StatCard
          title="Estoque Baixo"
          value={String(stats.lowStockCount)}
          icon={AlertTriangle}
          description="Itens com < 5 unidades"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Pedidos Recentes
                </CardTitle>
                <Link
                  to="/admin/pedidos"
                  className="text-sm text-primary hover:underline"
                >
                  Ver todos →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum pedido encontrado
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/admin/pedidos/${order.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatPrice(order.total)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={statusColors[order.status] ?? ""}
                        >
                          {statusLabels[order.status] ?? order.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Estoque Baixo
                </CardTitle>
                <Link
                  to="/admin/estoque"
                  className="text-sm text-primary hover:underline"
                >
                  Gerenciar →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.lowStockItems.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Todos os itens com estoque adequado!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.lowStockItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tamanho: {item.sizeLabel}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          item.stock === 0
                            ? "bg-red-100 text-red-800"
                            : "bg-orange-100 text-orange-800"
                        }
                      >
                        {item.stock === 0 ? "Esgotado" : `${item.stock} un.`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
