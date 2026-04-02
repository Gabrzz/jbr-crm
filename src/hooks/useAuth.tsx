import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AppRole = Database['public']['Enums']['app_role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

// Captura do Hash ANTES do React Router destruir ao redirecionar rotas na primeira montagem
const initialHash = typeof window !== 'undefined' ? window.location.hash : '';
const isInviteOrRecovery = initialHash.includes('type=invite') || initialHash.includes('type=recovery');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isInviteOrRecovery)) {
        window.location.href = '/update-password' + initialHash;
        return;
      }

      if (session?.user) {
        // Fetch profile and role using setTimeout to avoid deadlock
        setTimeout(async () => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          // Interceptação de Usuário Inativo
          if (profileData && profileData.active === false) {
            await supabase.auth.signOut();
            toast.error('Acesso Negado: Seu usuário foi inativado no sistema.');
            setProfile(null);
            setRole(null);
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }

          setProfile(profileData);

          const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: session.user.id });
          setRole(roleData as AppRole);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
      else if (isInviteOrRecovery) {
        window.location.href = '/update-password';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
