# 🍷 JbrCRM - Inovação no Mercado Imobiliário Premium

![JbrCRM Banner](public/media__1774833289919.png)

> O **JbrCRM** é um ecossistema de gestão imobiliária projetado para corretores de alta performance. Unindo **Glassmorphism**, animações fluidas e uma integração robusta com o ecossistema **WordPress** e **Supabase**, este sistema transforma a maneira como o contato com o cliente se torna uma venda fechada.

---

## ✨ Diferenciais de Design

O projeto utiliza uma estética moderna e premium:
- **Glassmorphism & Blur**: Camadas translúcidas que trazem leveza e profundidade.
- **Paleta JBR**: Tons de Vinho (`#4a0404`) e Dourado que transmitem autoridade e sofisticação.
- **Micro-animações**: Transições suaves com `framer-motion` para uma experiência de usuário (UX) de última geração.
- **Layout Responsivo**: Interface adaptável para acompanhamento em dispositivos móveis.

---

## 🚀 Funcionalidades Principais

### 📊 Funil de Vendas (Kanban)
Gestão visual e intuitiva de Leads em colunas:
- **Novos**: Captura automática via sistema.
- **Contato**: Interação inicial.
- **Visita**: Agendamento de tour nas propriedades.
- **Proposta**: Negociações em andamento.
- **Fechado**: Conversão e sucesso.

### 🏠 Gestão de Imóveis (Sync WordPress)
Sincronização em tempo real com o site principal via **WP-Proxy**:
- Listagem completa com filtros por corretor e tipo de negócio (Venda/Aluguel).
- Galeria de imagens em tela cheia com visualização panorâmica.
- Carregamento de atributos técnicos (quartos, banheiros, metros quadrados) direto do CMS.

### 📁 Pasta do Cliente (CCA)
Módulo exclusivo para formalização de crédito e documentos:
- Upload inteligente de arquivos sensíveis.
- Processamento em background.
- Checklist automatizado para aprovação bancária.

### 💬 Chat Centralizado
Integração via Chatwoot para manter toda a conversa dentro do ambiente do CRM:
- Suporte a áudio e anexos.
- Importação direta de documentos do chat para a **Pasta do Cliente**.

### 🔔 Notificações Inteligentes
Histórico e alertas em tempo real sobre atribuições de leads e mudanças de status.

---

## 🛠️ Stack Tecnológica

| Componente | Tecnologia |
|---|---|
| **Core** | [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) |
| **UI/UX** | [Shadcn/UI](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) |
| **Animações** | [Framer Motion](https://www.framer.com/motion/) |
| **Backend** | [Supabase](https://supabase.com/) (Auth, DB, Functions, Storage) |
| **Integrador** | Custom Node/Deno Proxy para WordPress REST API |

---

## 🛠️ Configuração de Desenvolvimento

### Pré-requisitos
- Node.js (v18+)
- Supabase CLI
- WordPress com Application Passwords habilitado

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Gabrzz/imobi-connect.git
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env`:
```env
VITE_SUPABASE_URL=sua-url-aqui
VITE_SUPABASE_PUBLISHABLE_KEY=sua-key-aqui
VITE_WP_API_URL=https://jbrimobiliaria.com.br/wp-json/wp/v2
```

4. Inicie o servidor local:
```bash
npm run dev
```

---

## 👤 Autor

Desenvolvido por **Gabrzz** para a **JBR Imóveis**.

> "Transformando leads em lares, um clique por vez." 🏡💼
