export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  images: string[];
  category: 'bodies' | 'conjuntos' | 'acessorios' | 'kits';
  sizes: string[];
  inStock: boolean;
  featured: boolean;
  careInstructions: string[];
  measurements: Record<string, string>;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  cpf: string;
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  text: string;
  rating: number;
}

export interface FAQ {
  question: string;
  answer: string;
}
