import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Ticket,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  useToggleCouponActive,
} from "@/hooks/useAdmin";
import { categoryLabels } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { CouponFormData, AdminCoupon } from "@/lib/admin-api";

const EMPTY_FORM: CouponFormData = {
  code: "",
  discountType: "percentage",
  discountValue: 10,
  minOrderValue: null,
  maxUses: null,
  category: null,
  startsAt: new Date().toISOString().slice(0, 16),
  expiresAt: null,
  active: true,
};

export default function AdminCoupons() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const toggleActive = useToggleCouponActive();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormData>({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);

  const openCreate = () => {
    setEditingCoupon(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (coupon: AdminCoupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      maxUses: coupon.maxUses,
      category: coupon.category,
      startsAt: coupon.startsAt.slice(0, 16),
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : null,
      active: coupon.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Informe o código do cupom.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingCoupon) {
        await updateCoupon.mutateAsync({ id: editingCoupon.id, form });
        toast({ title: "Cupom atualizado!" });
      } else {
        await createCoupon.mutateAsync(form);
        toast({ title: "Cupom criado!" });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao salvar cupom",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingCouponId) return;
    try {
      await deleteCoupon.mutateAsync(deletingCouponId);
      toast({ title: "Cupom excluído" });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao excluir",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setDeletingCouponId(null);
  };

  const handleToggle = async (coupon: AdminCoupon) => {
    try {
      await toggleActive.mutateAsync({ id: coupon.id, active: !coupon.active });
      toast({
        title: coupon.active ? "Cupom desativado" : "Cupom ativado",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  const formatDiscount = (coupon: AdminCoupon) => {
    if (coupon.discountType === "percentage") {
      return `${coupon.discountValue}%`;
    }
    return `R$ ${coupon.discountValue.toFixed(2)}`;
  };

  const isExpired = (coupon: AdminCoupon) => {
    if (!coupon.expiresAt) return false;
    return new Date(coupon.expiresAt) < new Date();
  };

  const isMaxedOut = (coupon: AdminCoupon) => {
    if (!coupon.maxUses) return false;
    return coupon.usedCount >= coupon.maxUses;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Ticket className="w-6 h-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Cupons de Desconto
          </h1>
          <Badge variant="secondary">{coupons?.length ?? 0}</Badge>
        </div>
        <Button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cupom
        </Button>
      </motion.div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Pedido mín.</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <p className="text-muted-foreground">
                      Nenhum cupom cadastrado.
                    </p>
                    <Button
                      variant="link"
                      onClick={openCreate}
                      className="mt-2"
                    >
                      Criar primeiro cupom
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {coupons?.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono font-semibold">
                      {coupon.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        coupon.discountType === "percentage"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {formatDiscount(coupon)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {coupon.minOrderValue
                      ? `R$ ${coupon.minOrderValue.toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isMaxedOut(coupon) ? "text-destructive font-semibold" : ""
                      }
                    >
                      {coupon.usedCount}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : " / ∞"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {coupon.category
                      ? (categoryLabels as Record<string, string>)[
                          coupon.category
                        ] ?? coupon.category
                      : "Todas"}
                  </TableCell>
                  <TableCell>
                    {!coupon.active ? (
                      <Badge variant="secondary">Inativo</Badge>
                    ) : isExpired(coupon) ? (
                      <Badge variant="destructive">Expirado</Badge>
                    ) : isMaxedOut(coupon) ? (
                      <Badge variant="destructive">Esgotado</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800">
                        Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggle(coupon)}
                        title={coupon.active ? "Desativar" : "Ativar"}
                      >
                        {coupon.active ? (
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(coupon)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingCouponId(coupon.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? "Altere os dados do cupom de desconto."
                : "Crie um novo cupom de desconto para seus clientes."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="PALMEIRAS10"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de desconto</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      discountType: v as "percentage" | "fixed",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {form.discountType === "percentage"
                    ? "Desconto (%)"
                    : "Desconto (R$)"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  step={form.discountType === "percentage" ? "1" : "0.01"}
                  min={0.01}
                  max={form.discountType === "percentage" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discountValue: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrderValue">
                  Pedido mínimo (R$)
                </Label>
                <Input
                  id="minOrderValue"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.minOrderValue ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      minOrderValue: e.target.value
                        ? Number.parseFloat(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Sem mínimo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">Máx. de usos</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={1}
                  value={form.maxUses ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxUses: e.target.value
                        ? Number.parseInt(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category ?? "all"}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      category: v === "all" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Início</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={form.startsAt.slice(0, 16)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      startsAt: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiração</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={form.expiresAt?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      expiresAt: e.target.value || null,
                    }))
                  }
                  placeholder="Sem expiração"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="couponActive">Ativo</Label>
              <Switch
                id="couponActive"
                checked={form.active}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, active: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cupom será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
