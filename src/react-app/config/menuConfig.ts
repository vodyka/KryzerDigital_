import { Package, ShoppingCart, Users, BarChart3, Wallet, LineChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  label: string;
  href: string;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export interface MenuGroup {
  icon?: LucideIcon;
  label: string;
  categories: MenuCategory[];
}

export interface TopLevelMenuItem {
  label: string;
  href: string;
}

export function isMenuGroup(item: TopLevelMenuItem | MenuGroup): item is MenuGroup {
  return (item as any).categories !== undefined;
}

export const topMenuConfig: (TopLevelMenuItem | MenuGroup)[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: Package,
    label: "Produtos",
    categories: [
      {
        title: "Gerenciamento de Produtos",
        items: [
          { label: "Lista de Produtos", href: "/produtos" },
          { label: "Lista de Estoque", href: "/estoque" },
          { label: "Categorias", href: "/categorias" },
          { label: "Variações", href: "/variacoes" },
        ],
      },
    ],
  },
  {
    icon: ShoppingCart,
    label: "Pedidos",
    categories: [
      {
        title: "Gestão de Pedidos",
        items: [
          { label: "Todos os Pedidos", href: "/pedidos" },
          { label: "Novo Pedido", href: "/pedidos/novo" },
        ],
      },
    ],
  },
  {
    icon: Wallet,
    label: "Financeiro",
    categories: [
      {
        title: "Visão Geral",
        items: [
          { label: "Dashboard", href: "/finance/dashboard" },
        ],
      },
      {
        title: "Gestão Financeira",
        items: [
          { label: "Contas", href: "/finance/contas" },
          { label: "Lançamentos", href: "/finance/lancamentos" },
          { label: "Extratos", href: "/finance/extratos" },
          { label: "Categorias", href: "/finance/categorias" },
        ],
      },
      {
        title: "Contas a Pagar e Receber",
        items: [
          { label: "Contas a Pagar", href: "/finance/contas-pagar" },
          { label: "Contas a Receber", href: "/finance/contas-receber" },
          { label: "Dívidas", href: "/finance/dividas" },
        ],
      },
      {
        title: "Cadastros",
        items: [
          { label: "Clientes e Fornecedores", href: "/finance/clientes-fornecedores" },
          { label: "Configurações", href: "/finance/configuracoes" },
        ],
      },
    ],
  },
  {
    icon: LineChart,
    label: "Análise",
    categories: [
      {
        title: "Dashboard",
        items: [
          { label: "Analytics Dashboard", href: "/analytics" },
        ],
      },
      {
        title: "Análise de Vendas",
        items: [
          { label: "Vendas por Variante", href: "/analytics/vendas-variante" },
          { label: "Reposição Recomendada", href: "/analytics/reposicao-recomendada" },
          { label: "Tendências Mensais", href: "/analytics/tendencias-mensais" },
        ],
      },
      {
        title: "Análise de Custos",
        items: [
          { label: "Análise de Custos", href: "/analytics/analise-custos" },
          { label: "Ponto de Equilíbrio", href: "/analytics/ponto-equilibrio" },
        ],
      },
      {
        title: "Gestão de Custo Operacional",
        items: [
          { label: "Grupos", href: "/custo-operacional/grupos" },
          { label: "Despesas", href: "/custo-operacional/despesas" },
          { label: "Análise", href: "/custo-operacional/analise" },
        ],
      },
      {
        title: "Análise de Estoque",
        items: [
          { label: "Saúde do Estoque", href: "/analytics/saude-estoque" },
          { label: "Performance Fornecedores", href: "/analytics/performance-fornecedores" },
        ],
      },
      {
        title: "Ferramentas GMV",
        items: [
          { label: "Ads Compass", href: "/ads-compass" },
          { label: "Calculadora de Custo", href: "/calculadora" },
          { label: "ROAS Calculator", href: "/roas" },
          { label: "Analytics Avançado", href: "/analytics/avancado" },
        ],
      },
    ],
  },

  {
    icon: Users,
    label: "Fornecedores",
    categories: [
      {
        title: "Gestão de Fornecedores",
        items: [
          { label: "Lista de Fornecedores", href: "/fornecedores" },
        ],
      },
    ],
  },
  {
    icon: BarChart3,
    label: "Relatórios",
    categories: [
      {
        title: "Análises e Relatórios",
        items: [
          { label: "Visão Geral", href: "/relatorios" },
        ],
      },
    ],
  },
];
