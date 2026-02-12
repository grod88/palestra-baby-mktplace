import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, Phone, MapPin, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-xl">🌴</span>
              </div>
              <span className="font-display text-xl font-bold">
                Palestra Baby
              </span>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Moda infantil premium para os pequenos palmeirenses. 
              Conforto, qualidade e muito amor em cada peça.
            </p>
            <div className="flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Rápidos */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-bold">Links Rápidos</h4>
            <nav className="flex flex-col gap-2">
              <Link
                to="/produtos"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                Produtos
              </Link>
              <Link
                to="/produtos?categoria=bodies"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                Bodies
              </Link>
              <Link
                to="/produtos?categoria=conjuntos"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                Conjuntos
              </Link>
              <Link
                to="/produtos?categoria=kits"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                Kits Presente
              </Link>
            </nav>
          </div>

          {/* Atendimento */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-bold">Atendimento</h4>
            <div className="flex flex-col gap-3">
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                <Phone className="w-4 h-4" />
                (11) 99999-9999
              </a>
              <a
                href="mailto:contato@palestrababy.com.br"
                className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                <Mail className="w-4 h-4" />
                contato@palestrababy.com.br
              </a>
              <div className="flex items-start gap-2 text-primary-foreground/80 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>São Paulo, SP - Brasil</span>
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-bold">Informações</h4>
            <nav className="flex flex-col gap-2">
              <Link
                to="/politica-privacidade"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                Política de Privacidade
              </Link>
              <Link
                to="/termos-uso"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                Termos de Uso
              </Link>
              <Link
                to="/trocas-devolucoes"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
              >
                Trocas e Devoluções
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-primary-foreground/60 text-sm text-center md:text-left">
            © {currentYear} Palestra Baby. Todos os direitos reservados.
          </p>
          <p className="text-primary-foreground/60 text-sm flex items-center gap-1">
            Feito com <Heart className="w-4 h-4 text-accent fill-accent" /> em São Paulo
          </p>
        </div>
      </div>
    </footer>
  );
}
