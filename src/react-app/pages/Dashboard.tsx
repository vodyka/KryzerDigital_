import React, { useMemo, useState, useEffect } from "react";
import {
  Store,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  TriangleAlert,
  CircleCheckBig,
  ChartArea,
  ChartColumn,
  Calendar,
  Target,
  Settings2,
  Trophy,
  Copy,
  RefreshCw,
  Info,
  Star,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { useAuth } from "@/react-app/contexts/AuthContext";
import MLSalesAnalytics from "@/react-app/components/MLSalesAnalytics";
import ExpiredIntegrationsAlert from "@/react-app/components/ExpiredIntegrationsAlert";

interface MLIntegration {
  id: string;
  marketplace: string;
  store_name: string;
  nickname: string;
  external_store_id: string;
}

// --------------------
// Mock data (esqueleto)
// --------------------
type RangeKey = "7D" | "14D" | "30D";
type ChartType = "area" | "bar";

const mockKpis = {
  receitaHoje: 0,
  pedidosHoje: 0,
  ticketMedioHoje: 0,
  estoqueBaixoSkus: 0,
  semClips: 0,
  poucasFotos: 0,
};

const mockSales = {
  atual: 60,
  anterior: 610,
  deltaPercent: -90.2,
};

const mockGoal = {
  monthLabel: "fevereiro",
  atual: 670,
  meta: 15000,
  projecao: 1340,
  diasRestantes: 14,
  vsEsperado: -46,
};

const mockCategory = {
  total: 2593,
  count: 6,
  top: [
    { name: "Cat. 63829", percent: 24, value: 843 },
    { name: "Cat. 456037", percent: 18, value: 0 },
    { name: "Cat. 46685", percent: 15, value: 0 },
  ],
};

const mockTopProducts = [
  { rank: 1, name: "Kit Cilindro Roda Traseiro Sapata Freio Traseiro Mca Mcf 200", vendas: 1, valor: "R$ 0k", bar: 100 },
  { rank: 2, name: "Kit Rolamento Motor Balanceiro Comando Titan 160 Fan Bros160", vendas: 1, valor: "R$ 0k", bar: 84.4 },
  { rank: 3, name: "Kit Rolamento Motor Balanceiro Titan150 Fan150 Nxr 150 Bros", vendas: 2, valor: "R$ 0k", bar: 83.6 },
  { rank: 4, name: "Kit Rolamento Motor Completo Titan Fan Bros 150 Original", vendas: 1, valor: "R$ 0k", bar: 76.0 },
  { rank: 5, name: "Punho De Partida Cb500 Universal Titan 160 Fan 160 150 Xre", vendas: 4, valor: "R$ 0k", bar: 70.9 },
];

const mockContribution = [
  { rank: 1, name: "Kit Cilindro Roda Traseiro Sapata Freio Traseiro Mca Mcf 200", mlb: "MLB3248126241", preco: 394, un: 1 },
  { rank: 2, name: "Kit Rolamento Motor Balanceiro Comando Titan 160 Fan Bros160", mlb: "MLB3550734039", preco: 333, un: 1 },
  { rank: 3, name: "Kit Rolamento Motor Balanceiro Titan150 Fan150 Nxr 150 Bros", mlb: "MLB3192999510", preco: 330, un: 2 },
  { rank: 4, name: "Kit Rolamento Motor Completo Titan Fan Bros 150 Original", mlb: "MLB3192911316", preco: 300, un: 1 },
  { rank: 5, name: "Punho De Partida Cb500 Universal Titan 160 Fan 160 150 Xre", mlb: "MLB5150800182", preco: 280, un: 4 },
];

// --------------------
// Helpers
// --------------------
function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function percent(n: number) {
  return `${n.toFixed(1)}%`;
}

function ShimmerCard(props: { children: React.ReactNode; className?: string }) {
  return (
    <Card
      className={
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl " +
        "shadow-sm hover:shadow-md transition-all duration-300 " +
        (props.className ?? "")
      }
    >
      <div className="pointer-events-none absolute inset-0 opacity-50 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
      {props.children}
    </Card>
  );
}

function KpiCard(props: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  delta: { value: string; down?: boolean };
  accent?: "primary" | "success" | "accent" | "destructive";
}) {
  const accent = props.accent ?? "primary";
  const map = {
    primary: "bg-primary/15 text-primary ring-primary/25",
    success: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400",
    accent: "bg-purple-500/15 text-purple-600 ring-purple-500/25 dark:text-purple-400",
    destructive: "bg-destructive/15 text-destructive ring-destructive/25",
  } as const;

  return (
    <ShimmerCard className="p-4 hover:-translate-y-0.5">
      <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-primary/10 to-transparent" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground">{props.title}</p>
          <p className="text-2xl font-bold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {props.value}
            </span>
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span
              className={
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold " +
                (props.delta.down
                  ? "bg-destructive/15 text-destructive"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400")
              }
            >
              {props.delta.down ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {props.delta.value}
            </span>
            <span className="text-[10px] text-muted-foreground">vs anterior</span>
          </div>
        </div>

        <div className={"p-2.5 rounded-xl ring-1 " + map[accent]}>
          {props.icon}
        </div>
      </div>
    </ShimmerCard>
  );
}

function TinyStatusCard(props: {
  title: string;
  value: number;
  okLabel: string;
  icon: React.ReactNode;
  tint?: "orange" | "yellow";
}) {
  const tint = props.tint ?? "orange";
  const bg =
    tint === "orange"
      ? "from-orange-500/15"
      : "from-yellow-500/15";

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-3 opacity-85">
      <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${bg} to-transparent`} />
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-15 bg-foreground" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground">{props.title}</p>
          <p className="text-xl font-bold tracking-tight text-muted-foreground">{props.value}</p>
          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1 py-0 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
            {props.okLabel}
          </span>
        </div>
        <div className="p-2 rounded-lg ring-1 bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400">
          {props.icon}
        </div>
      </div>
    </Card>
  );
}

// --------------------
// Page
// --------------------
export default function DashboardPage() {
  const { user, selectedCompany } = useAuth();

  const [range, setRange] = useState<RangeKey>("7D");
  const [chartType, setChartType] = useState<ChartType>("area");
  
  // Estado para integrações e seleção
  const [integrations, setIntegrations] = useState<MLIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("all");
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  
  // Estado para dados do ML
  const [mlData, setMLData] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    todayTicket: 0,
    currentRevenue: 0,
    previousRevenue: 0,
    currentOrders: 0,
    previousOrders: 0,
    loading: true,
  });

  useEffect(() => {
    fetchIntegrations();
  }, [selectedCompany]);

  const fetchIntegrations = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoadingIntegrations(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/integrations/mercadolivre/list?companyId=${selectedCompany.id}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      console.error("Erro ao buscar integrações:", err);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const selectedIntegrationName = useMemo(() => {
    if (selectedIntegration === "all") return "Todas as lojas";
    const integration = integrations.find((i) => i.id === selectedIntegration);
    return integration?.nickname || integration?.store_name || "Loja selecionada";
  }, [selectedIntegration, integrations]);

  const goalPercent = useMemo(() => {
    const p = (mockGoal.atual / Math.max(1, mockGoal.meta)) * 100;
    return clamp(p, 0, 100);
  }, []);

  const faltam = useMemo(() => Math.max(0, mockGoal.meta - mockGoal.atual), []);

  return (
    <div className="min-h-screen bg-background">
      {/* “gradient-mesh” via Tailwind */}
      <div className="absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary))_0%,transparent_35%),radial-gradient(circle_at_80%_30%,hsl(var(--accent))_0%,transparent_35%),radial-gradient(circle_at_60%_80%,hsl(var(--secondary))_0%,transparent_35%)]" />

      <div className="container py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-foreground">
                Dashboard de Vendas
              </h1>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    <Store className="h-3 w-3" />
                    {loadingIntegrations ? "..." : selectedIntegrationName}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setSelectedIntegration("all")}
                    className={selectedIntegration === "all" ? "bg-accent" : ""}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Todas as lojas ({integrations.length})
                  </DropdownMenuItem>
                  {integrations.map((integration) => (
                    <DropdownMenuItem
                      key={integration.id}
                      onClick={() => setSelectedIntegration(integration.id)}
                      className={selectedIntegration === integration.id ? "bg-accent" : ""}
                    >
                      <Store className="h-4 w-4 mr-2" />
                      {integration.nickname || integration.store_name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-muted-foreground text-sm">
              Análise das suas vendas no Mercado Livre{user?.name ? ` • ${user.name}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* espaço para ações futuras */}
          </div>
        </div>

        {/* Alerta de integrações expiradas */}
        <ExpiredIntegrationsAlert />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <KpiCard
            title="Receita Hoje"
            value={mlData.loading ? "..." : formatBRL(mlData.todayRevenue)}
            delta={{ value: "-100.0%", down: true }}
            accent="primary"
            icon={<DollarSign className="h-5 w-5" />}
          />

          <KpiCard
            title="Pedidos Hoje"
            value={mlData.loading ? "..." : mlData.todayOrders}
            delta={{ value: "-100.0%", down: true }}
            accent="success"
            icon={<ShoppingCart className="h-5 w-5" />}
          />

          <KpiCard
            title="Ticket Médio Hoje"
            value={mlData.loading ? "..." : formatBRL(mlData.todayTicket)}
            delta={{ value: "-100.0%", down: true }}
            accent="accent"
            icon={<TrendingUp className="h-5 w-5" />}
          />

          <KpiCard
            title="Estoque Baixo"
            value={
              <span>
                {mockKpis.estoqueBaixoSkus} <span className="text-lg">SKUs</span>
              </span>
            }
            delta={{ value: "!", down: true }}
            accent="destructive"
            icon={<TriangleAlert className="h-5 w-5" />}
          />

          <div className="grid grid-cols-2 gap-2">
            <TinyStatusCard
              title="Sem Clips"
              value={mockKpis.semClips}
              okLabel="Tudo ok!"
              tint="orange"
              icon={<CircleCheckBig className="h-4 w-4" />}
            />
            <TinyStatusCard
              title="Poucas Fotos"
              value={mockKpis.poucasFotos}
              okLabel="Tudo ok!"
              tint="yellow"
              icon={<CircleCheckBig className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* ML Sales Analytics (hidden - apenas para coletar dados) */}
        <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
          <MLSalesAnalytics
            integrationId={selectedIntegration === "all" ? undefined : selectedIntegration}
            onDataChange={(data) => {
              console.log("[Dashboard] Dados ML recebidos:", data);
              setMLData({
                todayRevenue: data.todayRevenue,
                todayOrders: data.todayOrders,
                todayTicket: data.todayTicket,
                currentRevenue: data.currentPeriod?.totals.revenue || 0,
                previousRevenue: data.previousPeriod?.totals.revenue || 0,
                currentOrders: data.currentPeriod?.totals.orders || 0,
                previousOrders: data.previousPeriod?.totals.orders || 0,
                loading: data.loading,
              });
            }}
          />
        </div>

        {/* Main grid: Chart + Right column */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sales Chart */}
          <ShimmerCard className="lg:col-span-3 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
                    <ChartColumn className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">Análise de Vendas</CardTitle>
                    <p className="text-xs text-muted-foreground">Evolução dia a dia vs mesmo período anterior</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Chart type toggle */}
                  <div className="flex items-center p-1 rounded-lg bg-secondary/40 border border-border/50">
                    <button
                      className={
                        "p-1.5 rounded-md transition-all duration-200 " +
                        (chartType === "area"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                      }
                      onClick={() => setChartType("area")}
                      type="button"
                    >
                      <ChartArea className="h-4 w-4" />
                    </button>
                    <button
                      className={
                        "p-1.5 rounded-md transition-all duration-200 " +
                        (chartType === "bar"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                      }
                      onClick={() => setChartType("bar")}
                      type="button"
                    >
                      <ChartColumn className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Range buttons */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/40 border border-border/50">
                    {(["7D", "14D", "30D"] as RangeKey[]).map((r) => (
                      <button
                        key={r}
                        className={
                          "px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 " +
                          (range === r
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                        }
                        onClick={() => setRange(r)}
                        type="button"
                      >
                        {r}
                      </button>
                    ))}
                    <button
                      className="p-1.5 rounded-md transition-all duration-200 flex items-center gap-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      type="button"
                      title="Selecionar período (em breve)"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Delta pill */}
                  <span className="hidden sm:inline-flex items-center rounded-full border bg-destructive/10 border-destructive/30 text-destructive px-2.5 py-0.5 text-xs font-semibold">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {percent(mockSales.deltaPercent)}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Período Atual</p>
                  <p className="text-lg font-bold text-primary">
                    {mlData.loading ? "..." : formatBRL(mlData.currentRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {mlData.loading ? "" : `${mlData.currentOrders} pedidos`}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Período Anterior</p>
                  <p className="text-lg font-bold text-muted-foreground">
                    {mlData.loading ? "..." : formatBRL(mlData.previousRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {mlData.loading ? "" : `${mlData.previousOrders} pedidos`}
                  </p>
                </div>
              </div>

              {/* Chart placeholder */}
              <div className="h-[240px] w-full rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-center">
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {chartType === "area" ? "Área" : "Colunas"} • {range}
                  </p>
                  <p className="text-xs text-muted-foreground">Placeholder do gráfico (Recharts entra depois)</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="rounded w-4 h-0.5 bg-primary" />
                  <span className="text-muted-foreground">Período Atual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded w-4 h-0.5 bg-muted-foreground/50" />
                  <span className="text-muted-foreground">Período Anterior</span>
                </div>
              </div>
            </CardContent>
          </ShimmerCard>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* Monthly goal */}
            <ShimmerCard className="overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-destructive/15 text-destructive">
                      <Target className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm capitalize">Meta de {mockGoal.monthLabel}</CardTitle>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Configurar meta (em breve)">
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5 text-[10px] font-medium">
                      <TriangleAlert className="h-3 w-3" />
                      !
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatBRL(mockGoal.atual)}</p>
                      <p className="text-[10px] text-muted-foreground">de {formatBRL(mockGoal.meta)}</p>
                      <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">
                        Faltam {formatBRL(faltam)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{Math.round(goalPercent)}%</p>
                    </div>
                  </div>

                  {/* progress */}
                  <div className="relative w-full overflow-hidden rounded-full h-2 bg-secondary">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                      style={{ width: `${goalPercent}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg p-3 border bg-destructive/10 border-destructive/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Projeção fim do mês</p>
                        <p className="text-xs font-medium text-foreground">{formatBRL(mockGoal.projecao)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-destructive">
                        {Math.round((mockGoal.projecao / Math.max(1, mockGoal.meta)) * 100)}%
                      </p>
                      <p className="text-[9px] text-muted-foreground">Acelerar vendas</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-secondary/30 rounded-md p-2">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground">{mockGoal.diasRestantes}</p>
                    </div>
                    <p className="text-[9px] text-muted-foreground">dias restantes</p>
                  </div>

                  <div className="bg-secondary/30 rounded-md p-2">
                    <p className="text-sm font-bold text-destructive">{mockGoal.vsEsperado}%</p>
                    <p className="text-[9px] text-muted-foreground">vs esperado</p>
                  </div>
                </div>
              </CardContent>
            </ShimmerCard>

            {/* Category chart (placeholder) */}
            <Card className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-3 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-purple-500/15 to-transparent" />
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-purple-500/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">Vendas por Categoria</p>
                  <p className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">{mockCategory.count}</p>
                  <p className="text-[10px] text-purple-600/80 dark:text-purple-300/80 flex items-center gap-1">
                    {formatBRL(mockCategory.total)} total →
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {mockCategory.top.map((c) => (
                      <div key={c.name} className="flex items-center gap-1 opacity-80 hover:opacity-100 transition">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[9px] truncate max-w-[70px] text-muted-foreground">{c.name}</span>
                        <span className="text-[9px] font-bold text-muted-foreground">
                          {c.percent}% • {formatBRL(c.value)}
                        </span>
                      </div>
                    ))}
                    <span className="text-[9px] text-muted-foreground">+3</span>
                  </div>
                </div>

                {/* mini pie placeholder */}
                <div className="w-20 h-20 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-center text-[10px] text-muted-foreground">
                  Pie
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom row: Top products + Contribution margin */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Products */}
          <ShimmerCard className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">Top 5 Produtos</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary/40 px-2 py-1 rounded-md">30 dias</span>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-2">
                {mockTopProducts.map((p) => (
                  <div
                    key={p.rank}
                    className="relative p-2.5 rounded-xl bg-secondary/25 hover:bg-secondary/40 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ring-1 bg-purple-500/15 text-purple-600 ring-purple-500/25 dark:text-purple-400">
                        {p.rank}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate hover:text-primary transition-colors">
                          {p.name}
                        </p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          {p.vendas} vendas
                        </span>
                      </div>

                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {p.valor}
                      </p>
                    </div>

                    <div className="h-1 w-full rounded-full bg-secondary/70 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500/70 to-purple-500/30 transition-all duration-700"
                        style={{ width: `${p.bar}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </ShimmerCard>

          {/* Contribution margin */}
          <ShimmerCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Margem de Contribuição</h3>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Atualizar (em breve)">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-primary bg-secondary/40 px-2 py-1 rounded-md cursor-pointer hover:underline">
                  Gerenciar
                </span>
              </div>
            </div>

            {/* filter chips */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-1.5">
                <button className="px-2 py-1 text-[10px] rounded-md hover:bg-muted transition text-muted-foreground">
                  Sem Ads <span className="text-muted-foreground">(5)</span>
                </button>
                <button className="px-2 py-1 text-[10px] rounded-md hover:bg-emerald-500/10 transition text-muted-foreground">
                  0-5% <span className="text-muted-foreground">(0)</span>
                </button>
                <button className="px-2 py-1 text-[10px] rounded-md hover:bg-amber-500/10 transition text-muted-foreground">
                  5-10% <span className="text-muted-foreground">(0)</span>
                </button>
                <button className="px-2 py-1 text-[10px] rounded-md hover:bg-red-500/10 transition text-muted-foreground">
                  10%+ <span className="text-muted-foreground">(0)</span>
                </button>
              </div>
            </div>

            {/* list */}
            <div className="space-y-2">
              {mockContribution.map((p) => (
                <div
                  key={p.mlb}
                  className="relative p-2.5 rounded-xl bg-secondary/25 hover:bg-secondary/40 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ring-1 bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400">
                      {p.rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate hover:text-primary transition-colors">
                        {p.name}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <button
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded hover:bg-primary/15 transition"
                          title="Copiar MLB"
                          onClick={() => navigator.clipboard?.writeText(p.mlb)}
                          type="button"
                        >
                          <span className="truncate">{p.mlb}</span>
                          <Copy className="h-3 w-3 opacity-80" />
                        </button>

                        <span className="text-xs text-muted-foreground">
                          {formatBRL(p.preco)} • {p.un} un.
                        </span>
                      </div>
                    </div>

                    <span className="text-xs text-muted-foreground italic">Sem custo</span>
                  </div>

                  <div className="h-1 w-full rounded-full bg-secondary/70 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-emerald-500/30 transition-all duration-700 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </ShimmerCard>
        </div>

        {/* Bottom: Reputation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="rounded-2xl border border-destructive/20 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" />
                Reputação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Não foi possível carregar a reputação.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
