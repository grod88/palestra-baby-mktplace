import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export function WhatsAppButton() {
  const phoneNumber = '5511999999999';
  const message = encodeURIComponent('Olá! Vim pelo site da Palestra Baby e gostaria de mais informações.');

  return (
    <motion.a
      href={`https://wa.me/${phoneNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 md:w-16 md:h-16 bg-whatsapp text-white rounded-full flex items-center justify-center shadow-float hover:shadow-hover transition-all"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageCircle className="w-7 h-7 md:w-8 md:h-8 fill-current" />
      
      {/* Pulse effect */}
      <span className="absolute inset-0 rounded-full bg-whatsapp animate-ping opacity-25" />
    </motion.a>
  );
}
