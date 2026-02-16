import { useState, useEffect } from "react";
import { GlobalBank } from "@/react-app/lib/finance-types";

const STORAGE_KEY_GLOBAL_BANKS = "kryzer-global-banks";

const DEFAULT_BANKS: GlobalBank[] = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "077", nome: "Banco Inter" },
  { codigo: "260", nome: "Nu Pagamentos (Nubank)" },
  { codigo: "290", nome: "Pagseguro" },
  { codigo: "323", nome: "Mercado Pago" },
  { codigo: "380", nome: "PicPay" },
  { codigo: "336", nome: "Banco C6" },
  { codigo: "102", nome: "XP Investimentos" },
  { codigo: "069", nome: "Banco Crefisa" },
  { codigo: "136", nome: "Unicred" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "756", nome: "Sicoob" },
  { codigo: "041", nome: "Banrisul" },
  { codigo: "085", nome: "Ailos" },
  { codigo: "097", nome: "Credisis" },
  { codigo: "133", nome: "Cresol" },
  { codigo: "212", nome: "Banco Original" },
  { codigo: "389", nome: "Banco Mercantil" },
  { codigo: "422", nome: "Banco Safra" },
  { codigo: "505", nome: "Credit Suisse" },
  { codigo: "623", nome: "Banco Pan" },
  { codigo: "634", nome: "Banco Triângulo" },
  { codigo: "637", nome: "Banco Sofisa" },
  { codigo: "643", nome: "Banco Pine" },
  { codigo: "653", nome: "Banco Indusval" },
  { codigo: "655", nome: "Banco Votorantim" },
  { codigo: "741", nome: "Banco Ribeirão Preto" },
  { codigo: "745", nome: "Citibank" },
  { codigo: "121", nome: "Banco Agibank" },
  { codigo: "197", nome: "Stone" },
  { codigo: "208", nome: "BTG Pactual" },
  { codigo: "218", nome: "Banco BS2" },
  { codigo: "224", nome: "Banco Fibra" },
  { codigo: "246", nome: "Banco ABC Brasil" },
  { codigo: "252", nome: "Banco Fator" },
  { codigo: "265", nome: "Banco Cedula" },
  { codigo: "318", nome: "Banco BMG" },
  { codigo: "335", nome: "Banco Digio" },
  { codigo: "340", nome: "Super Pagamentos (Superdigi​tal)" },
  { codigo: "364", nome: "Gerencianet Pagamentos" },
  { codigo: "403", nome: "Cora" },
  { codigo: "450", nome: "Fitbank" },
  { codigo: "611", nome: "Banco Paulista" },
  { codigo: "626", nome: "Banco C6 Consignado" },
  { codigo: "654", nome: "Banco Digimais" },
  { codigo: "735", nome: "Neon" },
];

export function useGlobalBanks() {
  const [globalBanks, setGlobalBanks] = useState<GlobalBank[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GLOBAL_BANKS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BANKS;
      }
    } catch {
      // Erro ao parsear, retorna padrão
    }
    return DEFAULT_BANKS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GLOBAL_BANKS, JSON.stringify(globalBanks));
    } catch (error) {
      console.error("Erro ao salvar bancos globais:", error);
    }
  }, [globalBanks]);

  const getBankByCode = (codigo: string): GlobalBank | undefined => {
    return globalBanks.find(b => b.codigo === codigo);
  };

  const addGlobalBank = (bank: GlobalBank) => {
    setGlobalBanks(prev => [...prev, bank]);
  };

  const updateGlobalBank = (bank: GlobalBank) => {
    setGlobalBanks(prev => prev.map(b => (b.codigo === bank.codigo ? bank : b)));
  };

  const deleteGlobalBank = (codigo: string) => {
    setGlobalBanks(prev => prev.filter(b => b.codigo !== codigo));
  };

  return {
    globalBanks,
    getBankByCode,
    addGlobalBank,
    updateGlobalBank,
    deleteGlobalBank,
  };
}
