import { Input } from "@/react-app/components/ui/input";

interface CurrencyInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CurrencyInput({ value, onValueChange, placeholder, className }: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    onValueChange(rawValue);
  };

  const formatDisplay = (val: string) => {
    if (!val) return "";
    const num = parseFloat(val) / 100;
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Input
      type="text"
      value={formatDisplay(value)}
      onChange={handleChange}
      placeholder={placeholder || "0,00"}
      className={className}
    />
  );
}
