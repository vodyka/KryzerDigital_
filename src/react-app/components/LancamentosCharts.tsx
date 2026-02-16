import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/react-app/components/ui/card";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon } from "lucide-react";

interface Transaction {
  type: "income" | "expense";
  amount: number;
  transaction_date: string;
  category_name: string | null;
  status: string;
}

interface LancamentosChartsProps {
  transactions: Transaction[];
}

export function LancamentosCharts({ transactions }: LancamentosChartsProps) {
  // Prepare data for monthly trend chart
  const getMonthlyData = () => {
    const monthlyMap = new Map<string, { income: number; expense: number; month: string }>();

    transactions.forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthLabel, income: 0, expense: 0 });
      }

      const data = monthlyMap.get(monthKey)!;
      if (t.type === "income") {
        data.income += Math.abs(t.amount);
      } else {
        data.expense += Math.abs(t.amount);
      }
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  };

  // Prepare data for category distribution
  const getCategoryData = () => {
    const categoryMap = new Map<string, { name: string; value: number; count: number }>();

    transactions
      .filter(t => t.type === "expense" && t.category_name)
      .forEach(t => {
        const category = t.category_name || "Sem categoria";
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { name: category, value: 0, count: 0 });
        }
        const data = categoryMap.get(category)!;
        data.value += Math.abs(t.amount);
        data.count += 1;
      });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  };

  // Prepare data for status distribution
  const getStatusData = () => {
    const paid = transactions.filter(t => t.status === "paid" || t.status === "received");
    const pending = transactions.filter(t => t.status === "pending");

    return [
      { name: "Realizado", value: paid.reduce((sum, t) => sum + Math.abs(t.amount), 0), count: paid.length },
      { name: "Previsto", value: pending.reduce((sum, t) => sum + Math.abs(t.amount), 0), count: pending.length },
    ].filter(d => d.value > 0);
  };

  const monthlyData = getMonthlyData();
  const categoryData = getCategoryData();
  const statusData = getStatusData();

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(142 76% 36%)',
    'hsl(38 92% 50%)',
    'hsl(262 83% 58%)',
  ];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Monthly Trend */}
      {monthlyData.length > 0 && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">Evolução mensal</h3>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={formatCurrency}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value) => formatCurrencyFull(value as number)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="income" fill="hsl(var(--chart-income))" name="Entradas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="hsl(var(--chart-expense))" name="Saídas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Category Distribution */}
      {categoryData.length > 0 && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">Saídas por categoria</h3>
              <p className="text-xs text-muted-foreground">Top 8 categorias</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => {
                  const percent = (entry.value / categoryData.reduce((sum, d) => sum + d.value, 0)) * 100;
                  return percent > 5 ? entry.name : '';
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, _name, props: any) => [
                  `${formatCurrencyFull(value as number)} (${props.payload.count} lançamentos)`,
                  props.payload.name
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {categoryData.slice(0, 4).map((cat, _idx) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-2 w-2 rounded-full shrink-0" 
                    style={{ backgroundColor: COLORS[_idx % COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate">{cat.name}</span>
                </div>
                <span className="font-medium ml-2">{formatCurrencyFull(cat.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Status Distribution */}
      {statusData.length > 0 && (
        <Card className="p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <TrendingDown className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">Status dos lançamentos</h3>
              <p className="text-xs text-muted-foreground">Realizado vs Previsto</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {statusData.map((status) => (
              <div
                key={status.name}
                className="rounded-lg border p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{status.name}</p>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {status.count}
                  </span>
                </div>
                <p className="text-xl font-bold">
                  {formatCurrencyFull(status.value)}
                </p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      status.name === "Realizado" ? "bg-success" : "bg-warning"
                    }`}
                    style={{
                      width: `${(status.value / statusData.reduce((sum, d) => sum + d.value, 0)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
