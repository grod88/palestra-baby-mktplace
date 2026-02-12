import { Product, Testimonial, FAQ } from "@/types";

export const products: Product[] = [
  {
    id: "1",
    name: "Body Listrado Verde/Branco",
    slug: "body-listrado-verde-branco",
    price: 59.9,
    description:
      "Body em algodão premium com listras nas cores do Verdão. Perfeito para os pequenos torcedores que já nascem campeões! Tecido macio e confortável, ideal para o dia a dia do bebê.",
    shortDescription: "Body listrado em algodão premium",
    images: ["/placeholder.svg"],
    category: "bodies",
    sizes: ["RN", "P", "M", "G"],
    inStock: true,
    featured: true,
    careInstructions: [
      "Lavar à máquina em água fria",
      "Não usar alvejante",
      "Secar à sombra",
      "Passar em temperatura média",
    ],
    measurements: {
      RN: "Altura: 50-55cm | Peso: até 4kg",
      P: "Altura: 55-60cm | Peso: 4-6kg",
      M: "Altura: 60-65cm | Peso: 6-9kg",
      G: "Altura: 65-72cm | Peso: 9-12kg",
    },
  },
  {
    id: "2",
    name: "Conjunto Alviverde Completo",
    slug: "conjunto-alviverde-completo",
    price: 129.9,
    originalPrice: 159.9,
    description:
      "Conjunto completo com body, calça e touca nas cores alviverde. Fabricado com algodão orgânico certificado, proporciona máximo conforto e segurança para a pele sensível do bebê.",
    shortDescription: "Conjunto 3 peças algodão orgânico",
    images: ["/placeholder.svg"],
    category: "conjuntos",
    sizes: ["RN", "P", "M", "G"],
    inStock: true,
    featured: true,
    careInstructions: [
      "Lavar à máquina em água fria",
      "Não usar alvejante",
      "Secar à sombra",
      "Passar em temperatura média",
    ],
    measurements: {
      RN: "Altura: 50-55cm | Peso: até 4kg",
      P: "Altura: 55-60cm | Peso: 4-6kg",
      M: "Altura: 60-65cm | Peso: 6-9kg",
      G: "Altura: 65-72cm | Peso: 9-12kg",
    },
  },
  {
    id: "3",
    name: "Macacão Campeão",
    slug: "macacao-campeao",
    price: 89.9,
    description:
      "Macacão quentinho para os dias mais frios. Design exclusivo com detalhes bordados, zíper frontal para facilitar a troca de fraldas. Seu bebê vai estar pronto para torcer pelo Verdão!",
    shortDescription: "Macacão com zíper frontal",
    images: ["/placeholder.svg"],
    category: "conjuntos",
    sizes: ["RN", "P", "M", "G"],
    inStock: true,
    featured: true,
    careInstructions: [
      "Lavar à máquina em água fria",
      "Não usar alvejante",
      "Secar à sombra",
      "Passar em temperatura baixa",
    ],
    measurements: {
      RN: "Altura: 50-55cm | Peso: até 4kg",
      P: "Altura: 55-60cm | Peso: 4-6kg",
      M: "Altura: 60-65cm | Peso: 6-9kg",
      G: "Altura: 65-72cm | Peso: 9-12kg",
    },
  },
  {
    id: "4",
    name: "Kit 3 Bodies",
    slug: "kit-3-bodies",
    price: 149.9,
    originalPrice: 179.9,
    description:
      "Kit econômico com 3 bodies em cores diferentes: verde, branco e listrado. Ideal para ter sempre uma opção limpa para o bebê. Ótimo custo-benefício!",
    shortDescription: "Kit com 3 bodies sortidos",
    images: ["/placeholder.svg"],
    category: "kits",
    sizes: ["RN", "P", "M", "G"],
    inStock: true,
    featured: true,
    careInstructions: [
      "Lavar à máquina em água fria",
      "Não usar alvejante",
      "Secar à sombra",
      "Passar em temperatura média",
    ],
    measurements: {
      RN: "Altura: 50-55cm | Peso: até 4kg",
      P: "Altura: 55-60cm | Peso: 4-6kg",
      M: "Altura: 60-65cm | Peso: 6-9kg",
      G: "Altura: 65-72cm | Peso: 9-12kg",
    },
  },
  {
    id: "5",
    name: "Sapatinho Primeiro Gol",
    slug: "sapatinho-primeiro-gol",
    price: 49.9,
    description:
      'Sapatinho de bebê em formato de chuteira. Super fofo e confortável, com elástico para não sair do pezinho. O primeiro "chuteirinha" do seu pequeno craque!',
    shortDescription: "Sapatinho formato chuteira",
    images: ["/placeholder.svg"],
    category: "acessorios",
    sizes: ["RN", "P", "M"],
    inStock: true,
    featured: false,
    careInstructions: ["Lavar à mão", "Não torcer", "Secar à sombra"],
    measurements: {
      RN: "Sola: 9cm",
      P: "Sola: 10cm",
      M: "Sola: 11cm",
    },
  },
  {
    id: "6",
    name: "Babador Hora do Gol",
    slug: "babador-hora-do-gol",
    price: 29.9,
    description:
      'Babador impermeável com estampa divertida "Hora do Gol". Mantém a roupinha do bebê sempre seca durante as refeições. Fechamento em velcro para praticidade.',
    shortDescription: "Babador impermeável divertido",
    images: ["/placeholder.svg"],
    category: "acessorios",
    sizes: ["Único"],
    inStock: true,
    featured: false,
    careInstructions: [
      "Limpar com pano úmido",
      "Lavar à mão se necessário",
      "Não passar",
    ],
    measurements: {
      Único: "Largura: 20cm | Altura: 25cm",
    },
  },
  {
    id: "7",
    name: "Manta Verdão",
    slug: "manta-verdao",
    price: 79.9,
    description:
      "Manta soft ultra macia nas cores do Palmeiras. Perfeita para aquecer o bebê no carrinho, berço ou durante as mamadas. Bordado com o escudo do time.",
    shortDescription: "Manta soft com bordado",
    images: ["/placeholder.svg"],
    category: "acessorios",
    sizes: ["Único"],
    inStock: true,
    featured: true,
    careInstructions: [
      "Lavar à máquina em água fria",
      "Não usar alvejante",
      "Secar em temperatura baixa",
      "Não passar",
    ],
    measurements: {
      Único: "80cm x 100cm",
    },
  },
  {
    id: "8",
    name: "Kit Presente Nascimento",
    slug: "kit-presente-nascimento",
    price: 199.9,
    originalPrice: 249.9,
    description:
      "O presente perfeito para o nascimento do pequeno palmeirense! Kit completo com body, macacão, manta, sapatinho e babador. Vem em uma linda caixa presente decorada.",
    shortDescription: "Kit completo para presente",
    images: ["/placeholder.svg"],
    category: "kits",
    sizes: ["RN", "P", "M"],
    inStock: true,
    featured: true,
    careInstructions: ["Verificar instruções individuais de cada peça"],
    measurements: {
      RN: "Altura: 50-55cm | Peso: até 4kg",
      P: "Altura: 55-60cm | Peso: 4-6kg",
      M: "Altura: 60-65cm | Peso: 6-9kg",
    },
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Mariana Silva",
    avatar: "/placeholder.svg",
    text: "A qualidade é incrível! Meu bebê fica super confortável e lindo com as roupinhas. O atendimento também é excelente!",
    rating: 5,
  },
  {
    id: "2",
    name: "Pedro Santos",
    avatar: "/placeholder.svg",
    text: "Comprei o kit presente para meu sobrinho e foi um sucesso! A caixa veio linda e as peças são de altíssima qualidade.",
    rating: 5,
  },
  {
    id: "3",
    name: "Juliana Costa",
    avatar: "/placeholder.svg",
    text: "Já é a terceira compra e sempre supera minhas expectativas. Entrega rápida e produtos impecáveis. Super recomendo!",
    rating: 5,
  },
];

