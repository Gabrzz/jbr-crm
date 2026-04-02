import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Database } from '@/integrations/supabase/types';

type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadOrigin = Database['public']['Enums']['lead_origin'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LeadInsert) => void;
  profiles: Record<string, string>;
}

export function LeadForm({ open, onClose, onSubmit, profiles }: Props) {
  const { register, handleSubmit, setValue, reset } = useForm<LeadInsert>({
    defaultValues: { name: '', phone: '', email: '', origin: 'site', property_interest: '', operation_type: '', property_code_ref: '', notes: '', expected_value: 0 },
  });

  const submit = (data: LeadInsert) => {
    onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl glass-card border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl p-6 sm:p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-extrabold tracking-tight font-heading text-foreground flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            </span>
            Novo Lead
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div>
            <Label htmlFor="name" className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Nome do Lead *</Label>
            <Input id="name" className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/40 rounded-xl" placeholder="Ex: João da Silva" {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone" className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Telefone</Label>
              <Input id="phone" className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/40 rounded-xl" placeholder="(00) 00000-0000" {...register('phone')} />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Email</Label>
              <Input id="email" type="email" className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/40 rounded-xl" placeholder="joao@exemplo.com" {...register('email')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Origem</Label>
              <Select defaultValue="site" onValueChange={(v) => setValue('origin', v as LeadOrigin)}>
                <SelectTrigger className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus:ring-primary/40 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                  <SelectItem value="site" className="rounded-lg">Site</SelectItem>
                  <SelectItem value="indicacao" className="rounded-lg">Indicação</SelectItem>
                  <SelectItem value="portal" className="rounded-lg">Portal</SelectItem>
                  <SelectItem value="outro" className="rounded-lg">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-[22px]"> {/* Aligns with the Select above that has a label */}
              <Select onValueChange={(v) => setValue('assigned_to', v)}>
                <SelectTrigger className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus:ring-primary/40 rounded-xl">
                  <SelectValue placeholder="Corretor Responsável" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                  {Object.entries(profiles).map(([id, name]) => (
                    <SelectItem key={id} value={id} className="rounded-lg">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="operation_type" className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Tipo de Operação</Label>
              <Input id="operation_type" className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/40 rounded-xl" placeholder="Ex: Compra" {...register('operation_type')} />
            </div>
            <div>
               <Label htmlFor="property_code_ref" className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Cód. Referência Imóvel</Label>
               <Input id="property_code_ref" className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/40 rounded-xl font-mono text-sm" placeholder="Ex: 101" {...register('property_code_ref')} />
            </div>
          </div>
          <div>
            <Label htmlFor="expected_value" className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Valor do Negócio (R$)</Label>
            <Input id="expected_value" type="number" step="0.01" className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/40 rounded-xl" placeholder="Ex: 500000" {...register('expected_value')} />
          </div>
          <div>
            <Label htmlFor="property_interest" className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Interesse Genérico (Opcional)</Label>
            <Input id="property_interest" className="h-11 bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/40 rounded-xl" placeholder="Busca por coberturas..." {...register('property_interest')} />
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-1.5 block">Observações</Label>
            <Textarea id="notes" className="bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/40 rounded-xl resize-none" {...register('notes')} rows={3} placeholder="Escreva observações adicionais..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl hover:bg-black/5 dark:hover:bg-white/5">Cancelar</Button>
            <Button type="submit" className="rounded-xl shadow-lg shadow-primary/20 px-8 font-semibold">Salvar Lead</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
