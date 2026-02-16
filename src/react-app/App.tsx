import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@/react-app/contexts/AuthContext";
import { NotificationProvider } from "@/react-app/contexts/NotificationContext";
import { ErrorTrackingProvider } from "@/react-app/contexts/ErrorTrackingContext";
import { ErrorBoundary } from "@/react-app/components/ErrorBoundary";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";
import AppLayout from "@/react-app/components/AppLayout";
import HomePage from "@/react-app/pages/Home";
import RegisterPage from "@/react-app/pages/Register";
import CalculatorPage from "@/react-app/pages/Calculator";
import RoasPage from "@/react-app/pages/Roas";
import AdsCompassPage from "@/react-app/pages/AdsCompass";
import PlansPage from "@/react-app/pages/Plans";
import DashboardPage from "@/react-app/pages/Dashboard";
import LoginPage from "@/react-app/pages/Login";
import ProductsPage from "@/react-app/pages/Products";
import ProductEdit from "@/react-app/pages/ProductEdit";
import AnalyticsPage from "@/react-app/pages/Analytics";
import VendasVariantePage from "@/react-app/pages/analytics/VendasVariante";
import ReposicaoRecomendadaPage from "@/react-app/pages/analytics/ReposicaoRecomendada";
import AnalyticsAvancadoPage from "@/react-app/pages/analytics/AnalyticsAvancado";
import PontoEquilibrioPage from "@/react-app/pages/analytics/PontoEquilibrio";
import TendenciasMensaisPage from "@/react-app/pages/analytics/TendenciasMensais";
import PerformanceFornecedoresPage from "@/react-app/pages/analytics/PerformanceFornecedores";
import AnaliseCustosPage from "@/react-app/pages/analytics/AnaliseCustos";
import SaudeEstoquePage from "@/react-app/pages/analytics/SaudeEstoque";
import CustoOperacionalPage from "@/react-app/pages/analytics/CustoOperacional";
import DespesasPage from "@/react-app/pages/custo-operacional/Despesas";
import GruposPage from "@/react-app/pages/custo-operacional/Grupos";
import AnalisePage from "@/react-app/pages/custo-operacional/Analise";
import FornecedoresPage from "@/react-app/pages/Fornecedores";
import PortalLogin from "@/react-app/pages/PortalLogin";
import PortalLayout from "@/react-app/pages/PortalLayout";
import PortalDashboardContent from "@/react-app/pages/PortalDashboardContent";
import SupplierPortalOrders from "@/react-app/pages/SupplierPortalOrders";
import SupplierPortalFinanceiro from "@/react-app/pages/SupplierPortalFinanceiro";
import SupplierPortalProducao from "@/react-app/pages/SupplierPortalProducao";
import SupplierPortalPrevisao from "@/react-app/pages/SupplierPortalPrevisao";
import PedidosPage from "@/react-app/pages/Pedidos";
import Financeiro from "@/react-app/pages/Financeiro";
import ContasPagar from "@/react-app/pages/ContasPagar";
import ContasReceber from "@/react-app/pages/ContasReceber";
import FluxoCaixa from "@/react-app/pages/FluxoCaixa";
import Lancamentos from "@/react-app/pages/Lancamentos";
import Bancos from "@/react-app/pages/Bancos";
import CentroCusto from "@/react-app/pages/CentroCusto";
import FinanceiroDashboard from "@/react-app/pages/FinanceiroDashboard";
import CartoesCredito from "@/react-app/pages/CartoesCredito";
import DRE from "@/react-app/pages/DRE";
import Contatos from "@/react-app/pages/Contatos";
import CriarVariacao from "@/react-app/pages/CriarVariacao";
import CriarComposicao from "@/react-app/pages/CriarComposicao";
import AdminDashboard from "@/react-app/pages/AdminDashboard";
import AdminCollectionPointsPage from "@/react-app/pages/AdminCollectionPointsPage";
import AdminCollectionPointFormPage from "@/react-app/pages/AdminCollectionPointFormPage";
import AdminCollectionPointsBulkImportPage from "@/react-app/pages/AdminCollectionPointsBulkImportPage";
import AdminLayoutConfigPage from "@/react-app/pages/AdminLayoutConfigPage";
import AdminTemplatesPage from "@/react-app/pages/AdminTemplatesPage";
import AdminReviewsPage from "@/react-app/pages/AdminReviewsPage";
import AdminMenuVisibility from "@/react-app/pages/AdminMenuVisibility";
import CollectionPointsListPage from "@/react-app/pages/CollectionPointsListPage";
import CollectionPointsSearchPage from "@/react-app/pages/CollectionPointsSearchPage";
import MentoriaPage from "@/react-app/pages/Mentoria";
import CalculadoraSimplesPage from "@/react-app/pages/CalculadoraSimples";
import BuscarPontosColetaPage from "@/react-app/pages/BuscarPontosColeta";
import IndexDisabledPage from "@/react-app/pages/IndexDisabled";
import PerfilPage from "@/react-app/pages/Perfil";
import NotificacoesPage from "@/react-app/pages/Notificacoes";
import PerfilEmpresaPage from "@/react-app/pages/PerfilEmpresa";
import IntegracaoLojaPage from "@/react-app/pages/IntegracaoLoja";
import MercadoLivreCallback from "@/react-app/pages/MercadoLivreCallback";
import MercadoLivreAtivo from "@/react-app/pages/MercadoLivreAtivo";
import MercadoLivreEditarAnuncio from "@/react-app/pages/MercadoLivreEditarAnuncio";
import MercadoLivrePromocoes from "@/react-app/pages/MercadoLivrePromocoes";
import InventoryControl from "@/react-app/pages/InventoryControl";
import FinanceDashboard from "@/react-app/pages/FinanceDashboard";
import FinanceCategorias from "@/react-app/pages/FinanceCategorias";
import FinanceContas from "@/react-app/pages/FinanceContas";
import FinanceContasPagar from "@/react-app/pages/FinanceContasPagar";
import FinanceContasReceber from "@/react-app/pages/FinanceContasReceber";
import FinanceLancamentos from "@/react-app/pages/FinanceLancamentos";
import FinanceExtratos from "@/react-app/pages/FinanceExtratos";
import FinanceDividas from "@/react-app/pages/FinanceDividas";
import FinanceClientesFornecedores from "@/react-app/pages/FinanceClientesFornecedores";
import FinanceConfiguracoes from "@/react-app/pages/FinanceConfiguracoes";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorTrackingProvider>
          <NotificationProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/mentoria" element={<MentoriaPage />} />
                <Route path="/calculadora-simples" element={<CalculadoraSimplesPage />} />
                <Route path="/buscar-pontos-coleta" element={<BuscarPontosColetaPage />} />
                <Route path="/index-disabled" element={<IndexDisabledPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/planos" element={<PlansPage />} />

                {/* Portal routes (separate auth system) */}
                <Route path="/portal" element={<PortalLogin />} />
                <Route path="/portal/:portalId" element={<PortalLogin />} />
                <Route element={<PortalLayout />}>
                  <Route path="/portal/dashboard" element={<PortalDashboardContent />} />
                  <Route path="/portal/producao" element={<SupplierPortalProducao />} />
                  <Route path="/portal/previsao" element={<SupplierPortalPrevisao />} />
                  <Route path="/portal/pedidos" element={<SupplierPortalOrders />} />
                  <Route path="/portal/financeiro" element={<SupplierPortalFinanceiro />} />
                </Route>

                {/* Protected routes with AppLayout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/perfil" element={<PerfilPage />} />
                  <Route path="/perfil-empresa" element={<PerfilEmpresaPage />} />
                  <Route path="/integracoes" element={<IntegracaoLojaPage />} />
                  <Route path="/integracoes/ml-callback" element={<MercadoLivreCallback />} />
                  <Route path="/produtos/anuncios/mercadolivre/ativo" element={<MercadoLivreAtivo />} />
                  <Route path="/produtos/anuncios/mercadolivre/promocoes" element={<MercadoLivrePromocoes />} />
                  <Route path="/produtos/anuncios/mercadolivre/:itemId/editar" element={<MercadoLivreEditarAnuncio />} />

                  <Route path="/notificacoes" element={<NotificacoesPage />} />
                  <Route path="/produtos" element={<ProductsPage />} />
                  <Route path="/produtos/:id/editar" element={<ProductEdit />} />
                  <Route path="/estoque" element={<InventoryControl />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/analytics/vendas-variante" element={<VendasVariantePage />} />
                  <Route path="/analytics/reposicao-recomendada" element={<ReposicaoRecomendadaPage />} />
                  <Route path="/analytics/avancado" element={<AnalyticsAvancadoPage />} />
                  <Route path="/analytics/ponto-equilibrio" element={<PontoEquilibrioPage />} />
                  <Route path="/analytics/tendencias-mensais" element={<TendenciasMensaisPage />} />
                  <Route path="/analytics/performance-fornecedores" element={<PerformanceFornecedoresPage />} />
                  <Route path="/analytics/analise-custos" element={<AnaliseCustosPage />} />
                  <Route path="/analytics/saude-estoque" element={<SaudeEstoquePage />} />
                  <Route path="/analytics/custo-operacional" element={<CustoOperacionalPage />} />
                  <Route path="/custo-operacional/despesas" element={<DespesasPage />} />
                  <Route path="/custo-operacional/grupos" element={<GruposPage />} />
                  <Route path="/custo-operacional/analise" element={<AnalisePage />} />
                  <Route path="/fornecedores" element={<FornecedoresPage />} />
                  <Route path="/pedidos" element={<PedidosPage />} />
                  <Route path="/financeiro" element={<Financeiro />} />
                  <Route path="/financeiro/dashboard" element={<FinanceiroDashboard />} />
                  <Route path="/financeiro/centro-custo" element={<CentroCusto />} />
                  <Route path="/financeiro/cartoes-credito" element={<CartoesCredito />} />
                  <Route path="/financeiro/contas-pagar" element={<ContasPagar />} />
                  <Route path="/financeiro/contas-receber" element={<ContasReceber />} />
                  <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixa />} />
                  <Route path="/financeiro/lancamentos" element={<Lancamentos />} />
                  <Route path="/financeiro/bancos" element={<Bancos />} />
                  <Route path="/financeiro/dre" element={<DRE />} />
                  <Route path="/financeiro/contatos" element={<Contatos />} />
                  
                  {/* Kryzer Finance Routes */}
                  <Route path="/finance/dashboard" element={<FinanceDashboard />} />
                  <Route path="/finance/categorias" element={<FinanceCategorias />} />
                  <Route path="/finance/contas" element={<FinanceContas />} />
                  <Route path="/finance/contas-pagar" element={<FinanceContasPagar />} />
                  <Route path="/finance/contas-receber" element={<FinanceContasReceber />} />
                  <Route path="/finance/lancamentos" element={<FinanceLancamentos />} />
                  <Route path="/finance/extratos" element={<FinanceExtratos />} />
                  <Route path="/finance/dividas" element={<FinanceDividas />} />
                  <Route path="/finance/clientes-fornecedores" element={<FinanceClientesFornecedores />} />
                  <Route path="/finance/configuracoes" element={<FinanceConfiguracoes />} />
                  
                  <Route path="/upseller/criar-variacao" element={<CriarVariacao />} />
                  <Route path="/upseller/criar-composicao" element={<CriarComposicao />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/layout-config" element={<AdminLayoutConfigPage />} />
                  <Route path="/admin/templates" element={<AdminTemplatesPage />} />
                  <Route path="/admin/collection-points" element={<AdminCollectionPointsPage />} />
                  <Route path="/admin/collection-points/new" element={<AdminCollectionPointFormPage />} />
                  <Route path="/admin/collection-points/:id" element={<AdminCollectionPointFormPage />} />
                  <Route path="/admin/collection-points/bulk-import" element={<AdminCollectionPointsBulkImportPage />} />
                  <Route path="/admin/reviews" element={<AdminReviewsPage />} />
                  <Route path="/admin/menu-visibility" element={<AdminMenuVisibility />} />
                  <Route path="/collection-points/list" element={<CollectionPointsListPage />} />
                  <Route path="/pontos-coleta" element={<CollectionPointsSearchPage />} />
                  <Route path="/calculadora" element={<CalculatorPage />} />
                  <Route path="/roas" element={<RoasPage />} />
                  <Route path="/ads-compass" element={<AdsCompassPage />} />
                </Route>
              </Routes>
            </Router>
          </NotificationProvider>
        </ErrorTrackingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
