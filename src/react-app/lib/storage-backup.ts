// Sistema de backup automático para proteção de dados
const BACKUP_PREFIX = "kryzer-backup-";
const BACKUP_TIMESTAMP = "kryzer-backup-timestamp";

export function createBackup() {
  const timestamp = Date.now();
  const keys = [
    "kryzer-categories",
    "kryzer-banks",
    "kryzer-companies",
    "kryzer-active-company",
    "kryzer-payables",
    "kryzer-payments",
    "kryzer-receivables",
    "kryzer-receipts",
    "kryzer-suppliers-clients",
  ];

  try {
    keys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        localStorage.setItem(`${BACKUP_PREFIX}${key}`, data);
      }
    });
    localStorage.setItem(BACKUP_TIMESTAMP, String(timestamp));
    console.log("[Backup] Backup criado com sucesso:", new Date(timestamp).toLocaleString());
  } catch (error) {
    console.error("[Backup] Erro ao criar backup:", error);
  }
}

export function restoreFromBackup(): boolean {
  const backupTimestamp = localStorage.getItem(BACKUP_TIMESTAMP);
  if (!backupTimestamp) {
    console.log("[Backup] Nenhum backup encontrado");
    return false;
  }

  const keys = [
    "kryzer-categories",
    "kryzer-banks",
    "kryzer-companies",
    "kryzer-active-company",
    "kryzer-payables",
    "kryzer-payments",
    "kryzer-receivables",
    "kryzer-receipts",
    "kryzer-suppliers-clients",
  ];

  try {
    let restored = 0;
    keys.forEach(key => {
      const backupData = localStorage.getItem(`${BACKUP_PREFIX}${key}`);
      if (backupData) {
        localStorage.setItem(key, backupData);
        restored++;
      }
    });
    console.log(`[Backup] ${restored} itens restaurados do backup de ${new Date(Number(backupTimestamp)).toLocaleString()}`);
    return true;
  } catch (error) {
    console.error("[Backup] Erro ao restaurar backup:", error);
    return false;
  }
}

export function hasValidData(): boolean {
  // Verifica se há dados válidos no localStorage
  const companies = localStorage.getItem("kryzer-companies");
  const banks = localStorage.getItem("kryzer-banks");
  
  if (!companies && !banks) {
    return false;
  }

  try {
    const companiesData = companies ? JSON.parse(companies) : [];
    const banksData = banks ? JSON.parse(banks) : [];
    
    // Se há empresas ou bancos, consideramos que há dados válidos
    return companiesData.length > 0 || banksData.length > 0;
  } catch {
    return false;
  }
}

export function detectDataLoss(): boolean {
  // Detecta se houve perda de dados comparando com backup
  const backupTimestamp = localStorage.getItem(BACKUP_TIMESTAMP);
  if (!backupTimestamp) {
    return false; // Sem backup para comparar
  }

  try {
    const currentBanks = localStorage.getItem("kryzer-banks");
    const backupBanks = localStorage.getItem(`${BACKUP_PREFIX}kryzer-banks`);
    
    const currentPayables = localStorage.getItem("kryzer-payables");
    const backupPayables = localStorage.getItem(`${BACKUP_PREFIX}kryzer-payables`);

    if (backupBanks && !currentBanks) {
      console.warn("[Backup] PERDA DE DADOS DETECTADA: Bancos foram perdidos");
      return true;
    }

    if (backupPayables && !currentPayables) {
      console.warn("[Backup] PERDA DE DADOS DETECTADA: Contas a pagar foram perdidas");
      return true;
    }

    // Verificar se os dados atuais são significativamente menores que o backup
    if (currentBanks && backupBanks) {
      const currentCount = JSON.parse(currentBanks).length;
      const backupCount = JSON.parse(backupBanks).length;
      if (backupCount > 0 && currentCount === 0) {
        console.warn("[Backup] PERDA DE DADOS DETECTADA: Todos os bancos foram removidos");
        return true;
      }
    }

    if (currentPayables && backupPayables) {
      const currentCount = JSON.parse(currentPayables).length;
      const backupCount = JSON.parse(backupPayables).length;
      if (backupCount > 0 && currentCount === 0) {
        console.warn("[Backup] PERDA DE DADOS DETECTADA: Todas as contas a pagar foram removidas");
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("[Backup] Erro ao detectar perda de dados:", error);
    return false;
  }
}

// Executa backup automático a cada 5 minutos
let backupInterval: number | null = null;

export function startAutoBackup() {
  if (backupInterval) {
    return; // Já está rodando
  }

  // Backup inicial
  createBackup();

  // Backup a cada 5 minutos
  backupInterval = window.setInterval(() => {
    createBackup();
  }, 5 * 60 * 1000);

  console.log("[Backup] Sistema de backup automático iniciado");
}

export function stopAutoBackup() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log("[Backup] Sistema de backup automático parado");
  }
}
