import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WelcomeModal() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show if the user is authenticated, profile is loaded, name is empty, and we are not already on the profile page
    if (!loading && profile && !profile.name && location.pathname !== '/perfil') {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [profile, loading, location]);

  const handleGoToProfile = () => {
    setIsOpen(false);
    navigate('/perfil');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-md bg-background/95 backdrop-blur-xl border-t-4 border-t-primary"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex flex-col items-center text-center space-y-4 pt-6">
          <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center animate-bounce">
            <PartyPopper className="h-8 w-8" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Bem-vindo(a) ao JBR CRM!
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground pt-2">
            Estamos felizes em tê-lo(a) conosco na equipe. Para começar com o pé direito, precisamos conhecer você melhor!
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/30 p-4 rounded-lg my-2 border border-border/50 text-center text-sm font-medium">
          Seu próximo passo é adicionar o seu <strong>Nome Completo</strong> e sua <strong>Foto de Perfil</strong> para que os clientes e a equipe possam identificá-lo(a).
        </div>

        <DialogFooter className="sm:justify-center pt-4 pb-2">
          <Button onClick={handleGoToProfile} size="lg" className="w-full text-md font-bold shadow-lg hover:scale-[1.02] transition-transform">
            Configurar Meu Perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