export const faqs: FAQ[] = [
  {
    question: "Qual o prazo de entrega?",
    answer:
      "O prazo de entrega varia de acordo com a sua região. Após a postagem, entregas para São Paulo capital levam de 2 a 3 dias úteis. Para outras regiões, o prazo é de 5 a 10 dias úteis.",
  },
  {
    question: "Como escolher o tamanho correto?",
    answer:
      "Disponibilizamos uma tabela de medidas detalhada em cada produto. Recomendamos medir o bebê e comparar com nossa tabela. Em caso de dúvida, nosso atendimento via WhatsApp pode ajudar!",
  },
  {
    question: "Posso trocar ou devolver um produto?",
    answer:
      "Sim! Aceitamos trocas e devoluções em até 30 dias após o recebimento, desde que o produto esteja sem uso e com etiquetas originais. Entre em contato pelo WhatsApp para iniciar o processo.",
  },
  {
    question: "Os produtos são oficiais do Palmeiras?",
    answer:
      "Nossos produtos são inspirados nas cores e no espírito do Palmeiras, criados especialmente para bebês. São peças autorais da Palestra Baby, feitas com muito carinho e qualidade premium.",
  },
  {
    question: "Quais formas de pagamento são aceitas?",
    answer:
      "Aceitamos PIX, cartão de crédito (até 3x sem juros) e cartão de débito. O PIX oferece 5% de desconto no valor total da compra!",
  },
  {
    question: "Como cuidar das roupinhas?",
    answer:
      "Recomendamos lavar as peças à máquina com água fria, usar sabão neutro e secar à sombra. Evite alvejantes e amaciantes com fragrâncias fortes. Cada produto tem instruções específicas na etiqueta.",
  },
];

export const categoryLabels: Record<string, string> = {
  bodies: "Bodies",
  conjuntos: "Conjuntos",
  acessorios: "Acessórios",
  kits: "Kits",
};
