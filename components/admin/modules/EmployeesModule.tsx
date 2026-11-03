"use client";

// Employés. Embauche, salaire de base, statut (actif / renvoyé), et mouvements
// (salaires versés, avances, régularisations) avec solde cumulé.

import { useCallback, useEffect, useState } from "react";
import { EMPLOYEE_TX_TYPES, employeeTxTypeLabel, employeeStatusLabel } from "@/lib/erp";
import { formatCFA, formatDateFR, toDateInput } from "@/lib/format";
import type { Employee, EmployeeTx } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ModuleHeader, Money, Spinner } from "../ui";

const emptyHire = { name: "", position: "", phone: "", baseSalary: "" };

export default function EmployeesModule() {
  const { activeStoreId, stores, flash, isSuper } = useAdmin();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [hire, setHire] = useState(emptyHire);
  const [hireStore, setHireStore] = useState(activeStoreId || stores[0]?.id || "");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = activeStoreId ? `?storeId=${activeStoreId}` : "";
    fetch(`/api/employees${qs}`).then((r) => r.json()).then((d) => setEmployees(d.employees ?? [])).finally(() => setLoading(false));
  }, [activeStoreId]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setHireStore(activeStoreId || stores[0]?.id || ""), [activeStoreId, stores]);

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...hire, baseSalary: Number(hire.baseSalary) || 0, storeId: hireStore }),
    });
    if (res.ok) {
      flash("Employé embauché");
      setHire(emptyHire);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.error || "Échec");
    }
  }

  const totalAdvances = employees.reduce((s, e) => s + Math.max(0, e.balance), 0);

  return (
    <div>
      <ModuleHeader title="Employés" subtitle="Salaires, avances et soldes du personnel." />
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <form onSubmit={addEmployee} className="card h-fit p-6">
          <h3 className="font-display text-lg font-extrabold text-ink">Embaucher</h3>
          <div className="mt-4 space-y-3">
            {(isSuper || stores.length > 1) && (
              <div>
                <label className="label">Magasin</label>
                <select className="field" value={hireStore} onChange={(e) => setHireStore(e.target.value)}>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Nom</label>
              <input required className="field" value={hire.name} onChange={(e) => setHire({ ...hire, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Poste</label>
              <input className="field" value={hire.position} onChange={(e) => setHire({ ...hire, position: e.target.value })} />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="field" value={hire.phone} onChange={(e) => setHire({ ...hire, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Salaire de base (F CFA)</label>
              <input type="text" inputMode="numeric" min="0" className="field" value={hire.baseSalary} onChange={(e) => setHire({ ...hire, baseSalary: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full">Embaucher</button>
          </div>
        </form>

        <div>
          <div className="mb-3">
            <span className="rounded-full border border-line bg-snow/70 px-3 py-1.5 font-mono text-xs text-ink-soft">
              Avances en cours : <span className="font-bold text-amber-deep">{formatCFA(totalAdvances)}</span>
            </span>
          </div>
          <div className="space-y-2">
            {loading && <Spinner label="Chargement…" />}
            {!loading && employees.length === 0 && <EmptyState>Aucun employé.</EmptyState>}
            {!loading &&
              employees.map((emp) => (
                <div key={emp.id} className={`card p-4 ${emp.status === "terminated" ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-green to-cyan font-display font-bold text-snow">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-ink">{emp.name}</span>
                        {emp.status === "terminated" && <span className="rounded bg-amber-deep/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-deep">{employeeStatusLabel(emp.status)}</span>}
                      </div>
                      <div className="font-mono text-[11px] text-steel">{emp.position || "—"} · base {formatCFA(emp.baseSalary)}{isSuper && ` · ${stores.find((s) => s.id === emp.storeId)?.name ?? ""}`}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Solde (avances)</div>
                      <Money value={emp.balance} signed />
                    </div>
                    <button onClick={() => setOpenId(openId === emp.id ? null : emp.id)} className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] hover:border-ink">
                      {openId === emp.id ? "Fermer" : "Gérer"}
                    </button>
                  </div>
                  {openId === emp.id && <EmployeeDetail employee={emp} onChange={() => { load(); }} flash={flash} />}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeDetail({ employee, onChange, flash }: { employee: Employee; onChange: () => void; flash: (m: string) => void }) {
  const [txs, setTxs] = useState<EmployeeTx[]>([]);
  const [type, setType] = useState("advance");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [note, setNote] = useState("");

  const loadTx = useCallback(() => {
    fetch(`/api/employees/${employee.id}`).then((r) => r.json()).then((d) => setTxs(d.transactions ?? []));
  }, [employee.id]);
  useEffect(() => {
    loadTx();
  }, [loadTx]);

  async function addTx(e: React.FormEvent) {
    e.preventDefault();
    if (!(Number(amount) > 0)) return flash("Montant invalide.");
    const res = await fetch(`/api/employees/${employee.id}/tx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: Number(amount), date, note }),
    });
    if (res.ok) {
      flash("Mouvement enregistré");
      setAmount("");
      setNote("");
      loadTx();
      onChange();
    } else flash("Échec");
  }

  async function toggleStatus() {
    const next = employee.status === "active" ? "terminated" : "active";
    if (next === "terminated" && !confirm(`Renvoyer ${employee.name} ?`)) return;
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      flash(next === "terminated" ? "Employé renvoyé" : "Employé réintégré");
      onChange();
    }
  }

  return (
    <div className="mt-4 grid gap-5 border-t border-line pt-4 lg:grid-cols-2">
      <div>
        <form onSubmit={addTx} className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Nouveau mouvement</div>
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            {EMPLOYEE_TX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" inputMode="numeric" min="0" className="field" placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <input className="field" placeholder="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 px-4 py-2 text-sm">Enregistrer</button>
            <button type="button" onClick={toggleStatus} className={`rounded-full border-2 px-4 py-2 font-mono text-xs ${employee.status === "active" ? "border-amber-deep/40 text-amber-deep hover:bg-amber-deep hover:text-paper" : "border-green/40 text-green hover:bg-green hover:text-snow"}`}>
              {employee.status === "active" ? "Renvoyer" : "Réintégrer"}
            </button>
          </div>
        </form>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Historique</div>
        <div className="mt-2 space-y-1.5">
          {txs.length === 0 && <p className="text-sm text-ink/55">Aucun mouvement.</p>}
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5">
              <span className="font-mono text-[11px] text-steel">{formatDateFR(t.date)}</span>
              <span className="font-display text-sm text-ink">{employeeTxTypeLabel(t.type)}</span>
              <span className="font-display text-sm font-bold text-ink">{formatCFA(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
