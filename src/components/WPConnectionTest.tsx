import { useImoveis } from '../hooks/useImoveis';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function WPConnectionTest() {
  const { imoveis, loading, error, reloadImoveis } = useImoveis();

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="p-4 flex flex-col items-center justify-center gap-4 text-center">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Testando conexão com WordPress...</span>
          </div>
        )}
        
        {!loading && error && (
          <div className="text-destructive font-medium flex flex-col items-center gap-2">
            <span>❌ Erro de conexão: {error}</span>
            <Button variant="outline" onClick={reloadImoveis} size="sm">
              Testar conexão novamente
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="text-primary font-medium flex flex-col items-center gap-2">
            <span>✅ WordPress conectado — {imoveis.length} imóveis encontrados</span>
            <Button variant="outline" onClick={reloadImoveis} size="sm">
              Testar conexão novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
