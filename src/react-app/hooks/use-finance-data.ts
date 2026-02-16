import { useState, useEffect } from "react";
import { Category, BankAccount, Company, Payable, Payment, Receivable, Receipt, SupplierClient, PAYMENT_METHODS } from "@/react-app/lib/finance-types";
import { useGlobalBanks } from "@/react-app/hooks/use-global-banks";

export function useFinanceData() {
  const { getBankByCode } = useGlobalBanks();
  
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("company-default");
  const [payables, setPayables] = useState<Payable[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [suppliersClients, setSuppliersClients] = useState<SupplierClient[]>([]);

  // Fetch all data from database on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        };

        // Fetch companies
        const companiesRes = await fetch("/api/companies", { credentials: "include", headers });
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          if (companiesData.companies && companiesData.companies.length > 0) {
            setCompanies(companiesData.companies);
            setActiveCompanyId(companiesData.activeCompanyId || companiesData.companies[0].id);
          } else {
            // Create default company if none exist
            const defaultCompany: Company = {
              id: "company-default",
              name: "Minha Empresa",
            };
            setCompanies([defaultCompany]);
            setActiveCompanyId("company-default");
          }
        }

        // Fetch banks
        const banksRes = await fetch("/api/finance/banks", { credentials: "include", headers });
        if (banksRes.ok) {
          const banksData = await banksRes.json();
          setBanks(banksData.banks || []);
        }

        // Fetch categories
        const categoriesRes = await fetch("/api/finance/categories", { credentials: "include", headers });
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          // Map database categories to frontend format
          const mappedCategories = (categoriesData.categories || []).map((cat: any) => ({
            id: String(cat.id),
            name: cat.name,
            type: cat.type as "receita" | "despesa",
            groupId: cat.group_name || "",
            isDefault: Boolean(cat.is_native),
          }));
          setCategories(mappedCategories);
        } else {
          setCategories([]);
        }

        // Fetch payables
        const payablesRes = await fetch("/api/finance/payables", { credentials: "include", headers });
        if (payablesRes.ok) {
          const payablesData = await payablesRes.json();
          setPayables(payablesData.payables || []);
        }

        // Fetch payments
        const paymentsRes = await fetch("/api/finance/payments", { credentials: "include", headers });
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setPayments(paymentsData.payments || []);
        }

        // Fetch receivables
        const receivablesRes = await fetch("/api/finance/receivables", { credentials: "include", headers });
        if (receivablesRes.ok) {
          const receivablesData = await receivablesRes.json();
          setReceivables(receivablesData.receivables || []);
        }

        // Fetch receipts
        const receiptsRes = await fetch("/api/finance/receipts", { credentials: "include", headers });
        if (receiptsRes.ok) {
          const receiptsData = await receiptsRes.json();
          setReceipts(receiptsData.receipts || []);
        }

        // Fetch suppliers/clients
        const scRes = await fetch("/api/finance/suppliers-clients", { credentials: "include", headers });
        if (scRes.ok) {
          const scData = await scRes.json();
          setSuppliersClients(scData.suppliersClients || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper functions for database operations
  const addCategory = async (category: Category) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/finance/categories", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: category.name,
        type: category.type,
        group_name: category.groupId,
      }),
    });
    if (res.ok) {
      // Refetch categories to get the server-generated ID
      const categoriesRes = await fetch("/api/finance/categories", { credentials: "include", headers: { "Authorization": `Bearer ${token}` } });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const mappedCategories = (categoriesData.categories || []).map((cat: any) => ({
          id: String(cat.id),
          name: cat.name,
          type: cat.type as "receita" | "despesa",
          groupId: cat.group_name || "",
          isDefault: Boolean(cat.is_native),
        }));
        setCategories(mappedCategories);
      }
    }
  };

  const updateCategory = async (category: Category) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/finance/categories/${category.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: category.name,
        type: category.type,
        group_name: category.groupId,
      }),
    });
    if (res.ok) {
      // Refetch categories
      const categoriesRes = await fetch("/api/finance/categories", { credentials: "include", headers: { "Authorization": `Bearer ${token}` } });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const mappedCategories = (categoriesData.categories || []).map((cat: any) => ({
          id: String(cat.id),
          name: cat.name,
          type: cat.type as "receita" | "despesa",
          groupId: cat.group_name || "",
          isDefault: Boolean(cat.is_native),
        }));
        setCategories(mappedCategories);
      }
    }
  };

  const deleteCategory = async (id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/finance/categories/${id}`, { 
      method: "DELETE",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (res.ok) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const restoreCategories = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/finance/categories/restore", {
      method: "POST",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (res.ok) {
      // Refetch categories after restore
      const categoriesRes = await fetch("/api/finance/categories", { credentials: "include", headers: { "Authorization": `Bearer ${token}` } });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const mappedCategories = (categoriesData.categories || []).map((cat: any) => ({
          id: String(cat.id),
          name: cat.name,
          type: cat.type as "receita" | "despesa",
          groupId: cat.group_name || "",
          isDefault: Boolean(cat.is_native),
        }));
        setCategories(mappedCategories);
      }
    }
  };

  const addBank = async (bank: BankAccount) => {
    const token = localStorage.getItem("token");
    const globalBank = getBankByCode(bank.bankCode);
    const res = await fetch("/api/finance/banks", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        bank_code: bank.bankCode,
        bank_name: globalBank?.nome || bank.accountName,
        account_name: bank.accountName,
        agency: null,
        account_number: null,
        account_digit: null,
        initial_balance: bank.initialBalance,
        overdraft_limit: bank.overdraftLimit || 0,
        start_date: bank.balanceStartDate || null,
        is_default: bank.isDefault ? 1 : 0,
      }),
    });
    if (res.ok) {
      // Refetch banks to get the server-generated ID
      const banksRes = await fetch("/api/finance/banks", { credentials: "include", headers: { "Authorization": `Bearer ${token}` } });
      if (banksRes.ok) {
        const banksData = await banksRes.json();
        setBanks(banksData.banks || []);
      }
    }
  };

  const updateBank = async (bank: BankAccount) => {
    const token = localStorage.getItem("token");
    const globalBank = getBankByCode(bank.bankCode);
    const res = await fetch(`/api/finance/banks/${bank.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        bank_code: bank.bankCode,
        bank_name: globalBank?.nome || bank.accountName,
        account_name: bank.accountName,
        agency: null,
        account_number: null,
        account_digit: null,
        initial_balance: bank.initialBalance,
        overdraft_limit: bank.overdraftLimit || 0,
        start_date: bank.balanceStartDate || null,
        is_default: bank.isDefault ? 1 : 0,
        is_active: 1,
      }),
    });
    if (res.ok) {
      // Refetch banks to get updated data
      const banksRes = await fetch("/api/finance/banks", { credentials: "include", headers: { "Authorization": `Bearer ${token}` } });
      if (banksRes.ok) {
        const banksData = await banksRes.json();
        setBanks(banksData.banks || []);
      }
    }
  };

  const deleteBank = async (id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/finance/banks/${id}`, { 
      method: "DELETE",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (res.ok) {
      setBanks(banks.filter(b => b.id !== id));
    }
  };

  const addCompany = async (company: Company) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/companies", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(company),
    });
    if (res.ok) {
      setCompanies([...companies, company]);
    }
  };

  const updateCompany = async (company: Company) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(company),
    });
    if (res.ok) {
      setCompanies(companies.map(c => c.id === company.id ? company : c));
    }
  };

  const deleteCompany = async (id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/companies/${id}`, { 
      method: "DELETE",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (res.ok) {
      setCompanies(companies.filter(c => c.id !== id));
    }
  };

  const addPayable = async (payable: Payable) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/payables", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payable),
    });
    if (res.ok) {
      setPayables([...payables, payable]);
    }
  };

  const updatePayable = async (payable: Payable) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/payables/${payable.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payable),
    });
    if (res.ok) {
      setPayables(payables.map(p => p.id === payable.id ? payable : p));
    }
  };

  const deletePayable = async (id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/payables/${id}`, { 
      method: "DELETE",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (res.ok) {
      setPayables(payables.filter(p => p.id !== id));
    }
  };

  const addPayment = async (payment: Payment) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/payments", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payment),
    });
    if (res.ok) {
      setPayments([...payments, payment]);
    }
  };

  const addReceivable = async (receivable: Receivable) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/receivables", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(receivable),
    });
    if (res.ok) {
      setReceivables([...receivables, receivable]);
    }
  };

  const updateReceivable = async (receivable: Receivable) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/receivables/${receivable.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(receivable),
    });
    if (res.ok) {
      setReceivables(receivables.map(r => r.id === receivable.id ? receivable : r));
    }
  };

  const deleteReceivable = async (id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/receivables/${id}`, { 
      method: "DELETE",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (res.ok) {
      setReceivables(receivables.filter(r => r.id !== id));
    }
  };

  const addReceipt = async (receipt: Receipt) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/receipts", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(receipt),
    });
    if (res.ok) {
      setReceipts([...receipts, receipt]);
    }
  };

  const addSupplierClient = async (sc: SupplierClient) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/suppliers-clients", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(sc),
    });
    if (res.ok) {
      setSuppliersClients([...suppliersClients, sc]);
    }
  };

  const updateSupplierClient = async (sc: SupplierClient) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/suppliers-clients/${sc.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(sc),
    });
    if (res.ok) {
      setSuppliersClients(suppliersClients.map(s => s.id === sc.id ? sc : s));
    }
  };

  const deleteSupplierClient = async (id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/suppliers-clients/${id}`, { 
      method: "DELETE",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (res.ok) {
      setSuppliersClients(suppliersClients.filter(s => s.id !== id));
    }
  };

  const getBankBalance = (bankId: string): number => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return 0;
    
    const bankPayments = payments.filter(p => p.bankId === bankId);
    const totalPaid = bankPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const bankReceipts = receipts.filter(r => r.bankId === bankId);
    const totalReceived = bankReceipts.reduce((sum, r) => sum + r.amount, 0);
    
    return bank.initialBalance - totalPaid + totalReceived;
  };

  const getBankName = (bankId: string): string => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return "—";
    
    const globalBank = getBankByCode(bank.bankCode);
    return globalBank ? globalBank.nome : bank.accountName;
  };

  const getBankLogo = (bankId: string): string | undefined => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return undefined;
    
    const globalBank = getBankByCode(bank.bankCode);
    return globalBank?.logoUrl;
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "—";
  };

  const getPaymentMethodLabel = (value: string): string => {
    const method = PAYMENT_METHODS.find(m => m.value === value);
    return method ? method.label : value;
  };

  // Filter data by active company
  const companyBanks = banks.filter(b => b.companyId === activeCompanyId);
  const companyPayables = payables.filter(p => p.companyId === activeCompanyId);
  const companyPayments = payments.filter(p => p.companyId === activeCompanyId);
  const companyReceivables = receivables.filter(r => r.companyId === activeCompanyId);
  const companyReceipts = receipts.filter(r => r.companyId === activeCompanyId);
  const companySuppliersClients = suppliersClients.filter(s => s.companyId === activeCompanyId);

  return {
    loading,
    categories,
    setCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    restoreCategories,
    banks: companyBanks,
    setBanks,
    addBank,
    updateBank,
    deleteBank,
    companies,
    setCompanies,
    addCompany,
    updateCompany,
    deleteCompany,
    activeCompanyId,
    setActiveCompanyId,
    payables: companyPayables,
    setPayables,
    addPayable,
    updatePayable,
    deletePayable,
    payments: companyPayments,
    setPayments,
    addPayment,
    receivables: companyReceivables,
    setReceivables,
    addReceivable,
    updateReceivable,
    deleteReceivable,
    receipts: companyReceipts,
    setReceipts,
    addReceipt,
    suppliersClients: companySuppliersClients,
    addSupplierClient,
    updateSupplierClient,
    deleteSupplierClient,
    getBankBalance,
    getBankName,
    getBankLogo,
    getCategoryName,
    getPaymentMethodLabel,
    companyPayables,
    companyReceivables,
  };
}
