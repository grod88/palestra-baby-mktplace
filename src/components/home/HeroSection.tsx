import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Heart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-verde-claro/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        {/* Floating elements */}
        <motion.div
          className="absolute top-32 right-[15%] text-4xl float-animation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          ⭐
        </motion.div>
        <motion.div
          className="absolute top-48 left-[10%] text-3xl float-animation-delayed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          💚
        </motion.div>
        <motion.div
          className="absolute bottom-32 left-[20%] text-4xl float-animation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          🌴
        </motion.div>
        <motion.div
          className="absolute bottom-48 right-[25%] text-3xl float-animation-delayed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          ☁️
        </motion.div>
      </div>

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-primary">
                Nova Coleção Disponível
              </span>
            </motion.div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-6 leading-tight">
              Conforto, carinho e{' '}
              <span className="relative inline-block">
                estilo
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <path
                    d="M2 8.5C50 2.5 150 2.5 198 8.5"
                    stroke="hsl(var(--accent))"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{' '}
              para o seu bebê
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Roupinhas premium para os pequenos palmeirenses. 
              Tecidos macios, design exclusivo e muito amor em cada peça. 
              Porque seu bebê merece vestir o manto desde cedo! 🌴
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="btn-primary text-base px-8 h-14"
              >
                <Link to="/produtos">
                  Ver Coleção
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-2xl border-primary/20 hover:bg-primary/5 text-base px-8 h-14"
              >
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Falar no WhatsApp
                </a>
              </Button>
            </div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex items-center gap-6 justify-center lg:justify-start"
            >
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-accent fill-accent" />
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">4.9</strong> de avaliação
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-accent fill-accent" />
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">500+</strong> mamães felizes
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Main image container */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-verde-claro/20 to-accent/20 rounded-[3rem] transform rotate-3" />
              <div className="absolute inset-4 bg-card rounded-[2.5rem] shadow-float overflow-hidden">
                <img 
                  src="/placeholder.svg" 
                  alt="Bebê feliz vestindo roupa verde"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Floating product cards */}
              <motion.div
                className="absolute -left-8 top-1/4 bg-card p-3 rounded-2xl shadow-card"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-muted rounded-xl" />
                  <div>
                    <p className="text-xs font-medium">Body Listrado</p>
                    <p className="text-sm font-bold text-primary">R$ 59,90</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute -right-4 bottom-1/4 bg-card p-3 rounded-2xl shadow-card"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-muted rounded-xl" />
                  <div>
                    <p className="text-xs font-medium">Kit Presente</p>
                    <p className="text-sm font-bold text-primary">R$ 199,90</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
