import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import {
  loadUnits,
  saveUnits,
  loadInvoices,
  saveInvoices,
  saveFile,
  getFile,
  deleteFile,
} from "./db.js";

const currency = (n) =>
  (Math.round((Number(n) || 0 + Number.EPSILON) * 100) / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " DH";

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
    fileId: "",
    fileName: "",
  };
}

function computeTTC(inv) {
  const ht = Number(inv.amountHT) || 0;
  const rate = Number(inv.taxRate) || 0;
  return ht + ht * (rate / 100);
}

export default function App() {
  const [units, setUnits] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard"); // dashboard | list | form | units
  const [filterUnit, setFilterUnit] = useState("toutes");
  const [filterStatus, setFilterStatus] = useState("toutes");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    setUnits(loadUnits());
    setInvoices(loadInvoices());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveUnits(units);
  }, [units, loaded]);
  useEffect(() => {
    if (loaded) saveInvoices(invoices);
  }, [invoices, loaded]);

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
  function saveInvoice(inv) {
    const ttc = inv.amountTTC !== "" ? Number(inv.amountTTC) : computeTTC(inv);
    const toSave = { ...inv, amountTTC: ttc };
    setInvoices((prev) => {
      const exists = prev.some((i) => i.id === inv.id);
      return exists ? prev.map((i) => (i.id === inv.id ? toSave : i)) : [toSave, ...prev];
    });
    setView("list");
    setEditing(null);
  }
  async function removeInvoice(inv) {
    if (inv.fileId) await deleteFile(inv.fileId).catch(() => {});
    setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
  }
  function toggleStatus(inv) {
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === inv.id
          ? { ...i, status: i.status === "payé" ? "impayé" : "payé", paidDate: i.status === "payé" ? "" : todayISO() }
          : i
      )
    );
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

  return (
    <div className="pmu-app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Ⓕ</span>
          <div>
            <div className="brand-title">Registre</div>
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
      </aside>

      <main className="content">
        {view === "dashboard" && <Dashboard stats={stats} invoices={invoices} unitName={unitName} onOpen={openEdit} onNew={openNew} unitsExist={units.length > 0} />}

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
          />
        )}

        {view === "form" && editing && (
          <InvoiceForm invoice={editing} units={units} onSave={saveInvoice} onCancel={() => setView("list")} />
        )}

        {view === "units" && <UnitsManager units={units} setUnits={setUnits} invoices={invoices} />}
      </main>
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
                  <td>{inv.fileId ? <FileLink fileId={inv.fileId} fileName={inv.fileName} /> : <span className="muted">—</span>}</td>
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

function FileLink({ fileId, fileName }) {
  const [url, setUrl] = useState(null);
  async function open() {
    if (url) {
      window.open(url, "_blank");
      return;
    }
    const rec = await getFile(fileId);
    if (rec) {
      const objUrl = URL.createObjectURL(rec.blob);
      setUrl(objUrl);
      window.open(objUrl, "_blank");
    }
  }
  return (
    <button className="file-link" onClick={open} title={fileName}>
      <Paperclip size={13} /> {fileName ? fileName.slice(0, 18) : "fichier"}
    </button>
  );
}

function InvoiceForm({ invoice, units, onSave, onCancel }) {
  const [inv, setInv] = useState(invoice);
  const [fileMeta, setFileMeta] = useState(invoice.fileName ? { name: invoice.fileName } : null);
  const fileRef = useRef(null);
  const ttc = inv.amountTTC !== "" && inv.amountTTC != null && inv.amountTTC !== undefined && !isNaN(Number(inv.amountTTC)) && inv.amountTTC !== ""
    ? computeTTC(inv)
    : computeTTC(inv);

  function update(field, value) {
    setInv((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fileId = inv.fileId || uid();
    await saveFile(fileId, file);
    setInv((prev) => ({ ...prev, fileId, fileName: file.name }));
    setFileMeta({ name: file.name });
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
            <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFile} />
            {fileMeta && <span className="muted">{fileMeta.name}</span>}
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

function UnitsManager({ units, setUnits, invoices }) {
  const [name, setName] = useState("");

  function addUnit() {
    if (!name.trim()) return;
    setUnits((prev) => [...prev, { id: uid(), name: name.trim() }]);
    setName("");
  }
  function removeUnit(id) {
    setUnits((prev) => prev.filter((u) => u.id !== id));
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
                    <button className="icon-btn danger" onClick={() => removeUnit(u.id)}>
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
