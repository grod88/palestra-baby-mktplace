import { motion } from 'framer-motion';
import { useFAQs } from '@/hooks/useSupabase';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';

function FAQSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl shadow-soft px-6 py-4">
          <Skeleton className="h-5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function FAQSection() {
  const { data: faqs, isLoading, error } = useFAQs();

  return (
    <section id="contato" className="section-padding bg-primary/5">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-accent font-medium text-sm uppercase tracking-wider">
            Dúvidas Frequentes
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mt-2 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Encontre respostas para as dúvidas mais comuns sobre nossos produtos e serviços
          </p>
        </motion.div>

        {isLoading ? (
          <FAQSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Não foi possível carregar as perguntas frequentes.</p>
          </div>
        ) : faqs && faqs.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card rounded-2xl shadow-soft border-none px-6"
                >
                  <AccordionTrigger className="text-left font-medium text-foreground hover:text-primary py-4 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
