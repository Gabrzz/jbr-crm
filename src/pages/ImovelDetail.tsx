import { AppLayout } from '@/components/AppLayout';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Pencil, 
  Trash, 
  Bed, 
  Bath, 
  Ruler, 
  ArrowLeft, 
  Loader2, 
  MapPin, 
  Hash, 
  User as UserIcon, 
  Phone, 
  FileText, 
  BarChart, 
  ExternalLink, 
  Calendar, 
  Maximize2,
  X 
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchProperty, deleteProperty, WPProperty } from '@/lib/wpApi';
import { useImoveis } from '@/hooks/useImoveis';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePropertyBroker, useBrokerStats, useAssignPropertyBroker } from '@/hooks/usePropertyBrokers';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ImovelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<WPProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const { imoveis = [] } = useImoveis();
  const { data: broker } = usePropertyBroker(Number(id));
  const { data: brokerStats } = useBrokerStats(broker?.id);
  const { mutateAsync: assignBroker } = useAssignPropertyBroker();

  const [mainApi, setMainApi] = useState<CarouselApi>();
  const [fullApi, setFullApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!id) return;
    const loadProp = async () => {
      setLoading(true);
      try {
        const data = await fetchProperty(Number(id));
        setProperty(data);
      } catch (err) {
        toast.error('Erro ao buscar as informações deste imóvel.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProp();
  }, [id]);

  useEffect(() => {
    if (!mainApi) return;
    mainApi.on('select', () => {
      setCurrentSlide(mainApi.selectedScrollSnap());
    });
  }, [mainApi]);

  useEffect(() => {
    if (!fullApi) return;
    fullApi.on('select', () => {
      setCurrentSlide(fullApi.selectedScrollSnap());
    });
  }, [fullApi]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Tem certeza que deseja excluir permanentemente este imóvel?')) return;
    setDeleting(true);
    try {
      // Clean up Supabase assignment first
      await assignBroker({ propertyId: Number(id), brokerId: null });
      
      await deleteProperty(Number(id));
      toast.success('Imóvel excluído com sucesso!');
      navigate('/imoveis');
    } catch (err) {
      toast.error('Falha ao excluir o imóvel.');
      console.error(err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-3">Carregando detalhes do imóvel...</span>
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <p className="text-muted-foreground mb-4">Imóvel não encontrado.</p>
          <Button onClick={() => navigate('/imoveis')}>Voltar para Imóveis</Button>
        </div>
      </AppLayout>
    );
  }

  const { title, content, price_property, bedrooms_property, bathrooms_property, total_area_property, resolved_images, code_property, address_property, class_list, link } = property;

  // Derive city from class_list taxonomy tags
  const cityFromClass = class_list
    ?.find(c => c.startsWith('tax_city-'))
    ?.replace('tax_city-', '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const districtFromClass = class_list
    ?.find(c => c.startsWith('tax_district-'))
    ?.replace('tax_district-', '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const locationLabel = address_property || [districtFromClass, cityFromClass].filter(Boolean).join(', ');

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20 pt-6 px-4 sm:px-0">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ x: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/imoveis')}
              className="h-12 w-12 rounded-2xl bg-white/40 dark:bg-black/20 border border-white/20 flex items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold text-[10px] tracking-widest px-2 py-0 uppercase">Detalhes da Propriedade</Badge>
                {code_property && <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">REF: {code_property}</span>}
              </div>
              <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight leading-tight">{title.rendered || 'Sem título'}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="h-12 px-6 rounded-2xl border-white/20 bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 font-bold text-sm shadow-sm transition-all"
              onClick={() => navigate(`/imoveis/${id}/editar`)}
            >
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button 
              variant="destructive" 
              className="h-12 px-6 rounded-2xl font-bold text-sm shadow-lg shadow-destructive/10 transition-all"
              onClick={handleDelete} 
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4 mr-2" />} Excluir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content (Left) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Gallery Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel border-white/40 rounded-[2.5rem] overflow-hidden shadow-2xl relative group bg-black/5 dark:bg-white/5"
            >
              <div className="aspect-[16/10] bg-muted relative">
                {resolved_images && resolved_images.length > 0 ? (
                  <Carousel className="w-full h-full" opts={{ loop: true, startIndex: currentSlide }} setApi={setMainApi}>
                    <CarouselContent className="h-full ml-0">
                      {resolved_images.map((img, idx) => (
                        <CarouselItem key={idx} className="pl-0 h-full relative min-w-full">
                          <img 
                            src={img} 
                            alt={`${title.rendered} - foto ${idx + 1}`} 
                            className="w-full h-full object-cover" 
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {resolved_images.length > 1 && (
                      <>
                        <CarouselPrevious className="left-6 h-12 w-12 bg-white/20 hover:bg-white/40 backdrop-blur-xl border-white/30 text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                        <CarouselNext className="right-6 h-12 w-12 bg-white/20 hover:bg-white/40 backdrop-blur-xl border-white/30 text-white opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                      </>
                    )}
                  </Carousel>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/30">
                    <Building2 className="h-24 w-24 mb-4 opacity-20" />
                    <span className="font-heading font-bold uppercase tracking-widest text-xs">Galeria indisponível</span>
                  </div>
                )}
                
                {/* Floating Overlay Info */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-20">
                  <div className="flex flex-col gap-2">
                    {property.business_property && (
                      <Badge className={cn(
                        "font-heading font-extrabold text-[10px] tracking-widest px-4 py-1.5 rounded-xl backdrop-blur-xl shadow-lg border-white/20",
                        property.business_property === '93' ? "bg-emerald-500/80 text-white" : "bg-amber-500/80 text-white"
                      )}>
                        {property.business_property === '93' ? 'PARA VENDA' : 'PARA ALUGUEL'}
                      </Badge>
                    )}
                    {code_property && (
                      <div className="bg-black/40 backdrop-blur-xl text-white/90 border border-white/20 px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest shadow-lg">
                        ID: {code_property}
                      </div>
                    )}
                  </div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsFullscreen(true)}
                    className="bg-white/20 backdrop-blur-xl p-3 rounded-2xl border border-white/30 text-white shadow-lg cursor-pointer pointer-events-auto hover:bg-white/30 transition-all"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Description Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel border-white/40 rounded-[2.5rem] p-8 lg:p-10 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="font-heading font-extrabold text-2xl text-foreground tracking-tight">Sobre este Imóvel</h2>
              </div>
              
              {content?.rendered ? (
                <div 
                  className="text-foreground/80 text-lg leading-relaxed prose prose-lg dark:prose-invert max-w-none font-medium
                    prose-p:mb-6 prose-strong:text-primary prose-strong:font-bold
                  "
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.rendered) }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-3xl border border-dashed">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-medium italic">Nenhuma descrição detalhada foi fornecida para este imóvel.</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar Info (Right) */}
          <div className="lg:col-span-4 space-y-8">
            {/* Price & Primary Info Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel border-white/40 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              
              <div className="space-y-6 relative z-10">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-2 block">Investimento</span>
                  <div className="text-4xl font-heading font-black text-primary tracking-tighter leading-none">
                    {price_property ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(price_property)) : 'Sob consulta'}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border/40">
                  {locationLabel && (
                    <div className="flex gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest block mb-1">Localização</span>
                        <p className="text-sm font-bold text-foreground leading-snug">{locationLabel}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="glass-card border-white/30 p-4 rounded-2xl flex flex-col items-center text-center group hover:bg-primary/5 transition-all">
                      <Bed className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xl font-heading font-black text-foreground">{bedrooms_property || 0}</span>
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Quartos</span>
                    </div>
                    <div className="glass-card border-white/30 p-4 rounded-2xl flex flex-col items-center text-center group hover:bg-primary/5 transition-all">
                      <Bath className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xl font-heading font-black text-foreground">{bathrooms_property || 0}</span>
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Banheiros</span>
                    </div>
                    <div className="glass-card border-white/30 p-4 rounded-2xl col-span-2 flex items-center justify-between group hover:bg-primary/5 transition-all px-6">
                      <div className="flex items-center gap-3">
                        <Ruler className="h-5 w-5 text-primary group-hover:rotate-45 transition-transform" />
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Área Total</span>
                      </div>
                      <span className="text-xl font-heading font-black text-foreground">{total_area_property || 0}m²</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-xl shadow-primary/20 transition-all mt-4 animate-in fade-in slide-in-from-bottom-2"
                  onClick={() => link && window.open(link, '_blank')}
                  disabled={!link}
                >
                  <ExternalLink className="h-5 w-5 mr-3" /> Visualizar Imóvel no site
                </Button>
              </div>
            </motion.div>

            {/* Broker Section */}
            {broker && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-panel border-white/40 rounded-[2.5rem] p-8 shadow-xl"
              >
                <div className="text-center mb-6">
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-4 block">Corretor Responsável</span>
                  <div className="relative inline-block">
                    <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 p-1 border-2 border-white/40 shadow-inner overflow-hidden mb-4">
                      {broker.avatar_url ? (
                        <img src={broker.avatar_url} alt={broker.name} className="h-full w-full object-cover rounded-[1.8rem]" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-heading font-black text-3xl rounded-[1.8rem]">
                          {broker.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-4 right-0 h-5 w-5 bg-green-500 border-4 border-white dark:border-[#1a1a1a] rounded-full shadow-sm" />
                  </div>
                  <h3 className="text-xl font-heading font-extrabold text-foreground tracking-tight">{broker.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{broker.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-primary/[0.03] rounded-2xl border border-primary/5 text-center">
                    <span className="text-xs font-bold text-muted-foreground/60 block mb-1">Imóveis</span>
                    <span className="text-xl font-heading font-black text-primary">
                      {brokerStats?.propertyIds?.filter((pid: number) => imoveis.some(img => img.id === pid)).length || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-primary/[0.03] rounded-2xl border border-primary/5 text-center">
                    <span className="text-xs font-bold text-muted-foreground/60 block mb-1">Leads</span>
                    <span className="text-xl font-heading font-black text-primary">{brokerStats?.leadsAssigned || 0}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {broker.phone && (
                    <Button 
                      className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                      onClick={() => window.open(`https://wa.me/${broker.phone.replace(/\D/g, '')}`, '_blank')}
                    >
                      <Phone className="h-4 w-4 mr-2" /> Contato via WhatsApp
                    </Button>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 rounded-xl border-white/20 font-bold text-sm">
                        <BarChart className="h-4 w-4 mr-2" /> Mais Detalhes
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-6 glass-panel border-white/40 shadow-2xl rounded-3xl" align="center">
                      <h4 className="font-heading font-bold text-lg mb-4">Informações Adicionais</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>Ativo desde Outubro 2023</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span>Especialista em Alto Padrão</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-4 md:p-10"
          >
            {/* Glassy Background Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[30px]"
            />
            
            {/* Vignette/Fading Effect */}
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{ 
                background: 'radial-gradient(circle, transparent 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.6) 100%)' 
              }} 
            />

            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setIsFullscreen(false)}
              className="absolute top-8 right-8 h-12 w-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border border-white/10 backdrop-blur-xl transition-all z-[160] shadow-2xl"
            >
              <X className="h-6 w-6" />
            </motion.button>

            <div className="w-full max-w-7xl h-full flex flex-col justify-center relative z-[155]">
              <Carousel className="w-full h-full flex flex-col justify-center" opts={{ loop: true, startIndex: currentSlide }} setApi={setFullApi}>
                <CarouselContent className="h-full ml-0">
                  {resolved_images && resolved_images.map((img, idx) => (
                    <CarouselItem key={idx} className="pl-0 h-full flex items-center justify-center min-w-full">
                      <motion.img 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        src={img} 
                        alt={`${title.rendered} - vista ampliada ${idx + 1}`} 
                        className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/5" 
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {resolved_images && resolved_images.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-4 md:px-10">
                    <CarouselPrevious className="static h-16 w-16 bg-white/5 hover:bg-white/10 backdrop-blur-xl border-white/10 text-white pointer-events-auto -translate-x-0 shadow-2xl" />
                    <CarouselNext className="static h-16 w-16 bg-white/5 hover:bg-white/10 backdrop-blur-xl border-white/10 text-white pointer-events-auto translate-x-0 shadow-2xl" />
                  </div>
                )}
              </Carousel>
              
              {resolved_images && resolved_images.length > 0 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-6 shadow-2xl">
                   <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Navegação Livre</span>
                   <div className="flex gap-2">
                     {resolved_images.map((_, i) => (
                       <div key={i} className={cn("h-1.5 w-1.5 rounded-full transition-all duration-300", i === currentSlide ? "bg-primary w-4" : "bg-white/20")} />
                     ))}
                   </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
