import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/react-app/lib/utils";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Checkbox } from "@/react-app/components/ui/checkbox";

interface MultiSelectStoreProps {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectStore({
  options,
  value,
  onChange,
  placeholder = "Selecione",
  className,
}: MultiSelectStoreProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tempValue, setTempValue] = useState<string[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
        setTempValue(value);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, value]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = tempValue.length === options.length;
  const someSelected = tempValue.length > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setTempValue([]);
    } else {
      setTempValue(options.map((o) => o.id));
    }
  };

  const toggleOption = (id: string) => {
    setTempValue((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onChange(tempValue);
    setOpen(false);
    setSearch("");
  };

  const handleCancel = () => {
    setTempValue(value);
    setOpen(false);
    setSearch("");
  };

  const displayText =
    value.length === 0
      ? placeholder
      : value.length === options.length
      ? "Todas Lojas"
      : `${value.length} loja${value.length > 1 ? "s" : ""}`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "h-[36px] w-[150px] flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          open && "ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
          {displayText}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-[280px] rounded-md border border-border bg-background shadow-lg">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-8 pl-8"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Select All */}
          <div className="p-2 border-b">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded p-1">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                className={cn(someSelected && "data-[state=checked]:bg-primary/50")}
              />
              <span className="text-sm">Tudo</span>
            </label>
          </div>

          {/* Options List */}
          <div className="max-h-[200px] overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Nenhuma loja encontrada
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded p-1"
                  >
                    <Checkbox
                      checked={tempValue.includes(option.id)}
                      onCheckedChange={() => toggleOption(option.id)}
                    />
                    <span className="text-sm truncate flex-1" title={option.label}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-2 border-t flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              className="h-8"
            >
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
