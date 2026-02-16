import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { TrendingUp, Package } from "lucide-react";

interface ProductData {
  sku: string;
  name: string;
  units: number;
  revenue: number;
}

interface AnalyticsChartProps {
  data: ProductData[];
  title: string;
  type: "revenue" | "units";
}

export function AnalyticsChart({ data, title, type }: AnalyticsChartProps) {
  const chartData = useMemo(() => {
    // Get top 10 products by selected metric
    const sorted = [...data].sort((a, b) => {
      return type === "revenue" ? b.revenue - a.revenue : b.units - a.units;
    }).slice(0, 10);

    const maxValue = Math.max(...sorted.map(p => type === "revenue" ? p.revenue : p.units));
    
    return sorted.map(product => ({
      ...product,
      percentage: maxValue > 0 
        ? ((type === "revenue" ? product.revenue : product.units) / maxValue) * 100
        : 0,
    }));
  }, [data, type]);

  const formatValue = (value: number) => {
    if (type === "revenue") {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString('pt-BR');
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {type === "revenue" ? <TrendingUp className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              {type === "revenue" ? <TrendingUp className="w-8 h-8 text-gray-400" /> : <Package className="w-8 h-8 text-gray-400" />}
            </div>
            <p className="text-gray-500 font-medium">Sem dados disponíveis</p>
            <p className="text-sm text-gray-400 mt-1">Importe planilhas para ver o gráfico</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === "revenue" ? <TrendingUp className="w-5 h-5" /> : <Package className="w-5 h-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {chartData.map((item, index) => (
            <div key={item.sku} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-gray-500 dark:text-gray-400 font-medium w-6">
                    #{index + 1}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white ml-2">
                  {formatValue(type === "revenue" ? item.revenue : item.units)}
                </span>
              </div>
              <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                    type === "revenue"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600"
                      : "bg-gradient-to-r from-blue-500 to-cyan-600"
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
