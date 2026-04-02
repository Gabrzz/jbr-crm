import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UploadCloud, User as UserIcon, Check, X, ShieldCheck, Mail, Phone, Fingerprint, Sparkles, Camera, Briefcase } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Profile() {
  const { user, profile, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    is_cca_active: true,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Critérios de Senha
  const criteria = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };
  const isStrong = Object.values(criteria).every(Boolean);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: (profile as unknown as Record<string, string>).phone || '',
        bio: (profile as unknown as Record<string, string>).bio || '',
        is_cca_active: (profile as unknown as Record<string, any>).is_cca_active !== false,
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      let finalAvatarUrl = avatarUrl;
      
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
          
        finalAvatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
          is_cca_active: formData.is_cca_active,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      const error = err as Error;
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (!isStrong) {
      toast.error('A nova senha não atende aos requisitos.');
      return;
    }
    setSavingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) throw new Error('Senha atual incorreta.');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success('Senha atualizada!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      const error = err as Error;
      toast.error(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const Criterion = ({ met, text }: { met: boolean; text: string }) => (
    <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors", met ? 'text-emerald-500' : 'text-muted-foreground/30')}>
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-24 pt-10 px-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-center gap-8 bg-white/40 dark:bg-white/[0.02] border border-border/40 dark:border-white/10 p-10 rounded-[3rem] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
          
          <div className="relative group">
            <div className={cn("h-40 w-40 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-white/50 dark:border-white/5 shadow-2xl relative z-10 transition-all duration-500", !formData.is_cca_active && "grayscale brightness-75")}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-20 w-20 text-primary/40" />
              )}
            </div>
            <label htmlFor="avatar" className="absolute bottom-1 right-1 z-20 h-10 w-10 rounded-2xl bg-primary text-white flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 transition-all border border-white/20">
               <Camera className="h-5 w-5" />
            </label>
            <input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div className="absolute -inset-4 bg-primary/20 blur-[40px] rounded-full opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-2 relative z-10">
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 mb-2">Painel de Identidade</Badge>
            <h1 className="text-4xl font-heading font-black text-foreground italic uppercase tracking-tighter leading-none">
              {formData.name || 'Agente JBR'} <span className="text-primary/40 not-italic font-light">
                {role === 'admin' ? 'Administrador' : 
                 role === 'gerente' ? 'Gerente' : 
                 role === 'corretor' ? 'Consultor Imobiliário' : 
                 role === 'assistente' ? 'Assistente' : 
                 role === 'cca' ? 'Especialista CCA' : 'Platinum'}
              </span>
            </h1>
            <p className="text-muted-foreground font-bold flex items-center justify-center md:justify-start gap-2 text-sm opacity-80">
              <Mail className="h-4 w-4 text-primary/60" /> {user?.email}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1 }}
            className="lg:col-span-7"
          >
            <div className="glass-panel border-border/40 dark:border-white/10 rounded-[3rem] overflow-hidden shadow-2xl bg-white/40 dark:bg-white/[0.02]">
              <div className="px-10 py-8 border-b border-border/40 dark:border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-heading font-black text-xl text-foreground uppercase italic tracking-tight">Dados Profissionais</h2>
                </div>
                <Sparkles className="h-5 w-5 text-primary/40" />
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Nome Completo</Label>
                    <Input className="h-14 rounded-2xl bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 text-foreground dark:text-white font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">WhatsApp Business</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                      <Input className="h-14 pl-12 rounded-2xl bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 text-foreground dark:text-white font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Assinatura / Bio Profissional</Label>
                  <Textarea className="min-h-[140px] rounded-[2rem] bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 text-foreground dark:text-white font-medium p-6 focus:ring-primary/20" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Descreva suas conquistas..." />
                </div>
                {role === 'cca' && (
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-white/60 dark:bg-stone-950/40 border border-border/40 dark:border-white/10">
                     <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                         <Briefcase className="h-4 w-4 text-primary" />
                       </div>
                       <div>
                         <Label className="text-[12px] font-black uppercase tracking-widest text-primary">Status CCA</Label>
                         <p className="text-xs text-muted-foreground font-medium">Define se você está apto a receber novos leads automaticamente.</p>
                       </div>
                     </div>
                     <Switch 
                       checked={formData.is_cca_active} 
                       onCheckedChange={(val) => setFormData({...formData, is_cca_active: val})} 
                     />
                  </div>
                )}
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving} className="h-14 px-10 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:brightness-110 shadow-xl shadow-primary/20 transition-all border border-white/10">
                    {saving ? <Loader2 className="animate-spin" /> : <div className="flex items-center gap-2"><Check className="h-4 w-4" /> Atualizar Identidade</div>}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.2 }}
            className="lg:col-span-5"
          >
            <div className="glass-panel border-border/40 dark:border-white/10 rounded-[3rem] overflow-hidden shadow-2xl bg-white/40 dark:bg-white/[0.02]">
              <div className="px-10 py-8 border-b border-border/40 dark:border-white/5 flex items-center gap-4 bg-red-500/5">
                <div className="h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <ShieldCheck className="h-5 w-5 text-red-500" />
                </div>
                <h2 className="font-heading font-black text-xl text-foreground uppercase italic tracking-tight">Criptografia</h2>
              </div>
              <form onSubmit={handleUpdatePassword} className="p-10 space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">Senha Atual</Label>
                  <Input type="password" required className="h-14 rounded-2xl bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 text-foreground dark:text-white font-bold" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">Nova Senha Mestra</Label>
                  <Input type="password" required className="h-14 rounded-2xl bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 text-foreground dark:text-white font-bold transition-all focus:border-red-500/50" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-1">Confirmar Nova Senha</Label>
                  <Input type="password" required className="h-14 rounded-2xl bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 text-foreground dark:text-white font-bold transition-all focus:border-red-500/50" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
                </div>
                
                <div className="bg-white/80 dark:bg-black/60 p-6 rounded-[2rem] border border-border/40 dark:border-white/5 space-y-3 shadow-inner">
                  <Criterion met={criteria.length} text="8+ Caracteres" />
                  <Criterion met={criteria.uppercase} text="Letra Maiúscula" />
                  <Criterion met={criteria.number} text="Possui Números" />
                  <Criterion met={criteria.special} text="Caractere Especial" />
                </div>

                <Button 
                  type="submit" 
                  disabled={savingPassword || !isStrong || !newPassword || newPassword !== confirmNewPassword && confirmNewPassword !== ''} 
                  className="w-full h-14 rounded-2xl bg-stone-900 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-all border border-red-500/20"
                >
                  {savingPassword ? <Loader2 className="animate-spin" /> : "Elevar Segurança"}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
