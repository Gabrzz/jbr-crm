import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Bed, Bath, Ruler, MapPin } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  id: number;
  title: string;
  price?: string;
  bedrooms?: string;
  bathrooms?: string;
  area?: string;
  images?: string[];
  business?: string;
  code?: string;
  district?: string;
  city?: string;
  viewMode?: 'grid' | 'list';
}

export function PropertyCard({ id, title, price, bedrooms, bathrooms, area, images, business, code, district, city, viewMode = 'grid' }: Props) {
  const navigate = useNavigate();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      transition={{ 
        layout: { type: "spring", stiffness: 200, damping: 25 },
        opacity: { duration: 0.2 },
        y: { duration: 0.3 }
      }}
      className="h-full"
    >
      <motion.div 
        layout
        className={cn(
          "glass-panel overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500 group rounded-[1.5rem] border-white/40 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl",
          viewMode === 'grid' ? "flex flex-col h-full" : "flex flex-col md:flex-row h-auto w-full items-center"
        )} 
        onClick={() => navigate(`/imoveis/${id}`)}
      >
        <motion.div 
          layout
          className={cn(
            "relative bg-muted/20 overflow-hidden shrink-0",
            viewMode === 'grid' ? "h-56 w-full" : "h-44 w-full md:w-72"
          )}
        >
          {images && images.length > 0 ? (
            <Carousel className="w-full h-full" opts={{ loop: true }}>
              <CarouselContent className="h-full ml-0">
                {images.map((img, idx) => (
                  <CarouselItem key={idx} className={cn("pl-0 relative min-w-full", "h-full")}>
                    <motion.img 
                      layout
                      src={img} 
                      alt={`${title} - ${idx + 1}`} 
                      className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-105 cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/imoveis/${id}`);
                      }}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <div className="absolute inset-0 pointer-events-none group-hover:pointer-events-auto flex items-center justify-between px-2">
                  <CarouselPrevious className="static translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-white/10 hover:bg-white/30 backdrop-blur-md border-white/20 text-white h-7 w-7 pointer-events-auto" />
                  <CarouselNext className="static translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-white/10 hover:bg-white/30 backdrop-blur-md border-white/20 text-white h-7 w-7 pointer-events-auto" />
                </div>
              )}
            </Carousel>
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-muted/20 to-muted/40">
              <Building2 className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}

          {/* Badges Flutuantes */}
          <motion.div layout className="absolute top-4 left-4 right-4 flex justify-between items-start z-20 pointer-events-none">
            {code && (
              <Badge className="bg-black/80 backdrop-blur-xl text-white border-white/20 font-heading font-black shadow-2xl text-[8px] px-2 py-1 rounded-lg uppercase tracking-tight">
                #{code}
              </Badge>
            )}
            
            {business && (
              <Badge className={cn(
                "border-none font-heading font-black shadow-2xl text-[8px] px-3 py-1 rounded-lg backdrop-blur-xl uppercase tracking-tight",
                business === '93' ? "bg-emerald-500/90 text-white" : "bg-amber-500/90 text-white"
              )}>
                {business === '93' ? 'VENDA' : 'ALUGUEL'}
              </Badge>
            )}
          </motion.div>
        </motion.div>
        
        <motion.div 
          layout
          className={cn(
            "p-5 flex flex-col flex-1 relative justify-center min-w-0",
            viewMode === 'grid' ? "" : "md:px-8 md:py-4"
          )}
        >
          <motion.div layout className="space-y-3">
            <motion.h3 layout className="font-heading font-black text-lg text-foreground line-clamp-1 leading-[1.1] group-hover:text-primary transition-colors uppercase italic tracking-tight" title={title}>
              {title}
            </motion.h3>
            
            <motion.div layout className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                <MapPin className="h-3 w-3 text-primary" />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider truncate">
                {district ? `${district}${city ? `, ${city}` : ''}` : 'Localização sob consulta'}
              </span>
            </motion.div>
          </motion.div>

          <motion.div 
            layout
            className={cn(
              "mt-5 pt-5 border-t border-border/40 dark:border-white/10 flex flex-col gap-4",
              viewMode === 'grid' ? "mt-auto" : ""
            )}
          >
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.1em] text-muted-foreground/40 leading-none mb-1">Investimento Privilegiado</span>
              <div className="text-xl font-heading font-black text-primary tracking-tighter truncate leading-none">
                {price || 'Sob Consulta'}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {bedrooms && (
                <div className="flex items-center gap-1.5 shrink-0 group/icon" title="Dormitórios">
                  <div className="bg-zinc-900/5 dark:bg-white/5 p-1.5 rounded-lg text-muted-foreground group-hover/icon:text-primary group-hover/icon:bg-primary/10 transition-colors">
                    <Bed className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground/80">{bedrooms}</span>
                </div>
              )}
              {bathrooms && (
                <div className="flex items-center gap-1.5 shrink-0 group/icon" title="Sanitários">
                  <div className="bg-zinc-900/5 dark:bg-white/5 p-1.5 rounded-lg text-muted-foreground group-hover/icon:text-primary group-hover/icon:bg-primary/10 transition-colors">
                    <Bath className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground/80">{bathrooms}</span>
                </div>
              )}
              {area && (
                <div className="flex items-center gap-1.5 shrink-0 group/icon" title="Metragem">
                  <div className="bg-zinc-900/5 dark:bg-white/5 p-1.5 rounded-lg text-muted-foreground group-hover/icon:text-primary group-hover/icon:bg-primary/10 transition-colors">
                    <Ruler className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground/80">{area}m²</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
