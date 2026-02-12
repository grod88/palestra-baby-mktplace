import { motion } from 'framer-motion';
import { Award, Truck, Heart, Gift } from 'lucide-react';

const features = [
  {
    icon: Award,
    title: 'Qualidade Premium',
    description: 'Tecidos macios e hipoalergênicos, ideais para a pele sensível do bebê'
  },
  {
    icon: Truck,
    title: 'Envio Rápido',
    description: 'Entregas para todo o Brasil com rastreamento em tempo real'
  },
  {
    icon: Heart,
    title: 'Conforto Garantido',
    description: 'Modelagem pensada para o máximo conforto e liberdade de movimento'
  },
  {
    icon: Gift,
    title: 'Presente Perfeito',
    description: 'Embalagens especiais para presente com cartão personalizado'
  }
];

export function FeaturesSection() {
  return (
    <section className="section-padding bg-primary/5">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-accent font-medium text-sm uppercase tracking-wider">
            Diferenciais
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mt-2">
            Por que escolher a Palestra Baby?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-3xl p-6 shadow-card text-center group hover:shadow-hover transition-all"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <feature.icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
