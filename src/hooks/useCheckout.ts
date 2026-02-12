/**
 * useCheckout — React Query mutation + state para o fluxo de checkout.
 */
import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  processOrder,
  validateCoupon,
  calculateCouponDiscount,
  fetchAddressByCep,
  customerSchema,
  addressSchema,
  calculateTotals,
  type CheckoutFormData,
  type CheckoutResult,
  type CouponResult,
  type ViaCepResult,
} from "@/lib/checkout-api";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "@/types";

export type CheckoutStep = 1 | 2 | 3;

export interface CheckoutState {
  step: CheckoutStep;
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  shippingMethod: "pac" | "sedex" | "free";
  paymentMethod: "pix" | "credit_card";
  couponCode: string;
  customerNotes: string;
}

const initialState: CheckoutState = {
  step: 1,
  customer: { name: "", email: "", phone: "", cpf: "" },
  address: {
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  },
  shippingMethod: "pac",
  paymentMethod: "pix",
  couponCode: "",
  customerNotes: "",
};

export function useCheckout() {
  const [state, setState] = useState<CheckoutState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const { items, getTotalPrice, clearCart } = useCart();

  // ── Field updates ────────────────────────────────────────────────────────

  const updateCustomer = useCallback(
    (field: string, value: string) => {
      setState((s) => ({
        ...s,
        customer: { ...s.customer, [field]: value },
      }));
      // Clear field error
      setErrors((e) => {
        const next = { ...e };
        delete next[`customer.${field}`];
        return next;
      });
    },
    []
  );

  const updateAddress = useCallback(
    (field: string, value: string) => {
      setState((s) => ({
        ...s,
        address: { ...s.address, [field]: value },
      }));
      setErrors((e) => {
        const next = { ...e };
        delete next[`address.${field}`];
        return next;
      });
    },
    []
  );

  const setShippingMethod = useCallback(
    (method: "pac" | "sedex" | "free") => {
      setState((s) => ({ ...s, shippingMethod: method }));
    },
    []
  );

  const setPaymentMethod = useCallback(
    (method: "pix" | "credit_card") => {
      setState((s) => ({ ...s, paymentMethod: method }));
    },
    []
  );

  const setCustomerNotes = useCallback((notes: string) => {
    setState((s) => ({ ...s, customerNotes: notes }));
  }, []);

  const setCouponCode = useCallback((code: string) => {
    setState((s) => ({ ...s, couponCode: code }));
  }, []);

  // ── CEP lookup ───────────────────────────────────────────────────────────

  const lookupCep = useCallback(async () => {
    const cep = state.address.cep;
    if (!cep || cep.replaceAll(/\D/g, "").length !== 8) return;

    setIsLoadingCep(true);
    try {
      const result: ViaCepResult | null = await fetchAddressByCep(cep);
      if (result) {
        setState((s) => ({
          ...s,
          address: {
            ...s.address,
            street: result.logradouro || s.address.street,
            neighborhood: result.bairro || s.address.neighborhood,
            city: result.localidade || s.address.city,
            state: result.uf || s.address.state,
          },
        }));
      }
    } finally {
      setIsLoadingCep(false);
    }
  }, [state.address.cep]);

  // ── Step validation ──────────────────────────────────────────────────────

  const validateStep1 = useCallback((): boolean => {
    const result = customerSchema.safeParse(state.customer);
    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = `customer.${issue.path.join(".")}`;
      fieldErrors[path] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  }, [state.customer]);

  const validateStep2 = useCallback((): boolean => {
    const result = addressSchema.safeParse(state.address);
    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = `address.${issue.path.join(".")}`;
      fieldErrors[path] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  }, [state.address]);

  const goToStep = useCallback(
    (step: CheckoutStep) => {
      if (step === 2 && !validateStep1()) return;
      if (step === 3 && !validateStep2()) return;
      setState((s) => ({ ...s, step }));
    },
    [validateStep1, validateStep2]
  );

  const goBack = useCallback(() => {
    setState((s) => ({
      ...s,
      step: Math.max(1, s.step - 1) as CheckoutStep,
    }));
  }, []);

  // ── Coupon ───────────────────────────────────────────────────────────────

  const applyCoupon = useMutation({
    mutationFn: async () => {
      const subtotal = getTotalPrice();
      const result = await validateCoupon(state.couponCode, subtotal);
      return result;
    },
    onSuccess: (data) => {
      setCoupon(data);
    },
  });

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setCouponCode("");
  }, [setCouponCode]);

  // ── Totals ───────────────────────────────────────────────────────────────

  const subtotal = getTotalPrice();
  const discountAmount = coupon
    ? calculateCouponDiscount(coupon, subtotal)
    : 0;
  const totals = calculateTotals(
    subtotal,
    state.shippingMethod,
    state.paymentMethod,
    discountAmount
  );

  // ── Submit order ─────────────────────────────────────────────────────────

  const buildPayload = useCallback(
    (cartItems: CartItem[]): CheckoutFormData => ({
      customer: state.customer,
      address: state.address,
      shippingMethod: state.shippingMethod,
      paymentMethod: state.paymentMethod,
      items: cartItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
      couponCode: coupon?.code || undefined,
      customerNotes: state.customerNotes || undefined,
    }),
    [state, coupon]
  );

  const submitOrder = useMutation<CheckoutResult, Error>({
    mutationFn: async () => {
      // Final validations
      if (!validateStep1()) throw new Error("Dados pessoais incompletos");
      if (!validateStep2()) throw new Error("Endereço incompleto");
      if (items.length === 0) throw new Error("Carrinho vazio");

      const payload = buildPayload(items);
      return processOrder(payload);
    },
    onSuccess: () => {
      clearCart();
    },
  });

  return {
    // State
    state,
    errors,
    coupon,
    isLoadingCep,
    totals,

    // Field updaters
    updateCustomer,
    updateAddress,
    setShippingMethod,
    setPaymentMethod,
    setCustomerNotes,
    setCouponCode,

    // Actions
    lookupCep,
    goToStep,
    goBack,
    applyCoupon,
    removeCoupon,

    // Submit
    submitOrder,
  };
}
