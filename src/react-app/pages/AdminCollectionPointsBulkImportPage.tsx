import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload, CheckCircle, XCircle, AlertCircle, Loader2, Download } from "lucide-react";
import * as XLSX from 'xlsx';

interface ImportRow {
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  domingo_aberto: string;
  domingo_fechado: string;
  segunda_aberto: string;
  segunda_fechado: string;
  terca_aberto: string;
  terca_fechado: string;
  quarta_aberto: string;
  quarta_fechado: string;
  quinta_aberto: string;
  quinta_fechado: string;
  sexta_aberto: string;
  sexta_fechado: string;
  sabado_aberto: string;
  sabado_fechado: string;
  marketplaces: string;
  aceita_devolucao: string;
  aceita_pedidos: string;
  telefone: string;
}

interface ImportResult {
  success: boolean;
  created: Array<{ nome: string; cep: string }>;
  skipped: Array<{ nome: string; cep: string; reason: string }>;
  errors: Array<{ row: number; error: string }>;
}

export default function AdminCollectionPointsBulkImportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadExample = () => {
    // Create example data
    const exampleData = [
      {
        'Nome': 'Ponto Centro',
        'CEP': '74360050',
        'Rua': 'Rua das Flores',
        'Número': '123',
        'Bairro': 'Centro',
        'Cidade': 'Goiânia',
        'UF': 'GO',
        'domingo_aberto': '',
        'domingo_fechado': '',
        'segunda_aberto': '09:00',
        'segunda_fechado': '18:00',
        'terca_aberto': '09:00',
        'terca_fechado': '18:00',
        'quarta_aberto': '09:00',
        'quarta_fechado': '18:00',
        'quinta_aberto': '09:00',
        'quinta_fechado': '18:00',
        'sexta_aberto': '09:00',
        'sexta_fechado': '18:00',
        'sabado_aberto': '09:00',
        'sabado_fechado': '13:00',
        'Marketplace': 'Shopee',
        'ACEITA DEVOLUÇÃO': 'SIM',
        'ACEITA PEDIDOS': 'SIM',
        'Telefone': '(62) 99999-9999'
      },
      {
        'Nome': 'Ponto Sul',
        'CEP': '74000100',
        'Rua': 'Av Brasil',
        'Número': '456',
        'Bairro': 'Setor Sul',
        'Cidade': 'Goiânia',
        'UF': 'GO',
        'domingo_aberto': '',
        'domingo_fechado': '',
        'segunda_aberto': '08:00',
        'segunda_fechado': '17:00',
        'terca_aberto': '08:00',
        'terca_fechado': '17:00',
        'quarta_aberto': '08:00',
        'quarta_fechado': '17:00',
        'quinta_aberto': '08:00',
        'quinta_fechado': '17:00',
        'sexta_aberto': '08:00',
        'sexta_fechado': '17:00',
        'sabado_aberto': '08:00',
        'sabado_fechado': '17:00',
        'Marketplace': 'Shopee,Mercado Livre',
        'ACEITA DEVOLUÇÃO': 'SIM',
        'ACEITA PEDIDOS': 'NAO',
        'Telefone': '(62) 98888-8888'
      }
    ];

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pontos de Coleta');

    // Style the header row (row 1) - bold, white text, yellow background
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "FFFF00" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    // Download
    XLSX.writeFile(wb, 'exemplo-importacao-pontos.xlsx', { cellStyles: true });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      // Read the Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error("A planilha está vazia");
      }

      // Map to ImportRow format
      const rows: ImportRow[] = jsonData.map((row: any) => ({
        nome: row['Nome'] || '',
        cep: String(row['CEP'] || ''),
        rua: row['Rua'] || '',
        numero: String(row['Número'] || ''),
        bairro: row['Bairro'] || '',
        cidade: row['Cidade'] || '',
        uf: row['UF'] || '',
        domingo_aberto: row['domingo_aberto'] || '',
        domingo_fechado: row['domingo_fechado'] || '',
        segunda_aberto: row['segunda_aberto'] || '',
        segunda_fechado: row['segunda_fechado'] || '',
        terca_aberto: row['terca_aberto'] || '',
        terca_fechado: row['terca_fechado'] || '',
        quarta_aberto: row['quarta_aberto'] || '',
        quarta_fechado: row['quarta_fechado'] || '',
        quinta_aberto: row['quinta_aberto'] || '',
        quinta_fechado: row['quinta_fechado'] || '',
        sexta_aberto: row['sexta_aberto'] || '',
        sexta_fechado: row['sexta_fechado'] || '',
        sabado_aberto: row['sabado_aberto'] || '',
        sabado_fechado: row['sabado_fechado'] || '',
        marketplaces: row['Marketplace'] || '',
        aceita_devolucao: String(row['ACEITA DEVOLUÇÃO'] || 'SIM').toUpperCase(),
        aceita_pedidos: String(row['ACEITA PEDIDOS'] || 'SIM').toUpperCase(),
        telefone: row['Telefone'] || ''
      }));

      // Send to API
      const response = await fetch("/api/admin/collection-points/bulk-import-xlsx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });

      if (!response.ok) {
        throw new Error("Falha ao importar");
      }

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      alert("Erro ao importar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/collection-points")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Importação em Massa</h1>
                <p className="text-xs text-gray-500">Cadastre vários pontos de coleta via planilha</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Formato de Importação</h2>
            <button
              onClick={downloadExample}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
            >
              <Download className="w-4 h-4" />
              Baixar Planilha Exemplo
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Faça o upload de uma planilha Excel (.xlsx) com os dados dos pontos de coleta. A planilha deve conter as seguintes colunas:
          </p>
          
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Informações Básicas (obrigatórias):</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Nome</strong>: Nome do ponto de coleta</li>
                <li>• <strong>CEP</strong>: CEP sem formatação (apenas números)</li>
                <li>• <strong>Rua</strong>: Nome da rua</li>
                <li>• <strong>Número</strong>: Número do endereço</li>
                <li>• <strong>Bairro</strong>: Nome do bairro</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">Informações Opcionais:</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• <strong>Cidade</strong>: Nome da cidade</li>
                <li>• <strong>UF</strong>: Estado (sigla de 2 letras)</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">Horários de Funcionamento:</h3>
              <p className="text-sm text-amber-800 mb-2">Para cada dia da semana, informe os horários de abertura e fechamento no formato HH:MM (ex: 09:00). Deixe em branco se o ponto estiver fechado naquele dia.</p>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• <strong>domingo_aberto</strong> / <strong>domingo_fechado</strong></li>
                <li>• <strong>segunda_aberto</strong> / <strong>segunda_fechado</strong></li>
                <li>• <strong>terca_aberto</strong> / <strong>terca_fechado</strong></li>
                <li>• <strong>quarta_aberto</strong> / <strong>quarta_fechado</strong></li>
                <li>• <strong>quinta_aberto</strong> / <strong>quinta_fechado</strong></li>
                <li>• <strong>sexta_aberto</strong> / <strong>sexta_fechado</strong></li>
                <li>• <strong>sabado_aberto</strong> / <strong>sabado_fechado</strong></li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-900 mb-2">Marketplaces e Configurações:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• <strong>Marketplace</strong>: Nome do marketplace. Para múltiplos, separe por vírgula (ex: "Shopee,Mercado Livre")</li>
                <li>• <strong>ACEITA DEVOLUÇÃO</strong>: SIM ou NAO</li>
                <li>• <strong>ACEITA PEDIDOS</strong>: SIM ou NAO</li>
                <li>• <strong>Telefone</strong>: Telefone de contato (opcional)</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Importante:</strong> Pontos com CEP já cadastrado serão ignorados. A primeira linha da planilha deve conter os nomes das colunas.
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a planilha Excel (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Arquivo selecionado: <strong>{file.name}</strong>
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleImport}
              disabled={loading || !file}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Importar Pontos
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Success */}
            {result.created.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-emerald-900">
                    {result.created.length} ponto{result.created.length !== 1 ? "s" : ""} cadastrado{result.created.length !== 1 ? "s" : ""} com sucesso
                  </h3>
                </div>
                <div className="space-y-2">
                  {result.created.map((item, idx) => (
                    <div key={idx} className="text-sm text-emerald-700">
                      ✓ {item.nome} (CEP: {item.cep})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped */}
            {result.skipped.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-900">
                    {result.skipped.length} ponto{result.skipped.length !== 1 ? "s" : ""} ignorado{result.skipped.length !== 1 ? "s" : ""}
                  </h3>
                </div>
                <div className="space-y-2">
                  {result.skipped.map((item, idx) => (
                    <div key={idx} className="text-sm text-amber-700">
                      ⊗ {item.nome} (CEP: {item.cep}) - {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-900">
                    {result.errors.length} erro{result.errors.length !== 1 ? "s" : ""}
                  </h3>
                </div>
                <div className="space-y-2">
                  {result.errors.map((error, idx) => (
                    <div key={idx} className="text-sm text-red-700">
                      ✗ Linha {error.row}: {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
