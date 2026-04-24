import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User as UserIcon, Mail, Shield, Users, LogOut, X, Copy, Check, Key } from "lucide-react";

type Team = { id: string; name: string; role: string; created_at: string };

function decodeJwt(token: string): { email?: string; id?: number; iat?: number; exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function initials(email: string): string {
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const ProfilePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  token: string;
  onLogout: () => void;
}> = ({ open, onClose, token, onLogout }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [oauthProviders, setOauthProviders] = useState<{ enabled: string[]; all: string[] }>({ enabled: [], all: [] });

  const claims = decodeJwt(token);
  const email = claims?.email || "unknown@user";
  const joinedAt = claims?.iat ? new Date(claims.iat * 1000) : null;
  const expiresAt = claims?.exp ? new Date(claims.exp * 1000) : null;

  useEffect(() => {
    if (!open) return;
    let aborted = false;
    (async () => {
      setLoading(true);
      try {
        const [teamsRes, oauthRes] = await Promise.all([
          fetch("/api/teams", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => ({ teams: [] })),
          fetch("/api/auth/oauth/providers").then((r) => r.json()).catch(() => ({ enabled: [], all: [] })),
        ]);
        if (aborted) return;
        setTeams(teamsRes.teams || []);
        setOauthProviders(oauthRes);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [open, token]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const createTeam = async () => {
    const name = prompt("Team name");
    if (!name?.trim()) return;
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      const created = await res.json();
      setTeams((t) => [{ id: created.id, name: created.name, role: "owner", created_at: new Date().toISOString() }, ...t]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-emerald-500/10 shadow-2xl overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Profile"
          >
            <header className="sticky top-0 z-10 px-5 py-4 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-emerald-500/10 flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mono-label flex items-center gap-2">
                <UserIcon size={14} /> Profile
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                <X size={16} />
              </button>
            </header>

            <div className="px-5 py-5 space-y-5">
              {/* Avatar + Identity */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/30">
                  {initials(email)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{email}</div>
                  <div className="text-[10px] text-gray-500 dark:text-slate-500 uppercase tracking-widest mono-label mt-0.5">Signed in</div>
                </div>
              </div>

              {/* Details grid */}
              <section className="space-y-2">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label flex items-center gap-2">
                  <Mail size={10} /> Account
                </h3>
                <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-emerald-500/10 rounded-xl divide-y divide-gray-200 dark:divide-emerald-500/10">
                  <Row label="Email" value={email} onCopy={() => copy(email, "email")} copied={copied === "email"} />
                  <Row label="User ID" value={claims?.id ? String(claims.id) : "—"} />
                  {joinedAt && <Row label="Session start" value={joinedAt.toLocaleString()} />}
                  {expiresAt && <Row label="Session expires" value={expiresAt.toLocaleString()} />}
                </div>
              </section>

              {/* Teams */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label flex items-center gap-2">
                    <Users size={10} /> Teams {teams.length > 0 && <span className="text-emerald-600 dark:text-emerald-400">({teams.length})</span>}
                  </h3>
                  <button
                    onClick={createTeam}
                    className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 mono-label transition-colors"
                  >
                    + New
                  </button>
                </div>
                {loading ? (
                  <div className="text-xs text-gray-400 dark:text-slate-600 py-4 text-center mono-label">Loading…</div>
                ) : teams.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-slate-600 py-4 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl mono-label">No teams yet</div>
                ) : (
                  <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-emerald-500/10 rounded-xl divide-y divide-gray-200 dark:divide-emerald-500/10">
                    {teams.map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate">{t.name}</div>
                          <div className="text-[9px] text-gray-500 dark:text-slate-600 uppercase tracking-widest mono-label">{new Date(t.created_at).toLocaleDateString()}</div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded mono-label ${
                          t.role === "owner" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                          t.role === "admin" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                          "bg-slate-500/15 text-slate-500 dark:text-slate-400"
                        }`}>
                          <Shield size={8} className="inline mr-1" />{t.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Connected providers */}
              <section className="space-y-2">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500 mono-label flex items-center gap-2">
                  <Key size={10} /> Connected accounts
                </h3>
                <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-emerald-500/10 rounded-xl divide-y divide-gray-200 dark:divide-emerald-500/10">
                  {oauthProviders.all.map((p) => {
                    const isEnabled = oauthProviders.enabled.includes(p);
                    return (
                      <div key={p} className="flex items-center justify-between px-3 py-2.5">
                        <span className="text-sm font-bold text-gray-800 dark:text-slate-200 capitalize">{p}</span>
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded mono-label ${
                          isEnabled ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/15 text-slate-500 dark:text-slate-500"
                        }`}>
                          {isEnabled ? "Available" : "Not configured"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 dark:border-slate-800/50">
                <button
                  onClick={() => { onClose(); onLogout(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors mono-label"
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

const Row: React.FC<{ label: string; value: string; onCopy?: () => void; copied?: boolean }> = ({ label, value, onCopy, copied }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
    <div className="min-w-0 flex-1">
      <div className="text-[9px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-600 mono-label">{label}</div>
      <div className="text-sm text-gray-800 dark:text-slate-200 truncate font-medium">{value}</div>
    </div>
    {onCopy && (
      <button
        onClick={onCopy}
        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      </button>
    )}
  </div>
);
