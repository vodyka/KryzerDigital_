import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Building2,
} from "lucide-react";
import { BankIcon } from "@/react-app/components/BankIcon";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/react-app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";

interface Banco {
  id: number;
  bank_code: string;
  bank_name: string;
  account_name: string;
  agency: string;
  account_number: string;
  account_digit: string;
  start_date: string;
  initial_balance: number;
  current_balance: number;
  overdraft_limit: number;
  is_default: boolean;
}

const bancosOptions = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "077", nome: "Inter" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "290", nome: "Pagseguro" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "389", nome: "Banco Mercantil do Brasil" },
  { codigo: "422", nome: "Banco Safra" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "756", nome: "Sicoob" },
  { codigo: "197", nome: "Stone Pagamentos" },
  { codigo: "623", nome: "Banco Pan" },
  { codigo: "655", nome: "Banco Votorantim" },
  { codigo: "654", nome: "Banco Digimais" },
  { codigo: "403", nome: "Cora" },
  { codigo: "102", nome: "XP Investimentos" },
  { codigo: "336", nome: "Banco C6" },
  { codigo: "735", nome: "Neon" },
  { codigo: "136", nome: "Unicred" },
  { codigo: "003", nome: "Banco da Amazônia" },
  { codigo: "004", nome: "Banco do Nordeste" },
  { codigo: "070", nome: "BRB - Banco de Brasília" },
  { codigo: "041", nome: "Banrisul" },
  { codigo: "047", nome: "Banco do Estado de Sergipe" },
  { codigo: "021", nome: "Banestes" },
  { codigo: "085", nome: "Via Credi" },
  { codigo: "121", nome: "Banco Agibank" },
  { codigo: "323", nome: "Mercado Pago" },
  { codigo: "380", nome: "PicPay" },
  { codigo: "250", nome: "BCV" },
  { codigo: "746", nome: "Modal" },
  { codigo: "739", nome: "Banco Cetelem" },
  { codigo: "743", nome: "Banco Semear" },
  { codigo: "100", nome: "Pluxee" },
  { codigo: "133", nome: "Cresol" },
  { codigo: "097", nome: "Credisis" },
  { codigo: "016", nome: "CCM Desp Trans SC e RS" },
  { codigo: "084", nome: "Uniprime Norte do Paraná" },
  { codigo: "091", nome: "Unicred Central RS" },
  { codigo: "099", nome: "Uniprime Central" },
  { codigo: "087", nome: "Unicred Brasil Central" },
  { codigo: "088", nome: "Unicred Central SC" },
  { codigo: "089", nome: "Unicred Central SP" },
  { codigo: "014", nome: "Natixis Brasil" },
  { codigo: "130", nome: "Caruana" },
  { codigo: "000", nome: "Outros" },
];

