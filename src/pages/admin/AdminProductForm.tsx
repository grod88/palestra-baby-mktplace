import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  ImagePlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminProduct,
  useCreateProduct,
  useUpdateProduct,
  useAddProductSize,
  useDeleteProductSize,
  useUpdateStock,
  useAddProductImage,
  useDeleteProductImage,
} from "@/hooks/useAdmin";
import { categoryLabels } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { ProductFormData } from "@/lib/admin-api";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== "novo";
  const navigate = useNavigate();

  const { data: existingProduct, isLoading: loadingProduct } = useAdminProduct(
    isEditing ? id : undefined
  );

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const addSize = useAddProductSize();
  const deleteSize = useDeleteProductSize();
  const updateStock = useUpdateStock();
  const addImage = useAddProductImage();
  const deleteImage = useDeleteProductImage();

  // Form state
  const [form, setForm] = useState<ProductFormData>({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    category: "bodies",
    price: 0,
    originalPrice: null,
    featured: false,
    active: true,
    careInstructions: [],
    measurements: {},
    weightKg: 0.3,
    heightCm: 5,
    widthCm: 20,
    lengthCm: 25,
  });

  const [newCareInstruction, setNewCareInstruction] = useState("");
  const [newMeasureSize, setNewMeasureSize] = useState("");
  const [newMeasureValue, setNewMeasureValue] = useState("");
  const [newSizeLabel, setNewSizeLabel] = useState("");
  const [newSizeStock, setNewSizeStock] = useState(0);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!isEditing);

  // Populate form when editing
  useEffect(() => {
    if (existingProduct && isEditing) {
      setForm({
        name: existingProduct.name,
        slug: existingProduct.slug,
        description: existingProduct.description,
        shortDescription: existingProduct.shortDescription,
        category: existingProduct.category,
        price: existingProduct.price,
        originalPrice: existingProduct.originalPrice ?? null,
        featured: existingProduct.featured,
        active: existingProduct.active,
        careInstructions: existingProduct.careInstructions,
        measurements: existingProduct.measurements,
        weightKg: existingProduct.weightKg ?? 0.3,
        heightCm: existingProduct.heightCm ?? 5,
        widthCm: existingProduct.widthCm ?? 20,
        lengthCm: existingProduct.lengthCm ?? 25,
      });
      setAutoSlug(false);
    }
  }, [existingProduct, isEditing]);

  const updateField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && autoSlug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e slug são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await updateProduct.mutateAsync({ id, form });
        toast({ title: "Produto atualizado!" });
      } else {
        const created = await createProduct.mutateAsync(form);
        toast({ title: "Produto criado!" });
        navigate(`/admin/produtos/${created.id}`, { replace: true });
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao salvar",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleAddCareInstruction = () => {
    if (!newCareInstruction.trim()) return;
    updateField("careInstructions", [...form.careInstructions, newCareInstruction.trim()]);
    setNewCareInstruction("");
  };

  const handleRemoveCareInstruction = (index: number) => {
    updateField(
      "careInstructions",
      form.careInstructions.filter((_, i) => i !== index)
    );
  };

  const handleAddMeasurement = () => {
    if (!newMeasureSize.trim() || !newMeasureValue.trim()) return;
    updateField("measurements", {
      ...form.measurements,
      [newMeasureSize.trim()]: newMeasureValue.trim(),
    });
    setNewMeasureSize("");
    setNewMeasureValue("");
  };

  const handleRemoveMeasurement = (key: string) => {
    const next = { ...form.measurements };
    delete next[key];
    updateField("measurements", next);
  };

  const handleAddSize = async () => {
    if (!isEditing || !newSizeLabel.trim()) return;
    try {
      await addSize.mutateAsync({
        productId: id!,
        sizeLabel: newSizeLabel.trim(),
        stock: newSizeStock,
      });
      toast({ title: `Tamanho ${newSizeLabel} adicionado` });
      setNewSizeLabel("");
      setNewSizeStock(0);
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSize = async (sizeId: string) => {
    try {
      await deleteSize.mutateAsync(sizeId);
      toast({ title: "Tamanho removido" });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStock = async (sizeId: string, stock: number) => {
    try {
      await updateStock.mutateAsync({ sizeId, stock });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  const handleAddImage = async () => {
    if (!isEditing || !newImageUrl.trim()) return;
    const position = existingProduct?.productImages.length ?? 0;
    try {
      await addImage.mutateAsync({
        productId: id!,
        url: newImageUrl.trim(),
        altText: newImageAlt.trim(),
        position,
      });
      toast({ title: "Imagem adicionada" });
      setNewImageUrl("");
      setNewImageAlt("");
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteImage.mutateAsync(imageId);
      toast({ title: "Imagem removida" });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro",
        variant: "destructive",
      });
    }
  };

  if (isEditing && loadingProduct) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/produtos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {isEditing ? "Editar Produto" : "Novo Produto"}
            </h1>
            {isEditing && (
              <p className="text-sm text-muted-foreground">{existingProduct?.slug}</p>
            )}
          </div>
        </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Body Listrado Verde/Branco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setAutoSlug(false);
                      updateField("slug", e.target.value);
                    }}
                    placeholder="body-listrado-verde-branco"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Descrição curta</Label>
                <Input
                  id="shortDescription"
                  value={form.shortDescription}
                  onChange={(e) => updateField("shortDescription", e.target.value)}
                  placeholder="Body listrado em algodão premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição completa</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  placeholder="Descrição detalhada do produto..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Care Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instruções de Cuidado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.careInstructions.map((instruction, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-foreground flex-1">{instruction}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveCareInstruction(i)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newCareInstruction}
                  onChange={(e) => setNewCareInstruction(e.target.value)}
                  placeholder="Ex: Lavar à máquina em água fria"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCareInstruction(); } }}
                />
                <Button variant="outline" size="icon" onClick={handleAddCareInstruction}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardHeader>
              <CardTitle>Medidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(form.measurements).map(([size, value]) => (
                <div key={size} className="flex items-center gap-2">
                  <Badge variant="secondary" className="min-w-[40px] justify-center">
                    {size}
                  </Badge>
                  <span className="text-sm text-foreground flex-1">{value}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveMeasurement(size)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  className="w-20"
                  value={newMeasureSize}
                  onChange={(e) => setNewMeasureSize(e.target.value)}
                  placeholder="RN"
                />
                <Input
                  className="flex-1"
                  value={newMeasureValue}
                  onChange={(e) => setNewMeasureValue(e.target.value)}
                  placeholder="Altura: 50-55cm | Peso: até 4kg"
                />
                <Button variant="outline" size="icon" onClick={handleAddMeasurement}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sizes & Stock (only when editing) */}
          {isEditing && existingProduct && (
            <Card>
              <CardHeader>
                <CardTitle>Tamanhos & Estoque</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {existingProduct.productSizes.map((size) => (
                  <div key={size.id} className="flex items-center gap-3">
                    <Badge variant="secondary" className="min-w-[50px] justify-center">
                      {size.sizeLabel}
                    </Badge>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      defaultValue={size.stock}
                      onBlur={(e) => {
                        const val = Number.parseInt(e.target.value);
                        if (!Number.isNaN(val) && val !== size.stock) {
                          handleUpdateStock(size.id, val);
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">unidades</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive ml-auto"
                      onClick={() => handleDeleteSize(size.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    className="w-20"
                    value={newSizeLabel}
                    onChange={(e) => setNewSizeLabel(e.target.value)}
                    placeholder="GG"
                  />
                  <Input
                    type="number"
                    min={0}
                    className="w-24"
                    value={newSizeStock}
                    onChange={(e) => setNewSizeStock(Number.parseInt(e.target.value) || 0)}
                    placeholder="10"
                  />
                  <Button variant="outline" onClick={handleAddSize}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Images (only when editing) */}
          {isEditing && existingProduct && (
            <Card>
              <CardHeader>
                <CardTitle>Imagens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingProduct.productImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {existingProduct.productImages.map((img) => (
                      <div key={img.id} className="relative group">
                        <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                          <img
                            src={img.url}
                            alt={img.altText}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          onClick={() => handleDeleteImage(img.id)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <Badge
                          variant="secondary"
                          className="absolute bottom-1 left-1 text-[10px]"
                        >
                          #{img.position}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                  <Input
                    className="flex-1"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="URL da imagem"
                  />
                  <Input
                    className="w-40"
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    placeholder="Texto alternativo"
                  />
                  <Button variant="outline" onClick={handleAddImage}>
                    <ImagePlus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Preço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço atual (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.price}
                  onChange={(e) => updateField("price", Number.parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Preço original (R$)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.originalPrice ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateField("originalPrice", v ? Number.parseFloat(v) : null);
                  }}
                  placeholder="Deixe vazio se sem desconto"
                />
              </div>
            </CardContent>
          </Card>

          {/* Shipping dimensions (Melhor Envio) */}
          <Card>
            <CardHeader>
              <CardTitle>Dimensões (Frete)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weightKg">Peso (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={30}
                  value={form.weightKg}
                  onChange={(e) => updateField("weightKg", Number.parseFloat(e.target.value) || 0.3)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="heightCm" className="text-xs">Altura (cm)</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    step="0.1"
                    min={1}
                    max={100}
                    value={form.heightCm}
                    onChange={(e) => updateField("heightCm", Number.parseFloat(e.target.value) || 5)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="widthCm" className="text-xs">Largura (cm)</Label>
                  <Input
                    id="widthCm"
                    type="number"
                    step="0.1"
                    min={1}
                    max={100}
                    value={form.widthCm}
                    onChange={(e) => updateField("widthCm", Number.parseFloat(e.target.value) || 20)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lengthCm" className="text-xs">Compr. (cm)</Label>
                  <Input
                    id="lengthCm"
                    type="number"
                    step="0.1"
                    min={1}
                    max={100}
                    value={form.lengthCm}
                    onChange={(e) => updateField("lengthCm", Number.parseFloat(e.target.value) || 25)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Usado para calcular frete via Melhor Envio
              </p>
            </CardContent>
          </Card>

          {/* Category & Flags */}
          <Card>
            <CardHeader>
              <CardTitle>Organização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => updateField("category", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Destaque</Label>
                <Switch
                  id="featured"
                  checked={form.featured}
                  onCheckedChange={(v) => updateField("featured", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Ativo</Label>
                <Switch
                  id="active"
                  checked={form.active}
                  onCheckedChange={(v) => updateField("active", v)}
                />
              </div>
            </CardContent>
          </Card>

          {!isEditing && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground text-center">
                  💡 Salve o produto primeiro para adicionar tamanhos, estoque e imagens.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
