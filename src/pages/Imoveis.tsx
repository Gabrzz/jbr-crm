import { AppLayout } from '@/components/AppLayout';
import { PropertyCard } from '@/components/PropertyCard';
import { useImoveis } from '@/hooks/useImoveis';
import { Loader2, Plus, Search, SlidersHorizontal, Hash, ArrowUpDown, FilterX, MapPin, Home, LayoutGrid, Sparkles, Filter, Zap, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { WPProperty, getTaxonomyTerms } from '@/lib/wpApi';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useAuth } from '@/hooks/useAuth';
import { useMyAssignedProperties, useBrokers } from '@/hooks/usePropertyBrokers';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function Imoveis() {
  const { imoveis, loading: loadingProps, error } = useImoveis();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMeusImoveis = searchParams.get('meus') === 'true';

  const [searchId, setSearchId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [sortBy, setSortBy] = useState('newest'); 
  const [filterBedrooms, setFilterBedrooms] = useState('all');
  const [filterBathrooms, setFilterBathrooms] = useState('all');
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterBroker, setFilterBroker] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { user } = useAuth();
  const { data: brokers } = useBrokers();
  
  const effectiveBrokerId = isMeusImoveis ? user?.id : (filterBroker !== 'all' ? filterBroker : undefined);
  const { data: assignedPropIds, isLoading: loadingAssigned } = useMyAssignedProperties(effectiveBrokerId);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchId, searchName, sortBy, filterBedrooms, filterBathrooms, filterDistrict, itemsPerPage]);

  const getDistrict = (p: WPProperty) => {
    if (p.district_property) return p.district_property;
    if (p.address_property) return p.address_property;
    
    // Fallback para classes de taxonomia se meta não existir
    const districtClass = p.class_list?.find((c: string) => c.startsWith('tax_district-'));
    if (!districtClass) return '';
    
    return districtClass
      .replace('tax_district-', '')
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    getTaxonomyTerms('tax_district')
      .then(terms => setDistricts(terms.map(t => t.name).sort()))
      .catch(console.error);
  }, []);

  const filteredImoveis = useMemo(() => {
    let result = [...imoveis];

    if (effectiveBrokerId) {
      if (!assignedPropIds) return []; 
      result = result.filter(p => assignedPropIds.some(id => Number(id) === Number(p.id)));
    }

    if (searchId.trim()) {
      result = result.filter(p => p.code_property?.toLowerCase().includes(searchId.toLowerCase()));
    }

    if (searchName.trim()) {
      result = result.filter(p => p.title?.rendered.toLowerCase().includes(searchName.toLowerCase()));
    }

    if (filterBedrooms !== 'all') {
      const bedrooms = parseInt(filterBedrooms);
      result = result.filter(p => Number(p.bedrooms_property || 0) === bedrooms || (bedrooms === 5 && Number(p.bedrooms_property || 0) >= 5));
    }

    if (filterBathrooms !== 'all') {
      const bathrooms = parseInt(filterBathrooms);
      result = result.filter(p => Number(p.bathrooms_property || 0) === bathrooms || (bathrooms === 5 && Number(p.bathrooms_property || 0) >= 5));
    }

    if (filterDistrict !== 'all') {
      result = result.filter(p => getDistrict(p) === filterDistrict);
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') return b.id - a.id;
      if (sortBy === 'oldest') return a.id - b.id;
      if (sortBy === 'price_desc') return (Number(b.price_property) || 0) - (Number(a.price_property) || 0);
      if (sortBy === 'price_asc') return (Number(a.price_property) || 0) - (Number(b.price_property) || 0);
      return 0;
    });

    return result;
  }, [imoveis, searchId, searchName, sortBy, filterBedrooms, filterBathrooms, filterDistrict, effectiveBrokerId, assignedPropIds]);

  const totalPages = Math.ceil(filteredImoveis.length / itemsPerPage);
  const paginatedImoveis = filteredImoveis.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AppLayout>
      <div className="space-y-12 animate-fade-in pb-24 pt-10 px-6 max-w-[1700px] mx-auto">
        
        {/* Platinum Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-10 pb-4"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-4xl font-heading font-black tracking-tight text-foreground uppercase italic leading-none">
                {isMeusImoveis ? 'Carteira' : 'Catálogo'} <span className="text-primary not-italic font-light">Imóveis</span>
              </h1>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
              <span className="flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Total de {filteredImoveis.length} Unidades</span>
              <span className="h-3 w-[1px] bg-border/40" />
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Sincronizado com WP</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center bg-zinc-900/5 dark:bg-white/5 border border-border/40 dark:border-white/10 rounded-2xl p-1.5 gap-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn("h-10 px-4 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Grid
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn("h-10 px-4 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  <List className="h-3.5 w-3.5" /> Lista
                </button>
             </div>
             <Button 
               onClick={() => navigate('/imoveis/novo')} 
               className="h-14 px-8 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all border border-white/10 gap-3"
             >
               <Plus className="h-5 w-5" /> Novo Imóvel
             </Button>
          </div>
        </motion.div>

        {/* Global Search & Filters */}
        <div className="relative z-40">
          <motion.div 
            className="glass-panel p-4 rounded-[2.5rem] border-border/40 dark:border-white/10 shadow-3xl flex flex-col md:flex-row items-center gap-4 bg-white/20 dark:bg-white/[0.02]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative w-full md:w-40 group">
              <Hash className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="ID CODE" 
                className="pl-12 h-14 bg-white/40 dark:bg-stone-950/40 border-border/40 dark:border-white/10 rounded-2xl text-foreground dark:text-white font-black uppercase tracking-widest text-[11px] placeholder:text-muted-foreground/40" 
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
              />
            </div>
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Pesquisar por endereço, título ou palavras-chave..." 
                className="pl-12 h-14 bg-white/40 dark:bg-stone-950/40 border-border/40 dark:border-white/10 rounded-2xl text-foreground dark:text-white font-bold placeholder:text-muted-foreground/40" 
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => setShowFilters(!showFilters)} 
              className={cn(
                "h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all gap-3 border border-border/40 dark:border-white/10 shadow-sm",
                showFilters ? "bg-primary text-white" : "bg-white/40 text-foreground hover:bg-white/60 dark:bg-white/5 dark:text-muted-foreground"
              )}
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Fechar Filtros" : "Explorar Refinamentos"}
              <AnimatePresence>
                {showFilters && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-2 w-2 rounded-full bg-white shadow-lg" />}
              </AnimatePresence>
            </Button>
          </motion.div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-full left-0 right-0 mt-6 glass-panel p-10 rounded-[3.5rem] border-border/40 dark:border-white/10 shadow-3xl bg-white/95 dark:bg-zinc-950/90 backdrop-blur-3xl z-50 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-[40%] h-full bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Bairro</Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none" />
                      <select 
                        className="w-full h-14 pl-12 pr-4 rounded-2xl border border-border/40 dark:border-white/10 bg-white/50 dark:bg-white/5 text-xs font-bold text-foreground dark:text-white uppercase tracking-widest focus:ring-2 focus:ring-primary/20 appearance-none pointer-events-auto outline-none transition-all hover:bg-white/10"
                        value={filterDistrict}
                        onChange={e => setFilterDistrict(e.target.value)}
                      >
                        <option value="all">TODOS</option>
                        {districts.map(d => (
                          <option key={d} value={d} className="bg-white dark:bg-zinc-900 border-none">{d.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Priorizar Por</Label>
                    <div className="relative">
                      <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none" />
                      <select 
                        className="w-full h-14 pl-12 pr-4 rounded-2xl border border-border/40 dark:border-white/10 bg-white/50 dark:bg-white/5 text-xs font-bold text-foreground dark:text-white uppercase tracking-widest focus:ring-2 focus:ring-primary/20 appearance-none outline-none transition-all hover:bg-white/10"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                      >
                        <option value="newest" className="bg-white dark:bg-zinc-900 uppercase">Últimos Lançamentos</option>
                        <option value="oldest" className="bg-white dark:bg-zinc-900 uppercase">Antiguidade</option>
                        <option value="price_desc" className="bg-white dark:bg-zinc-900 uppercase">Valor: Decrescente</option>
                        <option value="price_asc" className="bg-white dark:bg-zinc-900 uppercase">Valor: Crescente</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Quartos</Label>
                    <select 
                      className="w-full h-14 px-6 rounded-2xl border border-border/40 dark:border-white/10 bg-white/50 dark:bg-white/5 text-xs font-bold text-foreground dark:text-white uppercase tracking-widest focus:ring-2 focus:ring-primary/20 appearance-none outline-none transition-all hover:bg-white/10"
                      value={filterBedrooms}
                      onChange={e => setFilterBedrooms(e.target.value)}
                    >
                      <option value="all" className="bg-white dark:bg-zinc-900">Qualquer Qnt.</option>
                      <option value="1" className="bg-white dark:bg-zinc-900">01 Quarto</option>
                      <option value="2" className="bg-white dark:bg-zinc-900">02 Quartos</option>
                      <option value="3" className="bg-white dark:bg-zinc-900">03 Quartos</option>
                      <option value="4" className="bg-white dark:bg-zinc-900">04 Quartos</option>
                      <option value="5" className="bg-white dark:bg-zinc-900">05+ Quartos</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Banheiros</Label>
                    <select 
                      className="w-full h-14 px-6 rounded-2xl border border-border/40 dark:border-white/10 bg-white/50 dark:bg-white/5 text-xs font-bold text-foreground dark:text-white uppercase tracking-widest focus:ring-2 focus:ring-primary/20 appearance-none outline-none transition-all hover:bg-white/10"
                      value={filterBathrooms}
                      onChange={e => setFilterBathrooms(e.target.value)}
                    >
                      <option value="all" className="bg-white dark:bg-zinc-900">INDIFERENTE</option>
                      <option value="1" className="bg-white dark:bg-zinc-900">01 Banheiro</option>
                      <option value="2" className="bg-white dark:bg-zinc-900">02 Banheiros</option>
                      <option value="3" className="bg-white dark:bg-zinc-900">03 Banheiros</option>
                      <option value="4" className="bg-white dark:bg-zinc-900">04 Banheiros</option>
                      <option value="5" className="bg-white dark:bg-zinc-900">05+ Banheiros</option>
                    </select>
                  </div>

                  {!isMeusImoveis && brokers && brokers.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Corretor</Label>
                      <select 
                        className="w-full h-14 px-6 rounded-2xl border border-border/40 dark:border-white/10 bg-white/50 dark:bg-white/5 text-xs font-bold text-foreground dark:text-white uppercase tracking-widest focus:ring-2 focus:ring-primary/20 appearance-none outline-none transition-all hover:bg-white/10"
                        value={filterBroker}
                        onChange={e => setFilterBroker(e.target.value)}
                      >
                        <option value="all" className="bg-white dark:bg-zinc-900">TODOS</option>
                        {brokers.map(b => (
                          <option key={b.id} value={b.id} className="bg-white dark:bg-zinc-900">{b.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-end">
                    <Button 
                      variant="ghost" 
                      className="w-full h-14 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all gap-2 border border-dashed border-border/40 dark:border-white/10"
                      onClick={() => {
                        setSearchId('');
                        setSearchName('');
                        setSortBy('newest');
                        setFilterBedrooms('all');
                        setFilterBathrooms('all');
                        setFilterDistrict('all');
                        setFilterBroker('all');
                        setItemsPerPage(20);
                      }}
                    >
                      <FilterX className="h-4 w-4" /> Limpar Parâmetros
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Content Grid */}
        <div className="relative min-h-[60vh] space-y-12">
          { (loadingProps || (effectiveBrokerId && loadingAssigned)) ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-t-2 border-primary animate-spin" />
                <Zap className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 animate-pulse">Sincronizando Catálogo JBR...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center glass-panel border-red-500/20 bg-red-500/5 rounded-[2.5rem]">
               <h3 className="text-red-500 font-black uppercase tracking-widest">Erro de Sincronização</h3>
               <p className="text-foreground/60 text-xs mt-2">{error}</p>
            </div>
          ) : filteredImoveis.length === 0 ? (
            <div className="p-24 text-center glass-panel border-dashed border-border/40 rounded-[4rem] bg-white/[0.2] dark:bg-white/[0.01] flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 flex items-center justify-center mb-8 border border-border/40 dark:border-white/10 text-foreground/10 dark:text-white/10">
                <Search className="h-10 w-10 stroke-[1px]" />
              </div>
              <p className="text-2xl font-heading font-black text-foreground/50 dark:text-white/50 tracking-tight uppercase italic">Nenhuma Propriedade Detectada</p>
              <p className="text-muted-foreground/60 dark:text-muted-foreground/30 font-bold mt-3 max-w-sm mx-auto uppercase text-[10px] tracking-widest">Ajuste seus refinamentos ou tente uma nova palavra-chave.</p>
            </div>
          ) : (
            <motion.div 
              layout
              transition={{ 
                layout: { type: "spring", stiffness: 200, damping: 25 }
              }}
              className={cn(
                "gap-8 transition-all duration-500",
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" 
                  : "flex flex-col max-w-5xl mx-auto"
              )}
            >
              {paginatedImoveis.map((p, idx) => (
                <motion.div 
                   key={p.id}
                   layout
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ 
                     opacity: { duration: 0.2, delay: idx * 0.02 },
                     y: { duration: 0.3, delay: idx * 0.02 },
                     layout: { type: "spring", stiffness: 200, damping: 25 }
                   }}
                >
                  <PropertyCard
                    id={p.id}
                    title={p.title?.rendered || 'Sem título'}
                    price={p.price_property ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.price_property)) : 'Sob consulta'}
                    bedrooms={p.bedrooms_property ? String(p.bedrooms_property) : '0'}
                    bathrooms={p.bathrooms_property ? String(p.bathrooms_property) : '0'}
                    area={p.total_area_property ? String(p.total_area_property) : '0'}
                    images={p.resolved_images || []}
                    business={p.business_property ? String(p.business_property) : undefined}
                    code={p.code_property}
                    district={getDistrict(p)}
                    city={p.city_property}
                    viewMode={viewMode}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Premium Pagination */}
          {totalPages > 1 && !loadingProps && (
            <div className="pt-16 pb-12">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                  <div className="glass-panel px-6 py-3 rounded-full border-border/40 dark:border-white/10 shadow-2xl bg-white/40 dark:bg-white/[0.02] flex items-center gap-6">
                     <Pagination>
                        <PaginationContent className="gap-2">
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); setCurrentPage(prev => Math.max(prev - 1, 1)); }}
                              className={cn(
                                "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                currentPage === 1 ? 'pointer-events-none opacity-20' : 'hover:bg-primary/10 cursor-pointer text-foreground'
                              )}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: totalPages }).map((_, i) => (
                            <PaginationItem key={i}>
                              <PaginationLink 
                                href="#" 
                                isActive={currentPage === i + 1}
                                onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                                className={cn(
                                  "h-10 w-10 rounded-xl text-[10px] font-black transition-all",
                                  currentPage === i + 1 ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-primary/10"
                                )}
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}

                          <PaginationItem>
                            <PaginationNext 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); setCurrentPage(prev => Math.min(prev + 1, totalPages)); }}
                              className={cn(
                                "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                currentPage === totalPages ? 'pointer-events-none opacity-20' : 'hover:bg-primary/10 cursor-pointer text-foreground'
                              )}
                            />
                          </PaginationItem>
                        </PaginationContent>
                     </Pagination>
                  </div>
               </motion.div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
