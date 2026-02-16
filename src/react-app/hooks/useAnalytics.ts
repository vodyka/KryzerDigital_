import { useState, useEffect, useCallback } from "react";

export interface SpreadsheetData {
  sku: string;
  name: string;
  units: number;
  revenue: number;
  avg_price: number;
}

export interface SlotInfo {
  slot_number: number;
  month_label: string;
  uploaded_at: string;
}

export type PeriodFilter = "30D" | "60D" | "90D" | "3M";

export function useAnalytics() {
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [products, setProducts] = useState<SpreadsheetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsNewUpload, setNeedsNewUpload] = useState(false);

  const loadSlots = useCallback(async () => {
    try {
      const response = await fetch("/api/analytics/spreadsheets");
      const data = await response.json();
      setSlots(data.spreadsheets || []);
    } catch (err) {
      console.error("Error loading slots:", err);
      setError("Erro ao carregar slots");
    }
  }, []);

  const loadProducts = useCallback(async (period: PeriodFilter) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/products?period=${period}`);
      const data = await response.json();
      setProducts(data.products || []);
      setError(null);
    } catch (err) {
      console.error("Error loading products:", err);
      setError("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkRotation = useCallback(async () => {
    try {
      const response = await fetch("/api/analytics/check-rotation");
      const data = await response.json();
      
      if (data.needsRotation) {
        await fetch("/api/analytics/rotate", { method: "POST" });
        setNeedsNewUpload(true);
        await loadSlots();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error checking rotation:", err);
      return false;
    }
  }, [loadSlots]);

  const uploadSpreadsheet = useCallback(async (
    slotNumber: number,
    monthLabel: string,
    data: Omit<SpreadsheetData, "avg_price">[]
  ) => {
    try {
      const response = await fetch(`/api/analytics/spreadsheets/${slotNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthLabel, data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload spreadsheet");
      }

      await loadSlots();
      return { success: true };
    } catch (err) {
      console.error("Error uploading spreadsheet:", err);
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }, [loadSlots]);

  useEffect(() => {
    loadSlots();
    checkRotation();
  }, [loadSlots, checkRotation]);

  return {
    slots,
    products,
    loading,
    error,
    needsNewUpload,
    loadProducts,
    uploadSpreadsheet,
    refreshSlots: loadSlots,
  };
}
