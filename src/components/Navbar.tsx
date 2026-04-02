import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, UserCog, LogOut, PanelLeftClose, ChevronsRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Funil de Vendas', icon: Users, hideForRoles: ['cca'] },
  { to: '/cca', label: 'Painel CCA', icon: Users, roles: ['admin', 'cca'] },
  { to: '/imoveis', label: 'Imóveis', icon: Building2 },
  { to: '/usuarios', label: 'Usuários', icon: UserCog, adminOnly: true },
];

interface NavbarProps {
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export function Navbar({ isPinned = true, onTogglePin }: NavbarProps) {
  const { pathname } = useLocation();
  const { profile, role, signOut } = useAuth();
  
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = isPinned || isHovered;

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setIsHovered(true), 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setIsHovered(false), 200);
  };

  return (
    <>
      <motion.aside 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        initial={{ x: -100, opacity: 0 }}
        animate={{ 
          x: 0, 
          opacity: 1,
          width: isExpanded ? 240 : 80 
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed left-4 top-4 bottom-4 z-40 flex flex-col glass-sidebar rounded-3xl text-sidebar-foreground overflow-hidden",
          !isPinned && isHovered ? "shadow-2xl" : "shadow-lg"
        )}
      >
        {/* Logo Header */}
        <div className="flex items-center h-[72px] px-2 border-b border-white/5 dark:border-white/5 shrink-0 w-[240px] relative">
          <div className="flex items-center justify-center shrink-0 w-12 h-12 p-0.5">
            <motion.img 
              whileHover={{ rotate: 10, scale: 1.1 }}
              src="/media__1774833289908.png" 
              alt="JBR Imóveis" 
              className="w-full h-full object-contain drop-shadow-md cursor-pointer"
            />
          </div>
          <span className={cn(
            "text-xl font-extrabold tracking-tight whitespace-nowrap transition-opacity duration-300 shrink-0 ml-1 text-sidebar-primary",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            Jbr<span className="text-sidebar-foreground font-medium">CRM</span>
          </span>

          {isPinned && onTogglePin && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onTogglePin}
              className="absolute right-4 text-sidebar-foreground/60 hover:text-sidebar-primary bg-transparent transition-colors p-2"
              title="Recolher menu"
            >
              <PanelLeftClose className="h-5 w-5" />
            </motion.button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 space-y-2 overflow-y-auto overflow-x-hidden px-4 w-[240px]" style={{ scrollbarWidth: 'none' }}>
           <AnimatePresence>
          {navItems.map((item) => {
            if (item.adminOnly && role !== 'admin') return null;
            if (item.roles && (!role || !item.roles.includes(role))) return null;
            if (item.hideForRoles && role && item.hideForRoles.includes(role)) return null;
            
            const active = pathname.startsWith(item.to);
            const hasSubmenu = item.label === 'Imóveis';

            return (
              <div key={item.to} className="group flex flex-col relative">
                <Link
                  to={item.to}
                  title={!isExpanded ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-xl h-11 px-0 font-medium transition-colors relative w-full overflow-hidden',
                    active
                      ? 'text-sidebar-primary font-semibold'
                      : 'text-sidebar-foreground/75 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {active && isExpanded && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-sidebar-primary/20 border border-sidebar-primary/30 rounded-xl -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                  {active && !isExpanded && (
                    <motion.div
                      layoutId="active-dot"
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sidebar-primary"
                    />
                  )}
                  <motion.div 
                    whileHover={{ scale: 1.1 }} 
                    className={cn(
                      "flex items-center justify-center shrink-0 h-10 transition-all duration-300",
                      isExpanded ? "w-10 ml-2" : "w-12 ml-0 absolute left-0"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                  </motion.div>
                  <span className={cn(
                    "whitespace-nowrap transition-all duration-300 text-sm ml-2 shrink-0 flex-1",
                    isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none absolute left-12"
                  )}>
                    {item.label}
                  </span>
                </Link>
                
                {/* Submenu Imóveis */}
                {hasSubmenu && (
                  <div className={cn(
                    "overflow-hidden transition-all duration-300",
                    isExpanded ? "max-h-32 opacity-100 mt-1 border-l-2 border-white/10 ml-[26px] pl-4 flex flex-col py-1" : "max-h-0 opacity-0"
                  )}>
                    <Link to="/imoveis" className="py-2 text-[13px] text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors whitespace-nowrap truncate shrink-0">
                      Todos os imóveis
                    </Link>
                    <Link to="/imoveis?meus=true" className="py-2 text-[13px] text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors whitespace-nowrap truncate shrink-0">
                      Meus Imóveis
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
          </AnimatePresence>
        </nav>

        {/* Footer Profile & Logout */}
        <div className="py-4 px-2 shrink-0 space-y-2 w-[240px] bg-black/5 dark:bg-white/5 mt-auto backdrop-blur-md">
          
          <div className="px-2 mb-2">
            <NotificationBell isExpanded={isExpanded} />
          </div>

          <div className="flex items-center w-full px-2 pt-2 border-t border-white/5 mt-2">
            <Link to="/perfil" className="flex items-center min-w-0 hover:opacity-80 transition-opacity flex-1 overflow-hidden" title={!isExpanded ? "Perfil de Usuário" : undefined}>
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center justify-center shrink-0 h-10 w-10 relative left-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sidebar-primary to-orange-400 p-[2px]">
                   <div className="h-full w-full rounded-full overflow-hidden bg-sidebar-background flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-sidebar-foreground">
                        {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                   </div>
                </div>
              </motion.div>
              
              <div className={cn(
                "flex flex-col shrink-0 transition-opacity duration-300 ml-3 w-[120px]",
                isExpanded ? "opacity-100" : "opacity-0"
              )}>
                <p className="text-sm font-semibold tracking-tight truncate text-sidebar-foreground">{profile?.name || 'Usuário'}</p>
                <p className="text-[11px] text-sidebar-foreground/60 tracking-wider font-medium truncate uppercase">{role || 'corretor'}</p>
              </div>
            </Link>

            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={signOut} 
              className={cn(
                "text-sidebar-foreground/50 hover:text-red-400 rounded-lg bg-transparent transition-all duration-200 flex items-center justify-center shrink-0 w-10 h-10 right-2 absolute",
                isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
              )} 
              title="Sair do sistema"
            >
              <LogOut className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.aside>

      {!isPinned && onTogglePin && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onTogglePin}
          className={cn(
            "fixed z-[60] top-8 bg-glass-panel backdrop-blur-md border border-white/20 rounded-full shadow-lg outline-none text-sidebar-primary hover:text-white transition-all duration-300 p-2",
            isExpanded ? "left-[260px]" : "left-[108px]"
          )}
          title="Fixar menu lateral"
        >
          <ChevronsRight className="h-5 w-5" />
        </motion.button>
      )}
    </>
  );
}
