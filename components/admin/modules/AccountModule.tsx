"use client";

// Mon compte : changer son nom d'utilisateur et/ou son mot de passe (avec
// confirmation par le mot de passe actuel).

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAdmin } from "../AdminContext";
import { ModuleHeader } from "../ui";

export default function AccountModule() {
  const { me, flash } = useAdmin();
  const router = useRouter();
  const [username, setUsername] = useState(me.username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    const res = await fetch("/api/admins/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, currentPassword, newPassword }),
    });
    setSaving(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      flash("Identifiants mis à jour");
      setCurrentPassword("");
      setNewPassword("");
      router.refresh();
    } else {
      setErr(d.error || "Échec de la mise à jour");
    }
  }

  return (
    <div>
      <ModuleHeader title="Mon compte" subtitle="Modifiez votre nom d'utilisateur et votre mot de passe." />
      <form onSubmit={save} className="card max-w-md p-6">
        <div className="space-y-3">
          <div>
            <label className="label">Nom d'utilisateur</label>
            <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="label">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
            <input type="text" className="field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••" />
          </div>
          <div className="border-t border-line pt-3">
            <label className="label">Mot de passe actuel (obligatoire)</label>
            <input required type="password" className="field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          {err && <p className="text-sm text-amber-deep">{err}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
            {saving ? "Enregistrement…" : "Mettre à jour mes identifiants"}
          </button>
        </div>
      </form>
    </div>
  );
}
