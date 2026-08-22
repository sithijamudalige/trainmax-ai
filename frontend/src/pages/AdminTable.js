import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = "http://127.0.0.1:5000";

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(900px, 96vw)",
          maxHeight: "85vh",
          overflow: "auto",
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#1f2937", fontSize: 20 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Close</button>
        </div>
        <hr style={{ border: "none", height: 1, background: "#e5e7eb", margin: "0 -24px 20px" }} />
        {children}
      </div>
    </div>
  );
}

export default function AdminTable() {
  const nav = useNavigate();
  const { tableName } = useParams();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [viewRecord, setViewRecord] = useState(null);

  useEffect(() => {
    const isAdmin = localStorage.getItem("is_admin") === "true";
    if (!isAdmin) nav("/admin");
  }, [nav]);

  async function fetchRecords() {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/crud/${tableName}`, {
        headers: { "X-Admin": "true" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || `Failed to load ${tableName}`);

      const list = Array.isArray(data.records) ? data.records : [];
      setRecords(list);

      // Extract column names from the first record
      let cols = [];
      if (list.length > 0) {
        cols = Object.keys(list[0]);
        setColumns(cols);
      } else {
        setColumns(["id"]); // default fallback
      }

    } catch (e) {
      setErrorMsg(e?.message || `Failed to load ${tableName}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  async function deleteRecord(recordId) {
    if (!window.confirm(`Delete this record from ${tableName}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/crud/${tableName}/${recordId}`, {
        method: "DELETE",
        headers: { "X-Admin": "true" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Delete failed");

      await fetchRecords();
    } catch (e) {
      alert(e?.message || "Delete failed");
    }
  }

  const renderCell = (r, col) => {
    const val = r[col];

    // Check if it's a photo column
    if ((col.includes("photo") || col.includes("avatar") || col.includes("image")) && val && typeof val === "string") {
      const publicUrl = `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/avatars/${val}`;
      return (
        <img 
          src={publicUrl} 
          alt={col} 
          style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #e5e7eb" }} 
        />
      );
    }

    if (val === null || val === undefined) return <span style={{ color: "#9ca3af" }}>-</span>;
    if (typeof val === "object") return <span style={{ color: "#6b7280" }}>{JSON.stringify(val).substring(0, 40)}...</span>;
    if (typeof val === "boolean") return (
      <span style={{ 
        padding: "4px 8px", 
        borderRadius: 12, 
        fontSize: 12, 
        fontWeight: 600, 
        background: val ? "#dcfce7" : "#fee2e2", 
        color: val ? "#166534" : "#991b1b" 
      }}>
        {val ? "True" : "False"}
      </span>
    );
    const str = String(val);
    if (str.length > 50) return <span title={str}>{str.substring(0, 50)}...</span>;
    
    // Highlight IDs for readability
    if (col === "id" || col.endsWith("_id")) {
      return <span style={{ fontFamily: "monospace", color: "#6366f1", background: "#e0e7ff", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>{str}</span>;
    }

    return str;
  };

  return (
    <>
      <style>{`
        .at-page { min-height: 100vh; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; padding: 40px 20px; }
        .at-container { max-width: 1280px; margin: 0 auto; }
        .at-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .at-title { margin: 0; font-size: 28px; font-weight: 800; color: #111827; text-transform: capitalize; }
        .at-title span { color: #6366f1; }
        .at-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-at { padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .btn-at-secondary { background: #fff; border: 1px solid #d1d5db; color: #374151; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .btn-at-secondary:hover { background: #f3f4f6; }
        .btn-at-primary { background: #6366f1; color: #fff; box-shadow: 0 4px 6px -1px rgba(99,102,241,0.2); }
        .btn-at-primary:hover { background: #4f46e5; transform: translateY(-1px); }
        
        .at-table-container { background: #fff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); overflow: hidden; border: 1px solid #e5e7eb; }
        .at-table { width: 100%; border-collapse: collapse; text-align: left; }
        .at-table th { background: #f9fafb; padding: 16px 20px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        .at-table td { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; vertical-align: middle; }
        .at-table tbody tr:hover { background: #f9fafb; }
        .at-table tbody tr:last-child td { border-bottom: none; }
        
        .at-row-actions { display: flex; gap: 8px; opacity: 0.6; transition: opacity 0.2s; }
        .at-table tbody tr:hover .at-row-actions { opacity: 1; }
        .btn-icon { padding: 6px; border-radius: 6px; cursor: pointer; border: none; background: transparent; transition: all 0.2s; }
        .btn-icon:hover { background: #f3f4f6; }
        .btn-icon-view { color: #3b82f6; }
        .btn-icon-edit { color: #10b981; }
        .btn-icon-delete { color: #ef4444; }
        .btn-icon-delete:hover { background: #fee2e2; }

        .at-loader { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="at-page">
        <div className="at-container">
          <div className="at-header">
            <h2 className="at-title">Manage <span>{tableName.replace(/_/g, " ")}</span></h2>
            <div className="at-actions">
              <button className="btn-at btn-at-secondary" onClick={() => nav("/admin/dashboard")}>← Dashboard</button>
              <button className="btn-at btn-at-secondary" onClick={fetchRecords} disabled={loading}>
                {loading ? <div className="at-loader" style={{ width:16, height:16, borderWidth:2, marginRight:8 }} /> : "↻ Refresh"}
              </button>
              <button className="btn-at btn-at-primary" onClick={() => nav(`/admin/crud/${tableName}/new`)}>
                + Create Record
              </button>
            </div>
          </div>

          {errorMsg ? (
            <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "16px 20px", borderRadius: 12, marginBottom: 24, border: "1px solid #fecaca", fontWeight: 500 }}>
              ⚠️ {errorMsg}
            </div>
          ) : null}

          <div className="at-table-container">
            <div style={{ overflowX: "auto" }}>
              <table className="at-table">
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col}>{col.replace(/_/g, " ")}</th>
                    ))}
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      {columns.map(col => (
                        <td key={col} style={{ maxWidth: 240, wordBreak: "break-all" }}>
                          {renderCell(r, col)}
                        </td>
                      ))}
                      <td>
                        <div className="at-row-actions">
                          <button className="btn-icon btn-icon-view" onClick={() => setViewRecord(r)} title="View Details">
                            👁️
                          </button>
                          <button className="btn-icon btn-icon-edit" onClick={() => nav(`/admin/crud/${tableName}/${r.id}/edit`)} title="Edit Record">
                            ✏️
                          </button>
                          <button className="btn-icon btn-icon-delete" onClick={() => deleteRecord(r.id)} title="Delete Record">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {!loading && records.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 1} style={{ textAlign: "center", padding: "48px 20px", color: "#6b7280" }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>No records found</div>
                        <div>Get started by creating a new record in {tableName.replace(/_/g, " ")}.</div>
                      </td>
                    </tr>
                  )}

                  {loading && records.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 1} style={{ textAlign: "center", padding: "48px 20px" }}>
                        <div className="at-loader" style={{ margin: "0 auto 16px" }} />
                        <div style={{ color: "#6b7280" }}>Loading records...</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {viewRecord && (
          <Modal title="Record Details" onClose={() => setViewRecord(null)}>
            <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
              {/* If there's an avatar/photo in the record, display it prominently in the modal */}
              {columns.filter(c => c.includes("photo") || c.includes("avatar")).map(col => {
                if (viewRecord[col] && typeof viewRecord[col] === "string") {
                  const publicUrl = `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/avatars/${viewRecord[col]}`;
                  return (
                    <img 
                      key={col}
                      src={publicUrl} 
                      alt="Avatar" 
                      style={{ width: 100, height: 100, borderRadius: 20, objectFit: "cover", border: "4px solid #f3f4f6", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}
                    />
                  );
                }
                return null;
              })}
              <div>
                <h4 style={{ margin: "0 0 8px", color: "#111827", fontSize: 24 }}>ID: <span style={{ color: "#6366f1" }}>{viewRecord.id.substring(0,8)}</span></h4>
                <div style={{ color: "#6b7280" }}>Created: {viewRecord.created_at ? new Date(viewRecord.created_at).toLocaleString() : "Unknown"}</div>
              </div>
            </div>
            
            <pre style={{ 
              whiteSpace: "pre-wrap", 
              background: "#1f2937", 
              color: "#f3f4f6",
              padding: 20, 
              borderRadius: 12,
              fontFamily: "monospace",
              fontSize: 13,
              margin: 0,
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
            }}>
              {JSON.stringify(viewRecord, null, 2)}
            </pre>
          </Modal>
        )}
      </div>
    </>
  );
}
