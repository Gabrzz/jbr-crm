import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Trash2, Plus, UserX, UserCheck, Loader2, KeyRound, Shield, Mail, Phone, MoreHorizontal, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MASTER_ADMIN_EMAIL = 'aleandroantunes@hotmail.com';

export default function Usuarios() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data: profiles = [], isLoading: loadingProfiles } = useProfiles();
  const { data: roles = [] } = useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
    enabled: role === 'admin',
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('corretor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  if (role !== 'admin') return <Navigate to="/dashboard" replace />;

  const getRoleBadge = (userId: string) => {
    const r = roles.find((r) => r.user_id === userId);
    if (!r) return <Badge variant="outline">Sem role</Badge>;
    const colors: Record<string, string> = {
      admin: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
      gerente: 'bg-primary text-primary-foreground hover:bg-primary/80',
      corretor: 'bg-green-600 text-white hover:bg-green-700',
      assistente: 'bg-blue-500 text-white hover:bg-blue-600',
      cca: 'bg-yellow-500 text-white hover:bg-yellow-600',
    };
    return <Badge className={colors[r.role] || ''}>{r.role}</Badge>;
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: newEmail, role: newRole }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Convite enviado com sucesso!');
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewRole('corretor');
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['user_roles'] });
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean, userEmail?: string) => {
    if (userEmail === MASTER_ADMIN_EMAIL) {
      toast.error('Este usuário Master não pode ser inativado.');
      return;
    }
    setActionLoadingId(userId);
    try {
      // @ts-expect-error - The types haven't been regenerated yet to include this new RPC
      const { error } = await supabase.rpc('toggle_user_status', { target_user_id: userId, new_status: !currentStatus });

      if (error) throw error;
      
      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'inativado'} com sucesso.`);
      qc.invalidateQueries({ queryKey: ['profiles'] });
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao alterar status do usuário: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'gerente' | 'corretor' | 'assistente' | 'cca', userEmail?: string) => {
    if (userEmail === MASTER_ADMIN_EMAIL && newRole !== 'admin') {
      toast.error('Garantia de Sistema: O usuário Master só pode assumir o cargo Admin.');
      return;
    }
    setActionLoadingId(userId);
    try {
      // Primeiro limpamos qualquer cargo existente para evitar conflito de chave única
      const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (deleteError) throw deleteError;

      // Agora inserimos o novo cargo único
      const { error: insertError } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      if (insertError) throw insertError;
      
      toast.success(`Nível de acesso atualizado com sucesso!`);
      qc.invalidateQueries({ queryKey: ['user_roles'] });
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao atualizar nível de acesso');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail?: string) => {
    if (userEmail === MASTER_ADMIN_EMAIL) {
      toast.error('O usuário Master não pode ser excluído do sistema.');
      return;
    }
    if (!confirm('Tem certeza que deseja apagar DEFINITIVAMENTE este usuário? Esta ação não pode ser desfeita.')) return;
    
    setActionLoadingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Usuário removido com sucesso!');
      qc.invalidateQueries({ queryKey: ['profiles'] });
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao deletar usuário');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!confirm(`Deseja enviar um link de redefinição de senha para ${email}?`)) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password',
      });
      if (error) throw error;
      toast.success(`E-mail de redefinição enviado para ${email}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao enviar e-mail de redefinição de senha.');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-24 pt-12 px-4 sm:px-0">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">{profiles.filter(p => p.active).length} Membros Ativos</span>
            </div>
            <h1 className="text-5xl font-heading font-black tracking-tight text-foreground lg:text-6xl">Time de Especialistas</h1>
            <p className="text-muted-foreground font-medium text-lg max-w-2xl mt-4">Gestão de acessos e permissões da equipe comercial JBR.</p>
          </div>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 h-12 px-6 rounded-2xl bg-primary text-white font-heading font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                <UserPlus className="h-5 w-5" />
                Adicionar Membro
              </motion.button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] glass-panel border-white/30 rounded-[2.5rem] shadow-2xl p-10">
              <DialogHeader className="mb-8">
                <DialogTitle className="font-heading font-black text-3xl text-foreground">Convidar Membro</DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium text-base mt-2">
                  Um convite de ativação será enviado por e-mail.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInviteUser} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail Profissional</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value)} 
                      placeholder="email@jbrimoveis.com.br" 
                      required 
                      className="h-12 pl-12 rounded-xl bg-white/50 dark:bg-black/20 border-white/20 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nível Hierárquico</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="h-12 rounded-xl bg-white/50 dark:bg-black/20 border-white/20 font-medium">
                      <SelectValue placeholder="Selecione um nível" />
                    </SelectTrigger>
                    <SelectContent className="glass-panel border-white/20 rounded-2xl shadow-2xl">
                      <SelectItem value="corretor" className="rounded-lg py-3">Corretor</SelectItem>
                      <SelectItem value="gerente" className="rounded-lg py-3">Gerente</SelectItem>
                      <SelectItem value="assistente" className="rounded-lg py-3">Assistente</SelectItem>
                      <SelectItem value="cca" className="rounded-lg py-3">CCA</SelectItem>
                      <SelectItem value="admin" className="rounded-lg py-3">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-8 gap-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting} className="h-12 px-10 rounded-xl bg-primary text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-primary/40">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirmar Convite
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="glass-panel border-white/40 shadow-2xl overflow-hidden rounded-[3rem] bg-white/5"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="pl-12 pt-14 text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground h-16">Especialista</TableHead>
                  <TableHead className="pt-14 text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">Privilégios</TableHead>
                  <TableHead className="pt-14 text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-right pr-12 pt-14 text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">Gestão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProfiles ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-32">
                      <div className="flex flex-col items-center gap-6">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-40" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">Sincronizando Segurança...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-32">
                      <p className="text-muted-foreground font-medium text-lg">Sem especialistas registrados.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((p, idx) => {
                    const isProcessing = actionLoadingId === p.id;
                    const isActive = p.active;
                    
                    return (
                      <motion.tr 
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className={cn(
                          "group border-white/5 transition-all duration-500",
                          !isActive ? "opacity-30 grayscale" : "hover:bg-white/5"
                        )}
                      >
                        <TableCell className="pl-12 py-10">
                          <div className="flex items-center gap-8">
                            <div className="relative">
                              <div className="h-20 w-20 rounded-[1.75rem] bg-[#f2e7dd] dark:bg-white/5 border border-white/20 shadow-xl overflow-hidden flex items-center justify-center transform group-hover:scale-105 transition-transform duration-700">
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="font-heading font-black text-4xl text-[#5c4033]/20">
                                    {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                                  </span>
                                )}
                              </div>
                              <div className={cn(
                                "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[4px] border-white dark:border-[#0d0606] shadow-xl",
                                isActive ? "bg-[#10b981]" : "bg-muted-foreground"
                              )} />
                            </div>
                            <div className="space-y-1">
                              <p className="font-heading font-black text-2xl text-[#2d1b14] dark:text-white tracking-tight leading-none">{p.name || 'Sem nome'}</p>
                              <div className="flex items-center gap-2 text-muted-foreground/60 text-[11px] font-black uppercase tracking-widest mt-2">
                                <Mail className="h-3 w-3 opacity-40" />
                                {p.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="focus:outline-none cursor-pointer group/trigger" disabled={isProcessing}>
                              <div className="flex items-center gap-6">
                                {getRoleBadge(p.user_id)}
                                <MoreHorizontal className="h-5 w-5 text-muted-foreground/10 group-hover/trigger:text-primary transition-colors duration-500" />
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="glass-panel border-white/20 rounded-2xl shadow-3xl p-3 min-w-[180px]">
                              {['admin', 'gerente', 'corretor', 'assistente', 'cca'].map((r) => (
                                <DropdownMenuItem 
                                  key={r}
                                  onClick={() => handleRoleChange(p.user_id, r as 'admin' | 'gerente' | 'corretor' | 'assistente' | 'cca', p.email)}
                                  className="rounded-xl py-3 cursor-pointer font-black uppercase text-[10px] tracking-widest"
                                >
                                  {r}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <div
                            className={cn(
                              "inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700",
                              isActive 
                                ? "bg-[#dcfce7] text-[#10b981] border border-[#10b981]/10" 
                                : "bg-muted text-muted-foreground border border-border/20"
                            )}
                          >
                            <div className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-[#10b981] shadow-[0_0_8px_#10b981]" : "bg-muted-foreground font-black")} />
                            {isActive ? 'Ativo' : 'Inativo'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-12">
                          <div className="flex justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform duration-700">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 1 }}
                              onClick={() => handlePasswordReset(p.email)}
                              className="h-12 w-12 rounded-2xl bg-white/40 dark:bg-black/20 border border-white/20 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all shadow-md"
                              title="Redefinir Senha"
                            >
                              <KeyRound className="h-5 w-5" />
                            </motion.button>

                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 1 }}
                              onClick={() => handleToggleStatus(p.id, isActive, p.email)}
                              disabled={isProcessing}
                              className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-md border border-white/20",
                                isActive 
                                  ? "bg-[#fff1e2] text-[#f59e0b] hover:bg-[#ffdeb7]" 
                                  : "bg-[#dcfce7] text-[#10b981] hover:bg-[#bbf7d0]"
                              )}
                              title={isActive ? "Desativar Acesso" : "Reativar Acesso"}
                            >
                              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : isActive ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                            </motion.button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
