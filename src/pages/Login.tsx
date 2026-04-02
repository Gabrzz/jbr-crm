import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const LOCKOUT_KEY = 'imobi_login_lockout';
const ATTEMPTS_KEY = 'imobi_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    const storedAttempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
    const storedLockout = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
    setAttempts(storedAttempts);
    if (storedLockout > Date.now()) {
      setLockoutUntil(storedLockout);
    }
  }, []);

  const resetLockout = () => {
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
    setAttempts(0);
    setLockoutUntil(null);
  };

  const registerFailedAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    localStorage.setItem(ATTEMPTS_KEY, newAttempts.toString());
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockTime = Date.now() + LOCKOUT_DURATION_MS;
      setLockoutUntil(lockTime);
      localStorage.setItem(LOCKOUT_KEY, lockTime.toString());
      toast.error('Muitas tentativas falhas. Bloqueado por 15 minutos.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    
    if (!captchaToken) {
      toast.error('Por favor, complete o desafio de segurança (Captcha).');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password,
        options: {
          captchaToken: captchaToken
        }
      });
      
      if (error) {
        registerFailedAttempt();
        toast.error('E-mail ou senha incorretos.');
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('active')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.warn('Profile fetch error:', profileError);
        }

        if (profile && profile.active === false) {
          await supabase.auth.signOut();
          toast.error('Sua conta está inativa. Entre em contato com o suporte.');
          setLoading(false);
          return;
        }

        resetLockout();
        toast.success('Acesso autorizado!');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 300);
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Erro ao processar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;
  const getRemainingTime = () => {
    if (!lockoutUntil) return '';
    const diff = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
    return `${diff} min`;
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-[#fafafa]">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <div className="flex flex-col items-center mb-10 text-center text-zinc-900">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative mb-6">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-110 opacity-30" />
              <img src="/media__1774833289919.png" alt="JBR" className="h-32 w-auto relative z-10 drop-shadow-2xl" />
            </motion.div>
            <h1 className="text-5xl font-black tracking-tighter uppercase mb-2 text-[#4a0404]">JBR<span className="text-primary italic">CRM</span></h1>
            <p className="text-zinc-500 font-medium tracking-widest text-[10px] uppercase opacity-80">Mercado imobiliário premium</p>
          </div>

          <motion.div className="glass-panel border-black/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white/70 backdrop-blur-[50px] p-12 border border-zinc-100">
            {isLockedOut ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Acesso Suspenso</h3>
                <p className="text-zinc-500 mt-2">Tente em {getRemainingTime()}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a0404]/60 ml-2">Username / E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-16 pl-14 rounded-2xl bg-zinc-50 border-black/5 text-zinc-900 focus:ring-primary/20 transition-all font-bold placeholder:text-zinc-200" placeholder="corretor@jbr" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#4a0404]/60 ml-2">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-16 pl-14 rounded-2xl bg-zinc-50 border-black/5 text-zinc-900 focus:ring-primary/20 transition-all font-bold placeholder:text-zinc-200" placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center py-2">
                  <HCaptcha
                    sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    theme="light"
                  />
                </div>

                <Button type="submit" className="w-full h-20 rounded-[1.75rem] bg-primary text-white text-xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/20" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <div className="flex items-center gap-3">Acessar Dashboard <ArrowRight className="h-5 w-5" /></div>}
                </Button>
              </form>
            )}
          </motion.div>
          <p className="mt-12 text-center text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em]">© {new Date().getFullYear()} JBR IMÓVEIS</p>
        </motion.div>
      </div>
    </div>
  );
}
