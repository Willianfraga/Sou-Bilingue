"use client";

import { useState } from "react";
import { startTopupAction } from "@/app/aluno/topups/actions";

interface TopupSelectorProps {
  onSuccess?: (checkoutUrl: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const PACKAGES = [
  { horas: 5, descricao: "5 horas de conversação", preco: 49.5 },
  { horas: 10, descricao: "10 horas (melhor valor)", preco: 99.0 },
  { horas: 20, descricao: "20 horas (maior economia)", preco: 198.0 },
];

export function TopupSelector({
  onSuccess,
  onError,
  disabled = false,
}: TopupSelectorProps) {
  const [selectedHoras, setSelectedHoras] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPackage = (horas: number) => {
    setSelectedHoras(horas);
    setError(null);
  };

  const handleProceed = async () => {
    if (!selectedHoras) {
      setError("Selecione um pacote");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await startTopupAction(selectedHoras);

      if (!result.success || !result.checkoutUrl) {
        setError(result.error || "Erro ao iniciar recarga");
        setLoading(false);
        onError?.(result.error || "Erro ao iniciar recarga");
        return;
      }

      onSuccess?.(result.checkoutUrl);
      // Redirecionar para checkout
      window.location.href = result.checkoutUrl;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">
          Recarregar Horas
        </h2>
        <p className="text-neutral-600 mt-1">
          Escolha um pacote e continue sua aprendizagem
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Packages Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.horas}
            onClick={() => handleSelectPackage(pkg.horas)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition ${
              selectedHoras === pkg.horas
                ? "border-blue-600 bg-blue-50"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {/* Checkmark */}
            {selectedHoras === pkg.horas && (
              <div className="mb-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                ✓
              </div>
            )}

            {/* Hours */}
            <div className="text-2xl font-bold text-neutral-900 mb-2">
              {pkg.horas}h
            </div>

            {/* Description */}
            <p className="text-sm text-neutral-600 mb-4">
              {pkg.descricao}
            </p>

            {/* Price */}
            <div className="text-lg font-semibold text-blue-600">
              R$ {pkg.preco.toFixed(2).replace(".", ",")}
            </div>
          </button>
        ))}
      </div>

      {/* Proceed Button */}
      <button
        onClick={handleProceed}
        disabled={!selectedHoras || loading || disabled}
        className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition ${
          !selectedHoras || loading || disabled
            ? "bg-neutral-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Processando..." : "Continuar para Pagamento"}
      </button>

      {/* Info */}
      <div className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-600">
        <p className="font-semibold text-neutral-900 mb-2">Como funciona:</p>
        <ul className="space-y-1 text-xs">
          <li>✓ Selecione um pacote</li>
          <li>✓ Você será redirecionado para o pagamento seguro</li>
          <li>✓ Horas aparecem instantaneamente após confirmação</li>
          <li>✓ Sem taxa adicional, apenas o valor das horas</li>
        </ul>
      </div>
    </div>
  );
}
