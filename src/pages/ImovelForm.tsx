import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, UploadCloud, X, Plus, MapPin, Home } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchProperties, fetchProperty, updateProperty, createProperty, uploadMedia, getDifferentials, getTaxonomyTerms, createTaxonomyTerm, WPProperty } from '@/lib/wpApi';
import { toast } from 'sonner';
import { useBrokers, usePropertyBroker, useAssignPropertyBroker } from '@/hooks/usePropertyBrokers';
import { useAuth } from '@/hooks/useAuth';

export default function ImovelForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'novo';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // IDs inteiros das imagens já salvas no WordPress
  const [existingImageIds, setExistingImageIds] = useState<number[]>([]);
  // URLs para preview das imagens já salvas
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    code_property: '',
    price_property: '',
    bedrooms_property: '',
    bathrooms_property: '',
    suites_property: '',
    garages_property: '',
    rooms_property: '',
    total_area_property: '',
    built_area_property: '',
    type_property: '',
    business_property: '',
    status: 'publish',
    address_property: '',
    district_property: '',
    city_property: 'Patrocínio',
    state_property: 'Minas Gerais',
  });

  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  
  const [showAddDistrict, setShowAddDistrict] = useState(false);
  const [showAddCity, setShowAddCity] = useState(false);
  const [showAddState, setShowAddState] = useState(false);
  
  const [newItemName, setNewItemName] = useState('');

  // Broker hooks
  const { user, profile } = useAuth();
  const { data: brokers } = useBrokers();
  const { data: currentBroker } = usePropertyBroker(isEditing ? Number(id) : undefined);
  const { mutateAsync: assignBroker } = useAssignPropertyBroker();
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');

  useEffect(() => {
    if (isEditing) {
      if (currentBroker) {
        setSelectedBrokerId(currentBroker.id);
      }
    } else {
      if (user?.id) {
        setSelectedBrokerId(user.id);
      }
    }
  }, [currentBroker, isEditing, user?.id]);

  // Ensure default broker selection when not editing
  useEffect(() => {
    if (!isEditing && !selectedBrokerId && brokers?.length) {
      const userBroker = brokers.find(b => b.id === user?.id);
      setSelectedBrokerId(userBroker?.id ?? brokers[0].id);
    }
  }, [brokers, isEditing, selectedBrokerId, user?.id]);

  const getFromClassList = (p: WPProperty, prefix: string) => {
    const found = p.class_list?.find(c => c.startsWith(prefix));
    if (!found) return '';
    return found
      .replace(prefix, '')
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const [files, setFiles] = useState<File[]>([]);


  useEffect(() => {
    const initForm = async () => {
      setLoading(true);
      try {
        if (isEditing) {
          const data = await fetchProperty(Number(id));
          // Preservar IDs inteiros das imagens existentes
          setExistingImageIds(Array.isArray(data.images_property) ? data.images_property.map(Number) : []);
          // URLs para preview
          setExistingImageUrls(Array.isArray(data.resolved_images) ? data.resolved_images : []);
          setFormData({
            title: data.title?.rendered || '',
            content: (data.content as Record<string, string>)?.raw || data.content?.rendered?.replace(/<\/?[^>]+(>|$)/g, "") || '',
            code_property: data.code_property || '',
            price_property: data.price_property || '',
            bedrooms_property: String(data.bedrooms_property || ''),
            bathrooms_property: String(data.bathrooms_property || ''),
            suites_property: String(data.suites_property || ''),
            garages_property: String(data.garages_property || ''),
            rooms_property: String(data.rooms_property || ''),
            total_area_property: String(data.total_area_property || ''),
            built_area_property: String(data.built_area_property || ''),
            type_property: String(data.type_property || ''),
            business_property: String(data.business_property || ''),
            status: data.status || 'publish',
            address_property: data.address_property || '',
            district_property: data.district_property || '',
            city_property: data.city_property || 'Patrocínio',
            state_property: data.state_property || 'Minas Gerais',
          });
        }
        
        // Sempre buscar alguns imóveis recentes para carregar os bairros/cidades/estados existentes no WordPress
        const sampleProps = await fetchProperties({ per_page: 100 });
        
        if (!isEditing) {
          let maxCode = 0;
          sampleProps.forEach(p => {
             const c = parseInt(p.code_property || '0', 10);
             if (!isNaN(c) && c > maxCode) maxCode = c;
          });
          setFormData(prev => ({ ...prev, code_property: String(maxCode + 1) }));
        }

        const [distList, cityList, stateList] = await Promise.all([
          getTaxonomyTerms('tax_district'),
          getTaxonomyTerms('tax_city'),
          getTaxonomyTerms('tax_state')
        ]);

        setDistricts(distList.map(t => t.name).sort());
        setCities(cityList.map(t => t.name).sort());
        setStates(stateList.map(t => t.name).sort());


      } catch (err) {
        toast.error('Erro ao preparar formulário.');
      } finally {
        setLoading(false);
      }
    };
    initForm();
  }, [id, isEditing, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let assignedPropId = Number(id);

      // 1. Montar payload com dados básicos (sem imagens)
      const payloadBase = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        code_property: formData.code_property,
        price_property: formData.price_property,
        bedrooms_property: Number(formData.bedrooms_property),
        bathrooms_property: Number(formData.bathrooms_property),
        suites_property: Number(formData.suites_property),
        garages_property: Number(formData.garages_property),
        rooms_property: Number(formData.rooms_property),
        total_area_property: Number(formData.total_area_property),
        built_area_property: Number(formData.built_area_property),
        type_measurements: 'square_meters',
        type_property: formData.type_property,
        business_property: formData.business_property,
        address_property: formData.address_property,
        district_property: formData.district_property,
        city_property: formData.city_property,
        state_property: formData.state_property,
      };

      // Se for NOVO imóvel, cria ele primeiro (sem imagens) para gerarmos o ID oficial no WordPress
      if (!isEditing) {
        const created = await createProperty({ ...payloadBase, status: 'draft' }); // cria como rascunho temporário
        assignedPropId = created.id;
      }

      // 2. Fazer upload de cada arquivo novo e associar ao ID pai (assignedPropId)
      let uploadedIds: number[] = [];
      if (files.length > 0) {
        setUploading(true);
        uploadedIds = await Promise.all(
          files.map(async (file) => {
            const media = await uploadMedia(file, assignedPropId);
            return media.id; // ID inteiro retornado pelo WordPress
          })
        );
        setUploading(false);
      }

      // 3. Combinar IDs já existentes com os novos
      const allImageIds = [...existingImageIds, ...uploadedIds];

      // 4. Montagem do payload final (com as imagens atreladas)
      const finalPayload = {
        ...payloadBase,
        status: formData.status, // Restaura o status real (ex: publish)
        images_property: allImageIds, // array de IDs inteiros no root
        featured_media: allImageIds.length > 0 ? allImageIds[0] : 0, // Define a primeira foto como a Imagem Destacada
      };

      // 5. Atualiza o banco do Wordpress com todos os dados finais
      await updateProperty(assignedPropId, finalPayload);
      
      if (isEditing) {
        toast.success('Imóvel atualizado com sucesso!');
      } else {
        toast.success('Imóvel criado com sucesso!');
      }

      // 4. Atribuir Corretor no Banco Supabase (property_brokers)
      if (selectedBrokerId) {
        await assignBroker({ propertyId: assignedPropId, brokerId: selectedBrokerId });
      } else {
        await assignBroker({ propertyId: assignedPropId, brokerId: null });
      }

      navigate('/imoveis');
    } catch (err) {
      toast.error('Ocorreu um erro ao salvar o imóvel.');
      console.error(err);
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  const removeResolvedImage = (idx: number) => {
    // Remove pelo índice para manter IDs e URLs sincronizados
    setExistingImageIds(prev => prev.filter((_, i) => i !== idx));
    setExistingImageUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Editar Imóvel' : 'Novo Imóvel'}
          </h1>
        </div>

        <form onSubmit={handleSave}>
          <Card>
            <CardHeader><CardTitle>Informações Principais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="title">Título do Imóvel</Label>
                  <Input 
                    id="title" 
                    required 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="Ex: Apartamento 2 quartos no Centro" 
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="code">Cód de Ref</Label>
                  <Input 
                    id="code" 
                    required
                    value={formData.code_property} 
                    onChange={e => setFormData({...formData, code_property: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Descrição do Imóvel</Label>
                <Textarea 
                  id="content" 
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})} 
                  placeholder="Descreva os detalhes, diferenciais e informações sobre o imóvel..." 
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status do Imóvel</Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="publish">Publicado</option>
                    <option value="draft">Rascunho</option>
                    <option value="private">Privado</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="broker">Corretor Responsável</Label>
                  <select
                    id="broker"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                    value={selectedBrokerId || (!isEditing && user?.id ? user.id : '')}
                    onChange={e => setSelectedBrokerId(e.target.value)}
                  >
                    <option value="">- Sem corretor -</option>
                    {brokers?.map(broker => (
                      <option key={broker.id} value={`${broker.id}`}>
                        {broker.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 py-6 border-t border-blue-300">
                <div className="flex items-center gap-2 py-2 rounded-md">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-md">Localização</h4>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input 
                    id="address" 
                    value={formData.address_property} 
                    onChange={e => setFormData({...formData, address_property: e.target.value})} 
                    placeholder="Rua, número, complemento" 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="district">Bairro</Label>
                    <div className="flex gap-1">
                      <select 
                        id="district"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                        value={formData.district_property}
                        onChange={e => setFormData({...formData, district_property: e.target.value})}
                      >
                        <option value="">- Selecionar -</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setShowAddDistrict(!showAddDistrict); setNewItemName(''); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {showAddDistrict && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 p-3 bg-popover border rounded-md shadow-md animate-in fade-in zoom-in duration-200">
                        <Input 
                          placeholder="Novo bairro..." 
                          value={newItemName} 
                          onChange={e => setNewItemName(e.target.value)}
                          className="mb-2"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddDistrict(false)}>Cancelar</Button>
                          <Button size="sm" type="button" onClick={async () => {
                            if (newItemName.trim()) {
                              try {
                                await createTaxonomyTerm('tax_district', newItemName.trim());
                                setDistricts(prev => Array.from(new Set([...prev, newItemName.trim()])).sort());
                                setFormData({...formData, district_property: newItemName.trim()});
                                setShowAddDistrict(false);
                                toast.success('Bairro adicionado no WordPress!');
                              } catch (err) {
                                toast.error('Erro ao salvar bairro. Pode já existir.');
                              }
                            }
                          }}>Adicionar</Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="city">Cidade</Label>
                    <div className="flex gap-1">
                      <select 
                        id="city"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                        value={formData.city_property}
                        onChange={e => setFormData({...formData, city_property: e.target.value})}
                      >
                        <option value="">- Selecionar -</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setShowAddCity(!showAddCity); setNewItemName(''); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {showAddCity && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 p-3 bg-popover border rounded-md shadow-md animate-in fade-in zoom-in duration-200">
                        <Input 
                          placeholder="Nova cidade..." 
                          value={newItemName} 
                          onChange={e => setNewItemName(e.target.value)}
                          className="mb-2"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddCity(false)}>Cancelar</Button>
                          <Button size="sm" type="button" onClick={async () => {
                            if (newItemName.trim()) {
                              try {
                                await createTaxonomyTerm('tax_city', newItemName.trim());
                                setCities(prev => Array.from(new Set([...prev, newItemName.trim()])).sort());
                                setFormData({...formData, city_property: newItemName.trim()});
                                setShowAddCity(false);
                                toast.success('Cidade adicionada no WordPress!');
                              } catch (err) {
                                toast.error('Erro ao salvar cidade.');
                              }
                            }
                          }}>Adicionar</Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="state">Estado</Label>
                    <div className="flex gap-1">
                      <select 
                        id="state"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                        value={formData.state_property}
                        onChange={e => setFormData({...formData, state_property: e.target.value})}
                      >
                        <option value="">- Selecionar -</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setShowAddState(!showAddState); setNewItemName(''); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {showAddState && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 p-3 bg-popover border rounded-md shadow-md animate-in fade-in zoom-in duration-200">
                        <Input 
                          placeholder="Novo estado..." 
                          value={newItemName} 
                          onChange={e => setNewItemName(e.target.value)}
                          className="mb-2"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddState(false)}>Cancelar</Button>
                          <Button size="sm" type="button" onClick={async () => {
                            if (newItemName.trim()) {
                              try {
                                await createTaxonomyTerm('tax_state', newItemName.trim());
                                setStates(prev => Array.from(new Set([...prev, newItemName.trim()])).sort());
                                setFormData({...formData, state_property: newItemName.trim()});
                                setShowAddState(false);
                                toast.success('Estado adicionado no WordPress!');
                              } catch (err) {
                                toast.error('Erro ao salvar estado.');
                              }
                            }
                          }}>Adicionar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 mt-6 border-t border-blue-300">
                <div className="flex items-center gap-2 py-2 rounded-md">
                  <Home className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-md">Dados do Imóvel</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="price">Valor (R$)</Label>
                    <Input 
                      id="price" 
                      value={formData.price_property} 
                      onChange={e => setFormData({...formData, price_property: e.target.value})} 
                      placeholder="Ex: 450000" 
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="business">Finalidade</Label>
                    <select 
                      id="business"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                      value={formData.business_property}
                      onChange={e => setFormData({...formData, business_property: e.target.value})}
                    >
                      <option value="">- Selecionar -</option>
                      <option value="93">Venda</option>
                      <option value="19">Aluguel</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type_prop">Tipo de Imóvel</Label>
                  <select 
                    id="type_prop"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                    value={formData.type_property}
                    onChange={e => setFormData({...formData, type_property: e.target.value})}
                  >
                    <option value="">- Selecionar -</option>
                    <optgroup label="Residenciais">
                      <option value="3">Apartamentos</option>
                      <option value="105">Casas</option>
                      <option value="104">Casa de Campo</option>
                      <option value="106">Cobertura Duplex</option>
                      <option value="108">Loft Moderno</option>
                    </optgroup>
                    <optgroup label="Comerciais">
                      <option value="83">Salas Comerciais</option>
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_area">Área Útil</Label>
                  <div className="relative">
                    <Input 
                      id="total_area" 
                      type="number"
                      min="0"
                      step="any"
                      className="pr-10"
                      value={formData.total_area_property} 
                      onChange={e => setFormData({...formData, total_area_property: e.target.value})} 
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground pointer-events-none">m²</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="built_area">Área Construída</Label>
                  <div className="relative">
                    <Input 
                      id="built_area" 
                      type="number"
                      min="0"
                      step="any"
                      className="pr-10"
                      value={formData.built_area_property} 
                      onChange={e => setFormData({...formData, built_area_property: e.target.value})} 
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground pointer-events-none">m²</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rooms">Salas</Label>
                  <Input 
                    id="rooms" 
                    type="number" 
                    value={formData.rooms_property} 
                    onChange={e => setFormData({...formData, rooms_property: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Quartos</Label>
                  <Input 
                    id="bedrooms" 
                    type="number" 
                    value={formData.bedrooms_property} 
                    onChange={e => setFormData({...formData, bedrooms_property: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suites">Suítes</Label>
                  <Input 
                    id="suites" 
                    type="number" 
                    value={formData.suites_property} 
                    onChange={e => setFormData({...formData, suites_property: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input 
                    id="bathrooms" 
                    type="number" 
                    value={formData.bathrooms_property} 
                    onChange={e => setFormData({...formData, bathrooms_property: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="garages">Garagens</Label>
                  <Input 
                    id="garages" 
                    type="number" 
                    value={formData.garages_property} 
                    onChange={e => setFormData({...formData, garages_property: e.target.value})} 
                  />
                </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle>Imagens</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {existingImageUrls.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-muted group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeResolvedImage(idx)} className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {files.map((file, idx) => (
                  <div key={`file-${idx}`} className="relative aspect-square rounded-md overflow-hidden bg-muted group border border-dashed border-primary">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover opacity-70" />
                    <button type="button" onClick={() => removeFile(idx)} className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 right-1 text-[10px] bg-primary text-white px-1 rounded">Novo</span>
                  </div>
                ))}
                <label className="flex items-center justify-center aspect-square rounded-md border-2 border-dashed hover:bg-muted/50 cursor-pointer transition-colors">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    onChange={e => {
                      if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
                    }}
                  />
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <UploadCloud className="h-6 w-6" />
                    <span className="text-xs font-medium">Anexar</span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => navigate(-1)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Enviando imagens...' : 'Salvando...'}
                </>
              ) : (
                isEditing ? 'Atualizar Imóvel' : 'Salvar Imóvel'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
