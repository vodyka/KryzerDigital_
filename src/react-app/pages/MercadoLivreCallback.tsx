import { useEffect, useState } from "react";

function decodeState(stateRaw: string): { companyId?: string; userId?: string } | null {
  try {
    let decoded = "";
    try {
      decoded = atob(decodeURIComponent(stateRaw));
    } catch {
      decoded = atob(stateRaw);
    }
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function MercadoLivreCallback() {
  const [message, setMessage] = useState("Finalizando conexão com o Mercado Livre...");
  const [details, setDetails] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");

        if (!code) return window.location.replace("/integracoes?error=no_code");
        if (!state) return window.location.replace("/integracoes?error=invalid_state");

        const token = localStorage.getItem("token");
        if (!token) return window.location.replace("/integracoes?error=unauthorized");

        const decoded = decodeState(state);
        const companyIdFromState = decoded?.companyId ? String(decoded.companyId) : "";

        setMessage("Chamando /finish...");
        setDetails(
          `code: ${code ? "OK" : "FALTA"}\nstate: ${state ? "OK" : "FALTA"}\ncompanyId: ${companyIdFromState || "(não detectado)"}`
        );

        const url = companyIdFromState
          ? `/api/integrations/mercadolivre/finish?companyId=${encodeURIComponent(companyIdFromState)}`
          : `/api/integrations/mercadolivre/finish`;

        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-company-id": companyIdFromState,
          },
          body: JSON.stringify({ code, state }),
        });

        const text = await resp.text().catch(() => "");

        // ✅ MOSTRA TUDO NA TELA
        setDetails((prev) => {
          return (
            prev +
            `\n\n--- RESPOSTA /finish ---\nstatus: ${resp.status}\nbody:\n${text || "(vazio)"}`
          );
        });

        if (!resp.ok) {
          // Tenta parsear o erro
          let errorData: any = {};
          try {
            errorData = text ? JSON.parse(text) : {};
          } catch {
            // Ignora erro de parse
          }

          // Se for erro de conta diferente, redireciona com erro específico
          if (errorData?.error === "different_account") {
            setTimeout(() => window.location.replace("/integracoes?error=different_account"), 800);
            return;
          }

          setMessage("❌ Falhou ao finalizar. Veja o detalhe abaixo.");
          return;
        }

        setMessage("✅ Conectado! Redirecionando...");
        setTimeout(() => window.location.replace("/integracoes?success=connected"), 800);
      } catch (e: any) {
        setMessage("❌ Erro inesperado no callback.");
        setDetails(e?.message || String(e));
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Mercado Livre Callback</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message}</p>

        <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
          {details || "Sem detalhes ainda..."}
        </pre>
      </div>
    </div>
  );
}
