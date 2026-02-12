import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  CreditCard,
  QrCode,
  Truck,
  MapPin,
  User,
  Check,
  Loader2,
  Tag,
  X,
  MessageSquare,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { useCheckout } from "@/hooks/useCheckout";
import { SHIPPING_OPTIONS } from "@/lib/checkout-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";

export default function Checkout() {
  const navigate = useNavigate();
  const { items } = useCart();
  const {
    state,
    errors,
    coupon,
    isLoadingCep,
    totals,
    updateCustomer,
    updateAddress,
    setShippingMethod,
    setPaymentMethod,
    setCustomerNotes,
    setCouponCode,
    lookupCep,
    goToStep,
    goBack,
    applyCoupon,
    removeCoupon,
    submitOrder,
  } = useCheckout();

  // Redirect to payment URL on success
  useEffect(() => {
    if (submitOrder.isSuccess && submitOrder.data) {
      const { paymentUrl, orderId, paymentMethod } = submitOrder.data;
      if (paymentMethod === "pix") {
        navigate(`/pedido/confirmacao?order_id=${orderId}&status=pending`);
      } else if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        navigate(`/pedido/confirmacao?order_id=${orderId}&status=pending`);
      }
    }
  }, [submitOrder.isSuccess, submitOrder.data, navigate]);

  useEffect(() => {
    if (submitOrder.isError) {
      toast({
        title: "Erro no pedido",
        description:
          submitOrder.error?.message || "Erro ao processar. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [submitOrder.isError, submitOrder.error]);

  const getFieldError = (path: string) => errors[path];

  if (items.length === 0 && !submitOrder.isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <CartDrawer />
        <main className="pt-24 pb-16">
          <div className="container-custom text-center py-16">
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">
              Seu carrinho está vazio
            </h1>
            <p className="text-muted-foreground mb-6">
              Adicione produtos para continuar com a compra.
            </p>
            <Button asChild>
              <Link to="/produtos">Ver Produtos</Link>
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
              Continuar comprando
            </Link>
          </motion.div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[
              { n: 1, label: "Dados" },
              { n: 2, label: "Entrega" },
              { n: 3, label: "Pagamento" },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                      state.step >= n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {state.step > n ? <Check className="w-5 h-5" /> : n}
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground">
                    {label}
                  </span>
                </div>
                {n < 3 && (
                  <div
                    className={`w-16 md:w-24 h-1 mx-2 ${
                      state.step > n ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Customer Info */}
              {state.step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card rounded-3xl p-6 shadow-card"
                >
                  <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Seus Dados
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input
                        id="name"
                        value={state.customer.name}
                        onChange={(e) => updateCustomer("name", e.target.value)}
                        className={`rounded-xl mt-1 ${getFieldError("customer.name") ? "border-red-500" : ""}`}
                        placeholder="Seu nome completo"
                      />
                      {getFieldError("customer.name") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("customer.name")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={state.customer.email}
                        onChange={(e) => updateCustomer("email", e.target.value)}
                        className={`rounded-xl mt-1 ${getFieldError("customer.email") ? "border-red-500" : ""}`}
                        placeholder="seu@email.com"
                      />
                      {getFieldError("customer.email") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("customer.email")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={state.customer.phone}
                        onChange={(e) => updateCustomer("phone", e.target.value)}
                        className={`rounded-xl mt-1 ${getFieldError("customer.phone") ? "border-red-500" : ""}`}
                        placeholder="(11) 99999-9999"
                      />
                      {getFieldError("customer.phone") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("customer.phone")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={state.customer.cpf}
                        onChange={(e) => updateCustomer("cpf", e.target.value)}
                        className={`rounded-xl mt-1 ${getFieldError("customer.cpf") ? "border-red-500" : ""}`}
                        placeholder="000.000.000-00"
                      />
                      {getFieldError("customer.cpf") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("customer.cpf")}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    className="mt-6 btn-primary"
                    onClick={() => goToStep(2)}
                  >
                    Continuar para Endereço
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Address & Shipping */}
              {state.step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card rounded-3xl p-6 shadow-card"
                >
                  <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Endereço de Entrega
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={state.address.cep}
                        onChange={(e) => updateAddress("cep", e.target.value)}
                        onBlur={lookupCep}
                        className={`rounded-xl mt-1 ${getFieldError("address.cep") ? "border-red-500" : ""}`}
                        placeholder="00000-000"
                        disabled={isLoadingCep}
                      />
                      {getFieldError("address.cep") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("address.cep")}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="street">Rua</Label>
                      <Input
                        id="street"
                        value={state.address.street}
                        onChange={(e) => updateAddress("street", e.target.value)}
                        className={`rounded-xl mt-1 ${getFieldError("address.street") ? "border-red-500" : ""}`}
                        placeholder="Nome da rua"
                      />
                      {getFieldError("address.street") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("address.street")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={state.address.number}
                        onChange={(e) => updateAddress("number", e.target.value)}
                        className={`rounded-xl mt-1 ${getFieldError("address.number") ? "border-red-500" : ""}`}
                        placeholder="123"
                      />
                      {getFieldError("address.number") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("address.number")}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={state.address.complement}
                        onChange={(e) =>
                          updateAddress("complement", e.target.value)
                        }
                        className="rounded-xl mt-1"
                        placeholder="Apto, bloco, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={state.address.neighborhood}
                        onChange={(e) =>
                          updateAddress("neighborhood", e.target.value)
                        }
                        className={`rounded-xl mt-1 ${getFieldError("address.neighborhood") ? "border-red-500" : ""}`}
                        placeholder="Bairro"
                      />
                      {getFieldError("address.neighborhood") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("address.neighborhood")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={state.address.city}
                        onChange={(e) => updateAddress("city", e.target.value)}
                        className={`rounded-xl mt-1 ${getFieldError("address.city") ? "border-red-500" : ""}`}
                        placeholder="Cidade"
                      />
                      {getFieldError("address.city") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("address.city")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={state.address.state}
                        onChange={(e) => updateAddress("state", e.target.value)}
                        className={`rounded-xl mt-1 ${getFieldError("address.state") ? "border-red-500" : ""}`}
                        placeholder="UF"
                        maxLength={2}
                      />
                      {getFieldError("address.state") && (
                        <p className="text-xs text-red-500 mt-1">
                          {getFieldError("address.state")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Options */}
                  <div className="mt-6">
                    <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Opções de Frete
                    </h3>
                    <RadioGroup
                      value={state.shippingMethod}
                      onValueChange={(v) =>
                        setShippingMethod(v as "pac" | "sedex" | "free")
                      }
                      className="space-y-3"
                    >
                      {SHIPPING_OPTIONS.map((option) => {
                        const isFreeAvailable =
                          !option.minValue || totals.subtotal >= option.minValue;
                        const isDisabled = !!option.minValue && !isFreeAvailable;

                        return (
                          <label
                            key={option.id}
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                              state.shippingMethod === option.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem
                                value={option.id}
                                disabled={isDisabled}
                              />
                              <div>
                                <p className="font-medium text-foreground">
                                  {option.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {option.days}
                                </p>
                                {isDisabled && (
                                  <p className="text-xs text-muted-foreground">
                                    Pedido mínimo: {formatPrice(option.minValue!)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="font-medium text-foreground">
                              {option.price === 0
                                ? "Grátis"
                                : formatPrice(option.price)}
                            </span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={goBack}
                    >
                      Voltar
                    </Button>
                    <Button
                      className="btn-primary"
                      onClick={() => goToStep(3)}
                    >
                      Continuar para Pagamento
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {state.step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-card rounded-3xl p-6 shadow-card">
                    <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Forma de Pagamento
                    </h2>

                    <RadioGroup
                      value={state.paymentMethod}
                      onValueChange={(v) =>
                        setPaymentMethod(v as "pix" | "credit_card")
                      }
                      className="space-y-3"
                    >
                      <label
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                          state.paymentMethod === "pix"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="pix" />
                          <div>
                            <div className="flex items-center gap-2">
                              <QrCode className="w-5 h-5 text-primary" />
                              <p className="font-medium text-foreground">PIX</p>
                              <span className="px-2 py-0.5 bg-accent text-accent-foreground text-xs font-bold rounded-full">
                                5% OFF
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Pagamento instantâneo
                            </p>
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                          state.paymentMethod === "credit_card"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="credit_card" />
                          <div>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-primary" />
                              <p className="font-medium text-foreground">
                                Cartão de Crédito
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Em até 3x sem juros
                            </p>
                          </div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  {/* Coupon */}
                  <div className="bg-card rounded-3xl p-6 shadow-card">
                    <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      Cupom de desconto
                    </h3>

                    {coupon ? (
                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {coupon.code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}% de desconto`
                              : `${formatPrice(coupon.discountValue)} de desconto`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={removeCoupon}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={state.couponCode}
                          onChange={(e) =>
                            setCouponCode(e.target.value.toUpperCase())
                          }
                          placeholder="Código do cupom"
                          className="rounded-xl"
                        />
                        <Button
                          variant="outline"
                          onClick={() => applyCoupon.mutate()}
                          disabled={
                            !state.couponCode || applyCoupon.isPending
                          }
                        >
                          {applyCoupon.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Aplicar"
                          )}
                        </Button>
                      </div>
                    )}
                    {applyCoupon.isError && (
                      <p className="text-xs text-red-500 mt-2">
                        {applyCoupon.error?.message || "Cupom inválido"}
                      </p>
                    )}
                  </div>

                  {/* Customer Notes */}
                  <div className="bg-card rounded-3xl p-6 shadow-card">
                    <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Observações (opcional)
                    </h3>
                    <Textarea
                      value={state.customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Alguma observação sobre o pedido?"
                      className="rounded-xl"
                      rows={2}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={goBack}
                    >
                      Voltar
                    </Button>
                    <Button
                      className="btn-primary flex-1"
                      onClick={() => submitOrder.mutate()}
                      disabled={submitOrder.isPending}
                    >
                      {submitOrder.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : state.paymentMethod === "pix" ? (
                        "Gerar PIX"
                      ) : (
                        "Pagar com Cartão"
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card rounded-3xl p-6 shadow-card">
                <h2 className="font-display text-lg font-bold text-foreground mb-4">
                  Resumo do Pedido
                </h2>

                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={`${item.product.id}-${item.size}`}
                      className="flex gap-3"
                    >
                      <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tam: {item.size} | Qtd: {item.quantity}
                        </p>
                        <p className="text-sm font-medium text-primary">
                          {formatPrice(item.product.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">
                      {formatPrice(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="text-foreground">
                      {totals.shippingPrice === 0
                        ? "Grátis"
                        : formatPrice(totals.shippingPrice)}
                    </span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto cupom</span>
                      <span>-{formatPrice(totals.discountAmount)}</span>
                    </div>
                  )}
                  {state.paymentMethod === "pix" && totals.pixDiscount > 0 && (
                    <div className="flex justify-between text-sm text-accent">
                      <span>Desconto PIX (5%)</span>
                      <span>-{formatPrice(totals.pixDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="font-display text-xl font-bold text-primary">
                      {formatPrice(totals.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