export default function BancosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    banco: "",
    agencia: "",
    conta: "",
    digitoConta: "",
    dataInicio: "",
    saldoInicial: "",
    nome: "",
    limiteChequeEspecial: "",
  });

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/bank-accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBancos(data.accounts || []);
      }
    } catch (error) {
      console.error("Error loading bank accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (bancoId: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/bank-accounts/${bancoId}/set-default`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        await loadBankAccounts();
      } else {
        alert("Erro ao definir banco padrão");
      }
    } catch (error) {
      console.error("Error setting default bank:", error);
      alert("Erro ao definir banco padrão");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (banco: Banco) => {
    setEditingId(banco.id);
    setFormData({
      banco: banco.bank_code,
      agencia: banco.agency || "",
      conta: banco.account_number || "",
      digitoConta: banco.account_digit || "",
      dataInicio: banco.start_date || "",
      saldoInicial: banco.initial_balance.toString(),
      nome: banco.account_name,
      limiteChequeEspecial: banco.overdraft_limit.toString(),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bancoInfo = bancosOptions.find(b => b.codigo === formData.banco);
    
    setLoading(true);
    try {
      const parseSaldoInicial = (valor: string) => {
        if (!valor) return 0;
        return parseFloat(valor.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
      };

      const bodyData = {
        bank_code: formData.banco,
        bank_name: bancoInfo?.nome || "Banco não identificado",
        account_name: formData.nome,
        agency: formData.agencia,
        account_number: formData.conta,
        account_digit: formData.digitoConta,
        start_date: formData.dataInicio || null,
        initial_balance: parseSaldoInicial(formData.saldoInicial),
        overdraft_limit: parseSaldoInicial(formData.limiteChequeEspecial),
      };

      const url = editingId ? `/api/bank-accounts/${editingId}` : "/api/bank-accounts";
      const method = editingId ? "PUT" : "POST";
      const token = localStorage.getItem("token");

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        await loadBankAccounts();
        setDialogOpen(false);
        setEditingId(null);
        setFormData({
          banco: "",
          agencia: "",
          conta: "",
          digitoConta: "",
          dataInicio: "",
          saldoInicial: "",
          nome: "",
          limiteChequeEspecial: "",
        });
      } else {
        alert(editingId ? "Erro ao atualizar conta bancária" : "Erro ao cadastrar conta bancária");
      }
    } catch (error) {
      console.error("Error saving bank account:", error);
      alert(editingId ? "Erro ao atualizar conta bancária" : "Erro ao cadastrar conta bancária");
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bancos</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie suas contas bancárias</p>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({
            banco: "",
            agencia: "",
            conta: "",
            digitoConta: "",
            dataInicio: "",
            saldoInicial: "",
            nome: "",
            limiteChequeEspecial: "",
          });
          setDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {loading && bancos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
          </CardContent>
        </Card>
      ) : bancos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhuma conta bancária cadastrada
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Clique em "Nova Conta" para adicionar sua primeira conta bancária.
                </p>
                <Button onClick={() => {
                  setEditingId(null);
                  setFormData({
                    banco: "",
                    agencia: "",
                    conta: "",
                    digitoConta: "",
                    dataInicio: "",
                    saldoInicial: "",
                    nome: "",
                    limiteChequeEspecial: "",
                  });
                  setDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Conta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bancos.map((banco) => (
            <Card key={banco.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BankIcon bankCode={banco.bank_code} className="w-12 h-12" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {banco.account_name}
                        </h3>
                        {banco.is_default && (
                          <Badge className="bg-violet-500 hover:bg-violet-600">
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {banco.bank_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!banco.is_default && bancos.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(banco.id)}
                        className="text-xs"
                      >
                        Definir como padrão
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(banco)}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Agência</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {banco.agency || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Conta</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {banco.account_number ? `${banco.account_number}${banco.account_digit ? `-${banco.account_digit}` : ""}` : "-"}
                    </p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo disponível</p>
                      <p className={`text-lg font-bold ${
                        banco.current_balance >= 0 
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {formatarMoeda(banco.current_balance)}
                      </p>
                    </div>
                    {banco.overdraft_limit > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo + Limite:</p>
                        <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                          {formatarMoeda(banco.current_balance + banco.overdraft_limit)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {banco.start_date && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Início: {new Date(banco.start_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar conta bancária" : "Nova conta bancária"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os dados da conta bancária" : "Cadastre uma nova conta bancária para controle financeiro"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="banco">Banco</Label>
              <Select
                value={formData.banco}
                onValueChange={(value) => setFormData({ ...formData, banco: value })}
              >
                <SelectTrigger id="banco">
                  <SelectValue placeholder="Selecione um banco..." />
                </SelectTrigger>
                <SelectContent>
                  {bancosOptions.map((banco) => (
                    <SelectItem key={banco.codigo} value={banco.codigo}>
                      {banco.codigo} - {banco.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  value={formData.agencia}
                  onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                  placeholder="0000"
                />
              </div>

              <div>
                <Label>Conta com dígito</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="00000000"
                    className="flex-1"
                  />
                  <Input
                    value={formData.digitoConta}
                    onChange={(e) => setFormData({ ...formData, digitoConta: e.target.value })}
                    placeholder="0"
                    maxLength={1}
                    className="w-14"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="nome">Nome da conta</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex.: Conta corrente, Conta investimento, Caixinha"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataInicio">Data de início</Label>
                <Input
                  type="date"
                  id="dataInicio"
                  value={formData.dataInicio}
                  onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="saldoInicial">Saldo inicial</Label>
                <Input
                  type="text"
                  id="saldoInicial"
                  value={formData.saldoInicial}
                  onChange={(e) => setFormData({ ...formData, saldoInicial: e.target.value })}
                  placeholder="R$ 0,00"
                  className="text-right"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="limiteChequeEspecial">Limite de cheque especial</Label>
              <Input
                type="text"
                id="limiteChequeEspecial"
                value={formData.limiteChequeEspecial}
                onChange={(e) => setFormData({ ...formData, limiteChequeEspecial: e.target.value })}
                placeholder="R$ 0,00"
                className="text-right"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => {
                setDialogOpen(false);
                setEditingId(null);
              }} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (editingId ? "Salvando..." : "Cadastrando...") : (editingId ? "Salvar" : "Cadastrar")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
