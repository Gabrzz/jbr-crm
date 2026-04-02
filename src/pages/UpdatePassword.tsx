import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Shield, Lock, Eye, EyeOff, Loader2, ArrowRightCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isStrong = Object.values(criteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong) {
      toast.error('Sua senha deve cumprir todos os requisitos de segurança.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas digitadas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  const Criterion = ({ met, text }: { met: boolean; text: string }) => (
    <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-500", met ? 'text-emerald-600' : 'text-zinc-300')}>
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-20" />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-[#fafafa]">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <div className="flex flex-col items-center mb-10 text-center text-zinc-900">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative mb-6">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-110 opacity-30" />
              <img src="/media__1774833289919.png" alt="JBR" className="h-32 w-auto relative z-10 drop-shadow-2xl" />
            </motion.div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2 text-[#4a0404]">Configurar <span className="text-primary italic">Acesso</span></h1>
            <p className="text-zinc-500 font-medium tracking-widest text-[10px] uppercase opacity-80">Segurança de Dados JBR Platinum</p>
          </div>

          <motion.div className="glass-panel border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70 backdrop-blur-[50px] p-12 border border-zinc-100">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a0404]/60 ml-2">Nova Chave de Acesso</Label>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="h-16 pl-14 pr-14 rounded-2xl bg-zinc-50 border-black/5 text-zinc-900 focus:ring-primary/20 transition-all font-bold placeholder:text-zinc-200" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-primary transition-colors">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a0404]/60 ml-2">Confirmar Chave</Label>
                  <div className="relative">
                    <Shield className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-16 pl-14 rounded-2xl bg-zinc-50 border-black/5 text-zinc-900 focus:ring-primary/20 transition-all font-bold placeholder:text-zinc-200" placeholder="••••••••" />
                  </div>
                </div>

                <div className="bg-white/80 border border-zinc-100 p-8 rounded-[2.5rem] space-y-4 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400/80">Requisitos de Segurança</p>
                    {isStrong && (
                      <div className="flex items-center gap-1.5 animate-bounce">
                        <Sparkles className="h-3 w-3 text-emerald-500" />
                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Senha Forte</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <Criterion met={criteria.length} text="8+ Caracteres" />
                    <Criterion met={criteria.uppercase} text="Maiúscula" />
                    <Criterion met={criteria.number} text="Números" />
                    <Criterion met={criteria.special} text="Símbolo" />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-20 rounded-[1.75rem] bg-primary text-white text-xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/20 group" disabled={loading || !isStrong}>
                {loading ? <Loader2 className="animate-spin" /> : <div className="flex items-center gap-3">Ativar Minha Conta <ArrowRightCircle className="h-6 w-6 group-hover:translate-x-1 transition-transform" /></div>}
              </Button>
            </form>
          </motion.div>
          <p className="mt-12 text-center text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em]">Proteção de Dados JBR Imóveis</p>
        </motion.div>
      </div>
    </div>
  );
}
