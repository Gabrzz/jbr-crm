import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLeads } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { useImoveis } from '@/hooks/useImoveis';
import { useAllAssignments } from '@/hooks/usePropertyBrokers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Users, TrendingUp, Target, Calendar, ArrowRight, UserCircle, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const STAGE_LABELS: Record<string, string> = {
  novo_lead: 'Novo Lead',
  contato: 'Contato',
  visita: 'Visita',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  contrato: 'Contrato',
  fechado: 'Fechado',
};

const STAGE_COLORS = ['#3B5BDB', '#0EA5E9', '#F59E0B', '#7C3AED', '#9c27b0', '#03a9f4', '#22C55E'];

interface ChartPayloadItem {
  name: string;
  value: number;
  dataKey: string;
  payload: unknown;
  color?: string;
  fill?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string;
}


export default function Dashboard() {
  const { role } = useAuth();
  const { data: leads = [] } = useLeads();
  const { data: profiles = [] } = useProfiles();
  const { imoveis = [] } = useImoveis();
  const { data: assignments = [] } = useAllAssignments();

  const stageCounts = Object.entries(STAGE_LABELS).map(([key, label], i) => ({
    name: label,
    count: leads.filter((l) => l.stage === key).length,
    fill: STAGE_COLORS[i],
  }));

  const brokerCounts = profiles.map((p) => ({
    name: p.name || p.email,
    leads: leads.filter((l) => l.assigned_to === p.user_id).length,
    properties: assignments.filter(a => a.broker_id === p.id && imoveis.some(img => img.id === a.property_id)).length
  }));

  const totalLeads = leads.length;
  const closedLeads = leads.filter((l) => l.stage === 'fechado').length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20 pt-8 px-4 sm:px-0">
        {/* Hero Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-4 w-4 text-primary" />
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold text-[10px] tracking-[0.2em] px-2 py-0.5 uppercase">Visão Geral</Badge>
            </div>
            <h1 className="text-4xl font-heading font-black tracking-tight text-foreground lg:text-5xl">
              Olá, <span className="text-primary italic">Corretor</span>
            </h1>
            <p className="text-muted-foreground mt-3 font-medium text-lg max-w-xl flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-panel border-white/40 p-4 px-6 rounded-2xl flex items-center gap-4 bg-white/5"
          >
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status da Meta</p>
              <p className="text-sm font-bold text-foreground">84% Concluído</p>
            </div>
            <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin-slow flex items-center justify-center p-1">
              <div className="h-full w-full rounded-full bg-primary/10" />
            </div>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Total de Leads', value: totalLeads, icon: Users, color: 'primary', trend: '+12% este mês' },
            { label: 'Negócios Fechados', value: closedLeads, icon: Target, color: 'emerald-500', trend: 'Recorde pessoal' },
            { label: 'Taxa de Conversão', value: `${conversionRate}%`, icon: TrendingUp, color: 'amber-500', trend: '+2.4% vs média' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative glass-panel border-white/40 shadow-2xl p-8 rounded-[2.5rem] overflow-hidden bg-white/5">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-${stat.color}/10 transition-all duration-500`} />
                <div className="flex flex-col gap-6">
                  <div className={`h-16 w-16 rounded-2xl bg-${stat.color === 'primary' ? 'primary' : stat.color}/10 flex items-center justify-center shadow-inner border border-white/10`}>
                    <stat.icon className={`h-8 w-8 text-${stat.color === 'primary' ? 'primary' : stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-5xl font-heading font-black text-foreground tracking-tighter">{stat.value}</h2>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className={`grid grid-cols-1 ${role === 'admin' || role === 'gerente' ? 'lg:grid-cols-2' : ''} gap-10`}>
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4, duration: 0.6 }}
            className="glass-panel border-white/40 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/5"
          >
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div>
                <h3 className="font-heading font-black text-xl tracking-tight text-foreground">Funil de Vendas</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Distribuição por estágio</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="p-8">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stageCounts} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.7)', fontWeight: 'bold' }} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.7)', fontWeight: 'bold' }} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)', radius: 12 }} 
                    content={({ active, payload, label }: CustomTooltipProps) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass-panel border-primary/20 p-4 rounded-2xl shadow-2xl bg-white/95 backdrop-blur-xl transition-all duration-300">
                            <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1">{label}</p>
                            <p className="text-2xl font-black text-primary flex items-baseline gap-1">
                              {payload[0].value}
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Leads</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[12, 12, 12, 12]} barSize={40}>
                    {stageCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {(role === 'admin' || role === 'gerente') && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.5, duration: 0.6 }}
              className="glass-panel border-white/40 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/5"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="font-heading font-black text-xl tracking-tight text-foreground">Performance do Time</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Leads gerados por corretor</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <UserCircle className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="p-8">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={brokerCounts} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.6)', fontWeight: 'bold' }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.8)', fontWeight: 'bold' }} 
                      tickLine={false} 
                      axisLine={false} 
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.05)', radius: 12 }}
                    content={({ active, payload, label }: CustomTooltipProps) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="glass-panel border-primary/20 p-4 rounded-2xl shadow-2xl bg-white/95 backdrop-blur-xl transition-all duration-300 min-w-[150px]">
                              <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-2">{label}</p>
                              {payload.map((p: ChartPayloadItem) => (
                                <p key={p.dataKey} className="flex justify-between items-center gap-4 py-1">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{p.name === 'leads' ? 'Leads' : 'Imóveis'}:</span>
                                  <span className="text-xl font-black text-primary">{p.value}</span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}

                    />
                    <Legend iconType="circle" />
                    <Bar name="leads" dataKey="leads" fill="#3B5BDB" radius={[0, 12, 12, 0]} barSize={16} />
                    <Bar name="imoveis" dataKey="properties" fill="#F59E0B" radius={[0, 12, 12, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
