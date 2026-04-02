import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GlobalUIProvider } from "@/contexts/GlobalUIContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Imoveis from "./pages/Imoveis";
import ImovelDetail from "./pages/ImovelDetail";
import ImovelForm from "./pages/ImovelForm";
import Usuarios from "./pages/Usuarios";
import Profile from "./pages/Profile";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import CCA from "./pages/CCA";
import CCADetail from "./pages/CCADetail";
import ClientFolder from "./pages/ClientFolder";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading, role } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'cca') return <Navigate to="/cca" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute allowedRoles={['admin', 'gerente', 'corretor']}><Leads /></ProtectedRoute>} />
      <Route path="/leads/:id" element={<ProtectedRoute allowedRoles={['admin', 'gerente', 'corretor']}><LeadDetail /></ProtectedRoute>} />
      <Route path="/imoveis" element={<ProtectedRoute><Imoveis /></ProtectedRoute>} />
      <Route path="/imoveis/novo" element={<ProtectedRoute><ImovelForm /></ProtectedRoute>} />
      <Route path="/imoveis/:id" element={<ProtectedRoute><ImovelDetail /></ProtectedRoute>} />
      <Route path="/imoveis/:id/editar" element={<ProtectedRoute><ImovelForm /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['admin']}><Usuarios /></ProtectedRoute>} />
      <Route path="/cca" element={<ProtectedRoute allowedRoles={['admin', 'cca', 'gerente']}><CCA /></ProtectedRoute>} />
      <Route path="/cca/:id" element={<ProtectedRoute allowedRoles={['admin', 'cca', 'gerente']}><CCADetail /></ProtectedRoute>} />
      <Route path="/pasta/:id" element={<ProtectedRoute allowedRoles={['admin', 'gerente', 'corretor', 'cca']}><ClientFolder /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GlobalUIProvider>
            <AppRoutes />
          </GlobalUIProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
