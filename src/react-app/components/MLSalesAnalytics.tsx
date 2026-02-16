import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { apiRequest } from "@/react-app/lib/apiClient";
import { useAuth } from "@/react-app/contexts/AuthContext";

interface DailyData {
  date: string;
  revenue: number;
  orders: number;
}

interface SummaryData {
  timezone: string;
  from: string;
  to: string;
  mode: "gross" | "net";
  totals: {
    revenue: number;
    orders: number;
    avg_ticket: number;
  };
  daily: DailyData[];
}

interface MLIntegration {
  id: string;
  nickname: string;
  store_name: string;
}

export interface MLSalesData {
  todayRevenue: number;
  todayOrders: number;
  todayTicket: number;
  currentPeriod: SummaryData | null;
  previousPeriod: SummaryData | null;
  loading: boolean;
  error: string;
}

interface MLSalesAnalyticsProps {
  integrationId?: string; // Se undefined, usa todas as integrações
  onDataChange?: (data: MLSalesData) => void;
}

export default function MLSalesAnalytics({ integrationId, onDataChange }: MLSalesAnalyticsProps) {
  const { selectedCompany } = useAuth();
  const [integrations, setIntegrations] = useState<MLIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<SummaryData | null>(null);
  const [previousPeriod, setPreviousPeriod] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string>("");

  // Sincronizar selectedIntegration com integrationId prop
  useEffect(() => {
    if (integrationId !== undefined) {
      setSelectedIntegration(integrationId);
    }
  }, [integrationId]);

  // Buscar integrações ao montar
  useEffect(() => {
    if (!selectedCompany) return;
    
    const fetchIntegrations = async () => {
      try {
        const data = await apiRequest<{ integrations: MLIntegration[] }>(
          `/api/integrations/mercadolivre/list?companyId=${selectedCompany.id}`
        );
        setIntegrations(data.integrations || []);
        // Só define integração padrão se integrationId não foi passado
        if (integrationId === undefined && data.integrations.length > 0) {
          setSelectedIntegration(data.integrations[0].id);
        }
      } catch (err) {
        console.error("Erro ao buscar integrações:", err);
      }
    };

    fetchIntegrations();
  }, [selectedCompany, integrationId]);

  // Buscar dados ao selecionar integração
  useEffect(() => {
    console.log("[MLSalesAnalytics] useEffect triggered", {
      selectedCompany: selectedCompany?.id,
      selectedIntegration,
      integrationId,
    });
    
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedIntegration, selectedCompany]);

  const fetchData = async () => {
    if (!selectedCompany) return;

    console.log("[MLSalesAnalytics] Iniciando fetchData", {
      selectedCompany: selectedCompany.id,
      selectedIntegration,
      integrationId,
    });

    setLoading(true);
    setError("");

    try {
      // Calcular períodos (timezone -03:00)
      const today = new Date();
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Período atual: do dia 1 até hoje
      const currentFrom = formatDate(currentMonthStart);
      const currentTo = formatDate(today);

      // Período anterior: mesmo número de dias, mas no mês anterior
      const daysInCurrentPeriod = Math.floor((today.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const previousMonthEnd = new Date(previousMonthStart);
      previousMonthEnd.setDate(previousMonthEnd.getDate() + daysInCurrentPeriod - 1);

      const previousFrom = formatDate(previousMonthStart);
      const previousTo = formatDate(previousMonthEnd);

      // Construir URLs com integration_id opcional
      const integrationParam = selectedIntegration ? `&integration_id=${selectedIntegration}` : "";

      // Buscar dados dos dois períodos
      const [current, previous] = await Promise.all([
        apiRequest<SummaryData>(
          `/api/ml-analytics/summary?companyId=${selectedCompany.id}${integrationParam}&from=${currentFrom}&to=${currentTo}&mode=gross`
        ),
        apiRequest<SummaryData>(
          `/api/ml-analytics/summary?companyId=${selectedCompany.id}${integrationParam}&from=${previousFrom}&to=${previousTo}&mode=gross`
        ),
      ]);

      setCurrentPeriod(current);
      setPreviousPeriod(previous);

      console.log("[MLSalesAnalytics] Dados recebidos:", {
        currentRevenue: current.totals.revenue,
        currentOrders: current.totals.orders,
        previousRevenue: previous.totals.revenue,
        previousOrders: previous.totals.orders,
        dailyCount: current.daily.length,
      });

      // Notificar parent component sobre mudança de dados
      if (onDataChange) {
        const todayData = current.daily.find((d) => d.date === formatDate(new Date())) || { revenue: 0, orders: 0 };
        const ticketMedioHoje = todayData.orders > 0 ? todayData.revenue / todayData.orders : 0;

        console.log("[MLSalesAnalytics] Notificando parent:", {
          todayRevenue: todayData.revenue,
          todayOrders: todayData.orders,
          todayTicket: ticketMedioHoje,
        });

        onDataChange({
          todayRevenue: todayData.revenue,
          todayOrders: todayData.orders,
          todayTicket: ticketMedioHoje,
          currentPeriod: current,
          previousPeriod: previous,
          loading: false,
          error: "",
        });
      }
    } catch (err: any) {
      console.error("Erro ao buscar dados:", err);
      setError(err.message || "Erro ao buscar dados de vendas");
      
      // Notificar parent sobre erro
      if (onDataChange) {
        onDataChange({
          todayRevenue: 0,
          todayOrders: 0,
          todayTicket: 0,
          currentPeriod: null,
          previousPeriod: null,
          loading: false,
          error: err.message || "Erro ao buscar dados de vendas",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Variação entre períodos
  const variation = currentPeriod && previousPeriod
    ? ((currentPeriod.totals.revenue - previousPeriod.totals.revenue) / previousPeriod.totals.revenue) * 100
    : 0;

  // Dados para o gráfico (alinhados por dia do mês)
  const chartData = useMemo(() => {
    if (!currentPeriod || !previousPeriod) return [];

    const data: any[] = [];
    const maxDays = Math.max(currentPeriod.daily.length, previousPeriod.daily.length);

    for (let i = 0; i < maxDays; i++) {
      const currentDay = currentPeriod.daily[i];
      const previousDay = previousPeriod.daily[i];

      data.push({
        day: i + 1,
        atual: currentDay?.revenue || 0,
        anterior: previousDay?.revenue || 0,
      });
    }

    return data;
  }, [currentPeriod, previousPeriod]);

  if (!selectedCompany) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Selecione uma empresa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Análise de Vendas - Mercado Livre</h2>
        <div className="flex items-center gap-4">
          <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione a loja" />
            </SelectTrigger>
            <SelectContent>
              {integrations.map((integration) => (
                <SelectItem key={integration.id} value={integration.id}>
                  {integration.nickname || integration.store_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchData} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}



      {/* Gráfico de Análise */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Vendas</CardTitle>
          {currentPeriod && previousPeriod && (
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                Total Período Atual: <span className="font-semibold text-foreground">
                  {formatCurrency(currentPeriod.totals.revenue)}
                </span>
              </div>
              <div>
                Total Período Anterior: <span className="font-semibold text-foreground">
                  {formatCurrency(previousPeriod.totals.revenue)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                Variação:
                <span className={`font-semibold ${variation >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {variation >= 0 ? <TrendingUp className="h-4 w-4 inline" /> : <TrendingDown className="h-4 w-4 inline" />}
                  {Math.abs(variation).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" label={{ value: "Dia do mês", position: "insideBottom", offset: -5 }} />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="atual" stroke="#3b82f6" name="Período Atual" strokeWidth={2} />
                <Line type="monotone" dataKey="anterior" stroke="#94a3b8" name="Período Anterior" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta do Mês */}
      {currentPeriod && (
        <Card>
          <CardHeader>
            <CardTitle>Meta de {new Date().toLocaleDateString("pt-BR", { month: "long" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faturamento Atual:</span>
                <span className="font-semibold">{formatCurrency(currentPeriod.totals.revenue)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pedidos no período:</span>
                <span>{currentPeriod.totals.orders}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Ticket médio:</span>
                <span>{formatCurrency(currentPeriod.totals.avg_ticket)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
