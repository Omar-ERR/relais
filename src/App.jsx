import React, { useState, useEffect, useMemo, useRef } from "react";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  X,
  Search,
  LayoutDashboard,
  Receipt,
  Building2,
  Paperclip,
  Download,
  FileDown,
  Archive,
} from "lucide-react";
import {
  signIn,
  signOut,
  getCurrentSession,
  onAuthChange,
  displayNameFromEmail,
  loadUnits,
  addUnitRemote,
  deleteUnitRemote,
  loadInvoices,
  upsertInvoiceRemote,
  deleteInvoiceRemote,
  uploadInvoiceFile,
  getFileUrl,
  deleteInvoiceFile,
} from "./db.js";

function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="46" height="46" rx="6" fill="#3B2E22" />
      <path
        d="M15 12h14a3 3 0 0 1 3 3v21l-3.5-2.5L25 36l-3.5-2.5L18 36l-3.5-2.5L11 36V18a3 3 0 0 1 3-3"
        fill="none"
        stroke="#F1EAD8"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        transform="translate(2 -3)"
      />
      <line x1="16" y1="18" x2="28" y2="18" stroke="#F1EAD8" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16" y1="22" x2="28" y2="22" stroke="#F1EAD8" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16" y1="26" x2="23" y2="26" stroke="#F1EAD8" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="34" cy="30" r="9" fill="#8C6A2E" stroke="#3B2E22" strokeWidth="1.5" />
      <path d="M30 30.5l2.5 2.5 5-5.5" fill="none" stroke="#F1EAD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const currency = (n) =>
  (Math.round((Number(n) || 0 + Number.EPSILON) * 100) / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const uid = () => crypto.randomUUID();

function emptyInvoice(unitId) {
  return {
    id: uid(),
    unitId: unitId || "",
    supplier: "",
    invoiceNumber: "",
    receivedDate: todayISO(),
    amountHT: "",
    taxRate: 20,
    amountTTC: "",
    category: "",
    status: "impayé",
    paidDate: "",
    notes: "",
    filePath: "",
    fileName: "",
  };
}

function computeTTC(inv) {
  const ht = Number(inv.amountHT) || 0;
  const rate = Number(inv.taxRate) || 0;
  return ht + ht * (rate / 100);
}

function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await signIn(username, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F1EAD8",
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, #E7DEC5 32px)",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#F8F3E6",
          padding: "36px 32px",
          borderRadius: 6,
          border: "1px solid #DCD0B0",
          boxShadow: "0 8px 24px rgba(34,40,31,0.14)",
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <LogoMark size={44} />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, color: "#22281F" }}>
            Omarelais Fac
          </div>
          <div style={{ fontSize: 13, color: "#5B5F4F" }}>Connexion requise</div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#22281F" }}>
          Identifiant
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 3, border: "1px solid #DCD0B0", fontSize: 14, background: "#FCFAF1" }}
            autoFocus
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#22281F" }}>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 3, border: "1px solid #DCD0B0", fontSize: 14, background: "#FCFAF1" }}
          />
        </label>
        {error && <div style={{ color: "#9C3B2E", fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 8,
            padding: "10px 12px",
            borderRadius: 4,
            border: "none",
            background: "#3B2E22",
            color: "#F1EAD8",
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authedUser, setAuthedUser] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [view, setView] = useState("dashboard");
  const [filterUnit, setFilterUnit] = useState("toutes");
  const [filterStatus, setFilterStatus] = useState("toutes");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getCurrentSession().then((user) => {
      setAuthedUser(user);
      setCheckingSession(false);
    });
    const unsubscribe = onAuthChange((user) => setAuthedUser(user));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authedUser) return;
    setDataLoading(true);
    Promise.all([loadUnits(), loadInvoices()])
      .then(([u, i]) => {
        setUnits(u);
        setInvoices(i);
      })
      .catch((err) => alert("Erreur de chargement : " + err.message))
      .finally(() => setDataLoading(false));
  }, [authedUser]);

  const unitName = (id) => units.find((u) => u.id === id)?.name || "—";

  const stats = useMemo(() => {
    let total = 0,
      paid = 0,
      unpaid = 0;
    invoices.forEach((inv) => {
      const t = inv.amountTTC !== "" && inv.amountTTC != null ? Number(inv.amountTTC) : computeTTC(inv);
      total += t;
      if (inv.status === "payé") paid += t;
      else unpaid += t;
    });
    return { total, paid, unpaid, count: invoices.length };
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices
      .filter((inv) => (filterUnit === "toutes" ? true : inv.unitId === filterUnit))
      .filter((inv) => (filterStatus === "toutes" ? true : inv.status === filterStatus))
      .filter((inv) =>
        query.trim() === ""
          ? true
          : (inv.supplier + " " + inv.invoiceNumber).toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => (a.receivedDate < b.receivedDate ? 1 : -1));
  }, [invoices, filterUnit, filterStatus, query]);

  function openNew() {
    setEditing(emptyInvoice(units[0]?.id || ""));
    setView("form");
  }
  function openEdit(inv) {
    setEditing({ ...inv });
    setView("form");
  }

  async function saveInvoice(inv) {
    const ttc = inv.amountTTC !== "" ? Number(inv.amountTTC) : computeTTC(inv);
    const toSave = { ...inv, amountTTC: ttc };
    try {
      const saved = await upsertInvoiceRemote(toSave);
      setInvoices((prev) => {
        const exists = prev.some((i) => i.id === saved.id);
        return exists ? prev.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...prev];
      });
      setView("list");
      setEditing(null);
    } catch (err) {
      alert("Erreur lors de l'enregistrement : " + err.message);
    }
  }

  async function removeInvoice(inv) {
    try {
      if (inv.filePath) await deleteInvoiceFile(inv.filePath);
      await deleteInvoiceRemote(inv.id);
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (err) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  }

  async function toggleStatus(inv) {
    const updated = {
      ...inv,
      status: inv.status === "payé" ? "impayé" : "payé",
      paidDate: inv.status === "payé" ? "" : todayISO(),
    };
    try {
      const saved = await upsertInvoiceRemote(updated);
      setInvoices((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }

  async function addUnit(name) {
    try {
      const created = await addUnitRemote(name);
      setUnits((prev) => [...prev, created]);
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }

  async function removeUnit(id) {
    try {
      await deleteUnitRemote(id);
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }

  function exportCSV() {
    const header = ["Unité", "Fournisseur", "N° facture", "Date reçue", "Montant TTC", "Statut", "Date paiement", "Catégorie"];
    const rows = filtered.map((inv) => [
      unitName(inv.unitId),
      inv.supplier,
      inv.invoiceNumber,
      fmtDate(inv.receivedDate),
      (inv.amountTTC !== "" ? Number(inv.amountTTC) : computeTTC(inv)).toFixed(2),
      inv.status,
      fmtDate(inv.paidDate),
      inv.category,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factures_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportZip({ unitId, dateFrom, dateTo }) {
    const selected = invoices.filter((inv) => {
      if (unitId !== "toutes" && inv.unitId !== unitId) return false;
      if (dateFrom && inv.receivedDate < dateFrom) return false;
      if (dateTo && inv.receivedDate > dateTo) return false;
      return true;
    });

    if (selected.length === 0) {
      alert("Aucune facture ne correspond à cette sélection.");
      return;
    }

    setExporting(true);
    try {
      const header = [
        "Unité",
        "Fournisseur",
        "N° facture",
        "Date reçue",
        "Montant HT",
        "TVA (%)",
        "Montant TTC",
        "Statut",
        "Date paiement",
        "Catégorie",
        "Notes",
        "Fichier joint",
      ];
      const rows = selected.map((inv) => [
        unitName(inv.unitId),
        inv.supplier,
        inv.invoiceNumber,
        fmtDate(inv.receivedDate),
        Number(inv.amountHT) || 0,
        Number(inv.taxRate) || 0,
        inv.amountTTC !== "" ? Number(inv.amountTTC) : computeTTC(inv),
        inv.status,
        fmtDate(inv.paidDate),
        inv.category,
        inv.notes,
        inv.fileName || "",
      ]);
      const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Factures");
      const excelData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

      const zip = new JSZip();
      zip.file("factures.xlsx", excelData);
      const filesFolder = zip.folder("pieces-jointes");
      const safe = (s) => (s || "").toString().replace(/[\\/:*?"<>|]/g, "-");

      for (const inv of selected) {
        if (!inv.filePath) continue;
        try {
          const res = await fetch(getFileUrl(inv.filePath));
          if (!res.ok) throw new Error("téléchargement impossible");
          const blob = await res.blob();
          const filename = `${safe(inv.receivedDate)}_${safe(inv.invoiceNumber || inv.supplier || inv.id)}_${safe(
            inv.fileName || "fichier"
          )}`;
          filesFolder.file(filename, blob);
        } catch (e) {
          console.error("Fichier ignoré (" + inv.fileName + ") :", e.message);
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-factures_${todayISO()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportModalOpen(false);
    } catch (err) {
      alert("Erreur pendant l'export : " + err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleLogout() {
    await signOut();
    setAuthedUser(null);
    setUnits([]);
    setInvoices([]);
    setView("dashboard");
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a8578" }}>
        Chargement…
      </div>
    );
  }

  if (!authedUser) {
    return <LoginScreen onLoggedIn={(u) => setAuthedUser(u)} />;
  }

  return (
    <div className="pmu-app">
      <aside className="sidebar">
        <div className="brand">
          <LogoMark size={34} />
          <div>
            <div className="brand-title">Omarelais Fac</div>
            <div className="brand-sub">Factures reçues</div>
          </div>
        </div>
        <nav>
          <button className={view === "dashboard" ? "nav active" : "nav"} onClick={() => setView("dashboard")}>
            <LayoutDashboard size={17} /> Tableau de bord
          </button>
          <button className={view === "list" || view === "form" ? "nav active" : "nav"} onClick={() => setView("list")}>
            <Receipt size={17} /> Factures
          </button>
          <button className={view === "units" ? "nav active" : "nav"} onClick={() => setView("units")}>
            <Building2 size={17} /> Unités
          </button>
        </nav>
        <button className="btn-primary sidebar-cta" onClick={openNew} disabled={units.length === 0}>
          <Plus size={16} /> Nouvelle facture
        </button>
        {units.length === 0 && <p className="hint">Crée d'abord une unité.</p>}
        <div style={{ marginTop: "auto", paddingTop: 16, paddingLeft: 20, paddingRight: 20, fontSize: 12, color: "#C9B9A0" }}>
          Connecté : {displayNameFromEmail(authedUser.email)}
          <button
            onClick={handleLogout}
            style={{
              display: "block",
              marginTop: 6,
              background: "none",
              border: "none",
              color: "#D9A088",
              cursor: "pointer",
              padding: 0,
              fontSize: 12,
              textDecoration: "underline",
            }}
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="content">
        {dataLoading ? (
          <div className="page">
            <div className="empty">Chargement des données…</div>
          </div>
        ) : (
          <>
            {view === "dashboard" && (
              <Dashboard stats={stats} invoices={invoices} unitName={unitName} onOpen={openEdit} onNew={openNew} unitsExist={units.length > 0} />
            )}

            {view === "list" && (
              <InvoiceList
                invoices={filtered}
                units={units}
                unitName={unitName}
                filterUnit={filterUnit}
                setFilterUnit={setFilterUnit}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                query={query}
                setQuery={setQuery}
                onEdit={openEdit}
                onDelete={removeInvoice}
                onToggle={toggleStatus}
                onNew={openNew}
                onExport={exportCSV}
                onExportZip={() => setExportModalOpen(true)}
              />
            )}

            {view === "form" && editing && (
              <InvoiceForm invoice={editing} units={units} onSave={saveInvoice} onCancel={() => setView("list")} />
            )}

            {view === "units" && <UnitsManager units={units} invoices={invoices} onAddUnit={addUnit} onRemoveUnit={removeUnit} />}
          </>
        )}
      </main>

      {exportModalOpen && (
        <ExportZipModal
          units={units}
          exporting={exporting}
          onClose={() => setExportModalOpen(false)}
          onExport={exportZip}
        />
      )}
    </div>
  );
}

function ExportZipModal({ units, onClose, onExport, exporting }) {
  const [unitId, setUnitId] = useState("toutes");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(34,40,31,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#F8F3E6",
          borderRadius: 6,
          border: "1px solid #DCD0B0",
          padding: "28px 26px",
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: "#22281F" }}>
          Exporter les factures (ZIP)
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Tableau Excel + pièces jointes des factures sélectionnées.
        </p>
        <label className="field">
          <span>Unité</span>
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="toutes">Toutes les unités</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Du</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>Au</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button className="btn-ghost" onClick={onClose} disabled={exporting} style={{ flex: 1 }}>
            Annuler
          </button>
          <button
            className="btn-primary"
            onClick={() => onExport({ unitId, dateFrom, dateTo })}
            disabled={exporting}
            style={{ flex: 1 }}
          >
            {exporting ? "Export…" : "Exporter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={"badge " + (status === "payé" ? "badge-paid" : "badge-unpaid")}>
      {status === "payé" ? <CheckCircle2 size={13} /> : <Circle size={13} />}
      {status}
    </span>
  );
}

function Dashboard({ stats, invoices, unitName, onOpen, onNew, unitsExist }) {
  const recent = [...invoices].sort((a, b) => (a.receivedDate < b.receivedDate ? 1 : -1)).slice(0, 6);
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">Vue d'ensemble des factures fournisseurs reçues</p>
        </div>
        <button className="btn-primary" onClick={onNew} disabled={!unitsExist}>
          <Plus size={16} /> Nouvelle facture
        </button>
      </header>

      <div className="cards">
        <div className="card">
          <div className="card-label">Total reçu</div>
          <div className="card-value">{currency(stats.total)}</div>
        </div>
        <div className="card card-paid">
          <div className="card-label">Réglé</div>
          <div className="card-value">{currency(stats.paid)}</div>
        </div>
        <div className="card card-unpaid">
          <div className="card-label">Reste à payer</div>
          <div className="card-value">{currency(stats.unpaid)}</div>
        </div>
        <div className="card">
          <div className="card-label">Factures enregistrées</div>
          <div className="card-value">{stats.count}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">Dernières factures reçues</div>
        {recent.length === 0 ? (
          <div className="empty">
            {unitsExist
              ? "Aucune facture enregistrée. Ajoute la première pour démarrer le registre."
              : "Commence par créer une unité, puis enregistre tes premières factures."}
          </div>
        ) : (
          <table className="table">
            <tbody>
              {recent.map((inv) => (
                <tr key={inv.id} onClick={() => onOpen(inv)}>
                  <td>{inv.supplier || "Fournisseur"}</td>
                  <td className="muted">{unitName(inv.unitId)}</td>
                  <td className="muted">{fmtDate(inv.receivedDate)}</td>
                  <td className="mono num">{currency(inv.amountTTC !== "" ? inv.amountTTC : computeTTC(inv))}</td>
                  <td>
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InvoiceList({
  invoices,
  units,
  unitName,
  filterUnit,
  setFilterUnit,
  filterStatus,
  setFilterStatus,
  query,
  setQuery,
  onEdit,
  onDelete,
  onToggle,
  onNew,
  onExport,
  onExportZip,
}) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Factures reçues</h1>
          <p className="muted">Registre des factures fournisseurs, toutes unités</p>
        </div>
        <div className="form-actions">
          <button className="btn-ghost" onClick={onExport}>
            <FileDown size={16} /> Exporter en CSV
          </button>
          <button className="btn-ghost" onClick={onExportZip}>
            <Archive size={16} /> Exporter avec pièces jointes
          </button>
          <button className="btn-primary" onClick={onNew} disabled={units.length === 0}>
            <Plus size={16} /> Nouvelle facture
          </button>
        </div>
      </header>

      <div className="toolbar">
        <div className="tabs">
          {["toutes", "impayé", "payé"].map((f) => (
            <button key={f} className={filterStatus === f ? "tab active" : "tab"} onClick={() => setFilterStatus(f)}>
              {f === "toutes" ? "Toutes" : f === "impayé" ? "Impayées" : "Payées"}
            </button>
          ))}
        </div>
        <select className="unit-select" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
          <option value="toutes">Toutes les unités</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <div className="search">
          <Search size={15} />
          <input placeholder="Fournisseur ou n° de facture…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="panel">
        {invoices.length === 0 ? (
          <div className="empty">Aucune facture ne correspond à ces filtres.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>N° facture</th>
                <th>Unité</th>
                <th>Reçue le</th>
                <th className="num">Montant TTC</th>
                <th>Statut</th>
                <th>Pièce jointe</th>
                <th className="actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.supplier || "—"}</td>
                  <td className="mono">{inv.invoiceNumber || "—"}</td>
                  <td className="muted">{unitName(inv.unitId)}</td>
                  <td className="muted">{fmtDate(inv.receivedDate)}</td>
                  <td className="mono num">{currency(inv.amountTTC !== "" ? inv.amountTTC : computeTTC(inv))}</td>
                  <td>
                    <button className="badge-btn" onClick={() => onToggle(inv)} title="Basculer le statut">
                      <StatusBadge status={inv.status} />
                    </button>
                  </td>
                  <td>
                    {inv.filePath ? (
                      <a className="file-link" href={getFileUrl(inv.filePath)} target="_blank" rel="noreferrer" title={inv.fileName}>
                        <Paperclip size={13} /> {inv.fileName ? inv.fileName.slice(0, 18) : "fichier"}
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="actions">
                    <button className="icon-btn" onClick={() => onEdit(inv)}>
                      Modifier
                    </button>
                    <button className="icon-btn danger" onClick={() => onDelete(inv)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InvoiceForm({ invoice, units, onSave, onCancel }) {
  const [inv, setInv] = useState(invoice);
  const [fileMeta, setFileMeta] = useState(invoice.fileName ? { name: invoice.fileName } : null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const ttc = computeTTC(inv);

  function update(field, value) {
    setInv((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadInvoiceFile(file);
      setInv((prev) => ({ ...prev, filePath: path, fileName: file.name }));
      setFileMeta({ name: file.name });
    } catch (err) {
      alert("Erreur d'envoi du fichier : " + err.message);
    } finally {
      setUploading(false);
    }
  }

  const isNew = !invoice.supplier && !invoice.invoiceNumber;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{isNew ? "Nouvelle facture reçue" : "Modifier la facture"}</h1>
          <p className="muted">Enregistre les informations telles qu'elles figurent sur la facture</p>
        </div>
        <div className="form-actions">
          <button className="btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button
            className="btn-primary"
            onClick={() => onSave({ ...inv, amountTTC: inv.amountTTC === "" ? computeTTC(inv) : inv.amountTTC })}
          >
            Enregistrer
          </button>
        </div>
      </header>

      <div className="panel form-panel">
        <div className="grid-2">
          <label className="field">
            <span>Fournisseur</span>
            <input value={inv.supplier} onChange={(e) => update("supplier", e.target.value)} placeholder="Nom du fournisseur" />
          </label>
          <label className="field">
            <span>Unité (PMU)</span>
            <select value={inv.unitId} onChange={(e) => update("unitId", e.target.value)}>
              <option value="">— Choisir —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid-2">
          <label className="field">
            <span>N° de facture (fournisseur)</span>
            <input className="mono" value={inv.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} />
          </label>
          <label className="field">
            <span>Catégorie / nature de dépense</span>
            <input value={inv.category} onChange={(e) => update("category", e.target.value)} placeholder="Ex : fournitures, électricité…" />
          </label>
        </div>

        <div className="grid-3">
          <label className="field">
            <span>Date de réception</span>
            <input type="date" value={inv.receivedDate} onChange={(e) => update("receivedDate", e.target.value)} />
          </label>
          <label className="field">
            <span>Montant HT</span>
            <input type="number" className="mono" value={inv.amountHT} onChange={(e) => update("amountHT", e.target.value)} />
          </label>
          <label className="field">
            <span>TVA (%)</span>
            <input type="number" className="mono" value={inv.taxRate} onChange={(e) => update("taxRate", e.target.value)} />
          </label>
        </div>

        <div className="totals-box">
          <div className="total-line">
            <span>Montant TTC (calculé)</span>
            <span className="mono">{currency(ttc)}</span>
          </div>
        </div>
        <label className="field">
          <span>Ou saisir directement le montant TTC (si différent)</span>
          <input
            type="number"
            className="mono"
            value={inv.amountTTC}
            onChange={(e) => update("amountTTC", e.target.value)}
            placeholder={ttc.toFixed(2)}
          />
        </label>

        <div className="grid-2">
          <label className="field">
            <span>Statut</span>
            <select value={inv.status} onChange={(e) => update("status", e.target.value)}>
              <option value="impayé">Impayée</option>
              <option value="payé">Payée</option>
            </select>
          </label>
          {inv.status === "payé" && (
            <label className="field">
              <span>Date de paiement</span>
              <input type="date" value={inv.paidDate} onChange={(e) => update("paidDate", e.target.value)} />
            </label>
          )}
        </div>

        <label className="field">
          <span>Pièce jointe (PDF, photo du scan…)</span>
          <div className="file-row">
            <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFile} disabled={uploading} />
            {uploading && <span className="muted">Envoi…</span>}
            {!uploading && fileMeta && <span className="muted">{fileMeta.name}</span>}
          </div>
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea value={inv.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
        </label>
      </div>
    </div>
  );
}

function UnitsManager({ units, invoices, onAddUnit, onRemoveUnit }) {
  const [name, setName] = useState("");

  function addUnit() {
    if (!name.trim()) return;
    onAddUnit(name.trim());
    setName("");
  }
  function countFor(id) {
    return invoices.filter((i) => i.unitId === id).length;
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Unités</h1>
          <p className="muted">Points de vente / structures dont tu suis les factures séparément</p>
        </div>
      </header>

      <div className="panel form-panel">
        <div className="file-row">
          <input placeholder="Nom de l'unité (ex : PMU Centre-Ville)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary" onClick={addUnit}>
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        {units.length === 0 ? (
          <div className="empty">Aucune unité pour l'instant.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Unité</th>
                <th>Factures enregistrées</th>
                <th className="actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="muted">{countFor(u.id)}</td>
                  <td className="actions">
                    <button className="icon-btn danger" onClick={() => onRemoveUnit(u.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
