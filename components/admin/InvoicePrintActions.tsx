"use client";

// Boutons de la page d'impression d'une facture (cachés à l'impression).

export default function InvoicePrintActions() {
  return (
    <div className="no-print mb-6 flex items-center gap-2">
      <button
        onClick={() => window.print()}
        className="rounded-full bg-ink px-5 py-2 font-display text-sm font-semibold text-snow hover:bg-ink/90"
      >
        Imprimer
      </button>
      <button
        onClick={() => window.close()}
        className="rounded-full border-2 border-line px-5 py-2 font-mono text-xs text-ink hover:border-ink"
      >
        Fermer
      </button>
    </div>
  );
}
