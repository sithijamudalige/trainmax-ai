import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = "http://127.0.0.1:5000";

export default function AdminEditRecord() {
  const nav = useNavigate();
  const { tableName, id } = useParams(); // id is undefined if it's "new"

  const isNew = !id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({});

  useEffect(() => {
    const isAdmin = localStorage.getItem("is_admin") === "true";
    if (!isAdmin) nav("/admin");
  }, [nav]);

  useEffect(() => {
    if (!isNew) {
      loadRecord();
    } else {
      // If it's new, we need a schema. Let's fetch one record just to get the schema,
      // or we can just let the user add fields manually, but better to fetch the first record to get keys.
      loadSchema();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, id, isNew]);

  async function loadSchema() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/crud/${tableName}`, { headers: { "X-Admin": "true" } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.records && data.records.length > 0) {
        const keys = Object.keys(data.records[0]);
        const initialForm = {};
        keys.forEach(k => initialForm[k] = "");
        setForm(initialForm);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecord() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/crud/${tableName}/${id}`, {
        headers: { "X-Admin": "true" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Failed to load record");
      
      setForm(data.record || {});
    } catch (e) {
      setErrorMsg(e?.message || "Failed to load record");
    } finally {
      setLoading(false);
    }
  }

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const url = isNew 
        ? `${API_BASE}/api/admin/crud/${tableName}` 
        : `${API_BASE}/api/admin/crud/${tableName}/${id}`;
        
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json", "X-Admin": "true" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Save failed");

      nav(`/admin/crud/${tableName}`);
    } catch (e) {
      setErrorMsg(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 40, fontFamily: "system-ui" }}>Loading...</div>;

  const fields = Object.keys(form).filter(k => k !== "id" && k !== "created_at");

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h2>{isNew ? `Create New ${tableName.replace(/_/g, " ")}` : `Edit ${tableName.replace(/_/g, " ")}: ${id}`}</h2>
        <button onClick={() => nav(`/admin/crud/${tableName}`)} style={{ padding: "8px 16px" }}>Back</button>
      </div>

      {errorMsg ? <div style={{ color: "crimson", marginBottom: 16 }}>{errorMsg}</div> : null}

      <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {fields.map(key => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontWeight: 600, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</label>
            {typeof form[key] === "boolean" ? (
              <select
                value={form[key]}
                onChange={e => setField(key, e.target.value === "true")}
                style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : typeof form[key] === "number" ? (
              <input
                type="number"
                step="any"
                value={form[key] === null ? "" : form[key]}
                onChange={e => setField(key, e.target.value === "" ? null : Number(e.target.value))}
                style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
              />
            ) : (
              <textarea
                value={form[key] === null ? "" : (typeof form[key] === "object" ? JSON.stringify(form[key]) : form[key])}
                onChange={e => setField(key, e.target.value)}
                style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc", minHeight: 40 }}
              />
            )}
          </div>
        ))}
        
        {fields.length === 0 && isNew && (
            <p>No schema detected. This means the table might be empty. You cannot create a record dynamically yet.</p>
        )}

        <button 
          type="submit" 
          disabled={saving || (fields.length === 0 && isNew)}
          style={{ 
            background: "#6a11cb", 
            color: "white", 
            padding: 14, 
            borderRadius: 6, 
            border: "none", 
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer" 
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
