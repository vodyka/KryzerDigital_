import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/react-app/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    value: string;
    isPositive: boolean;
    icon: LucideIcon;
  };
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
}: MetricCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-center">
          <div
            className={`w-12 h-12 ${iconBgColor} ${iconColor} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h6 className="mb-0.5 text-sm text-gray-600 dark:text-gray-400 font-medium">
              {title}
            </h6>
            <h3 className="mb-0 text-2xl font-bold text-gray-900 dark:text-white truncate">
              {value}
            </h3>
            {(subtitle || trend) && (
              <div className="mt-1">
                {trend ? (
                  <small
                    className={`flex items-center gap-1 text-xs font-medium ${
                      trend.isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    <trend.icon className="w-3 h-3" />
                    {trend.value}
                  </small>
                ) : (
                  <small className="text-gray-500 dark:text-gray-400 text-xs">
                    {subtitle}
                  </small>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
