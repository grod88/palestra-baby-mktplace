import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Save,
  AlertTriangle,
  Package,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminProducts, useBatchUpdateStock } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";

interface StockEntry {
  sizeId: string;
  productName: string;
  sizeLabel: string;
  currentStock: number;
  newStock: number;
  productId: string;
}

export default function AdminStock() {
  const { data: products, isLoading, error } = useAdminProducts();
  const batchUpdate = useBatchUpdateStock();

  const [search, setSearch] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [changes, setChanges] = useState<Record<string, number>>({});

  const stockEntries = useMemo<StockEntry[]>(() => {
    if (!products) return [];
    const entries: StockEntry[] = [];
    for (const p of products) {
      if (!p.active) continue;
      for (const s of p.productSizes) {
        entries.push({
          sizeId: s.id,
          productName: p.name,
          sizeLabel: s.sizeLabel,
          currentStock: s.stock,
          newStock: changes[s.id] ?? s.stock,
          productId: p.id,
        });
      }
    }
    return entries;
  }, [products, changes]);

  const filteredEntries = useMemo(() => {
    return stockEntries.filter((e) => {
      const matchSearch =
        search === "" ||
        e.productName.toLowerCase().includes(search.toLowerCase());
      const matchLow = !showLowOnly || e.currentStock < 5;
      return matchSearch && matchLow;
    });
  }, [stockEntries, search, showLowOnly]);

  const hasChanges = Object.keys(changes).length > 0;

  const handleStockChange = (sizeId: string, value: number) => {
    const entry = stockEntries.find((e) => e.sizeId === sizeId);
    if (!entry) return;

    if (value === entry.currentStock) {
      const next = { ...changes };
      delete next[sizeId];
      setChanges(next);
    } else {
      setChanges({ ...changes, [sizeId]: value });
    }
  };

  const handleSave = async () => {
    const updates = Object.entries(changes).map(([sizeId, stock]) => ({
      sizeId,
      stock,
    }));

    try {
      await batchUpdate.mutateAsync(updates);
      toast({
        title: "Estoque atualizado!",
        description: `${updates.length} item(ns) atualizado(s).`,
      });
      setChanges({});
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao salvar",
        variant: "destructive",
      });
    }
  };

  const totalItems = stockEntries.reduce((sum, e) => sum + e.currentStock, 0);
  const lowStockCount = stockEntries.filter((e) => e.currentStock < 5).length;
  const outOfStockCount = stockEntries.filter((e) => e.currentStock === 0).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Erro ao carregar estoque.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Gestão de Estoque
          </h1>
          <p className="text-muted-foreground text-sm">
            Controle de estoque por produto e tamanho
          </p>
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            className="btn-primary"
            disabled={batchUpdate.isPending}
          >
            {batchUpdate.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar ({Object.keys(changes).length} alterações)
              </>
            )}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total em estoque</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer ${showLowOnly ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => setShowLowOnly(!showLowOnly)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
              <p className="text-xs text-muted-foreground">Estoque baixo (&lt;5)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
              <p className="text-xs text-muted-foreground">Esgotados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stock Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border rounded-xl overflow-hidden bg-card"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="w-24 text-center">Tamanho</TableHead>
              <TableHead className="w-32 text-center">Estoque Atual</TableHead>
              <TableHead className="w-32 text-center">Novo Estoque</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Nenhum item encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const changed = changes[entry.sizeId] !== undefined;
                return (
                  <TableRow
                    key={entry.sizeId}
                    className={changed ? "bg-primary/5" : ""}
                  >
                    <TableCell>
                      <p className="font-medium text-sm text-foreground">
                        {entry.productName}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{entry.sizeLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          entry.currentStock === 0
                            ? "text-red-600 font-bold"
                            : entry.currentStock < 5
                            ? "text-orange-600 font-medium"
                            : ""
                        }
                      >
                        {entry.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        className="w-20 mx-auto text-center"
                        value={entry.newStock}
                        onChange={(e) =>
                          handleStockChange(entry.sizeId, parseInt(e.target.value) || 0)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.currentStock === 0 ? (
                        <Badge variant="destructive">Esgotado</Badge>
                      ) : entry.currentStock < 5 ? (
                        <Badge className="bg-orange-100 text-orange-800">Baixo</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
