import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
          borderRadius: 10,
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <hr />
        {children}
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [users, setUsers] = useState([]);

  // signed avatar urls by user id
  const [photoUrls, setPhotoUrls] = useState({}); // { [id]: url }

  // modals
  const [viewUser, setViewUser] = useState(null);

  useEffect(() => {
    const isAdmin = localStorage.getItem("is_admin") === "true";
    if (!isAdmin) nav("/admin");
  }, [nav]);

  async function getSignedPhotoUrl(photoPath) {
    if (!photoPath) return "";

    const url = `${API_BASE}/api/admin/avatar/signed-url?path=${encodeURIComponent(photoPath)}`;
    const res = await fetch(url, { headers: { "X-Admin": "true" } });

    const data = await res.json().catch(() => ({}));
    console.log("SIGNED-URL CALL:", { url, status: res.status, data });

    if (!res.ok) return "";
    return data?.signed_url || "";
  }

  async function fetchUsers() {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { "X-Admin": "true" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Failed to load users");

      const list = Array.isArray(data.users) ? data.users : [];
      setUsers(list);

      // fetch signed urls for avatars
      const nextMap = {};
      await Promise.all(
        list.map(async (u) => {
          if (!u.photo_path) return;
          const signedUrl = await getSignedPhotoUrl(u.photo_path);
          if (signedUrl) nextMap[u.id] = signedUrl;
        })
      );
      setPhotoUrls(nextMap);
    } catch (e) {
      setErrorMsg(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteUser(userId) {
    if (!window.confirm("Delete this user profile row?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "X-Admin": "true" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Delete failed");

      await fetchUsers();
    } catch (e) {
      alert(e?.message || "Delete failed");
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Admin - User Management</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => nav("/admin/dashboard")}>Back</button>
          <button onClick={fetchUsers} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}

      <div style={{ overflowX: "auto" }}>
        <table
          border="1"
          cellPadding="8"
          style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}
        >
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              <th>Photo</th>
              <th>ID</th>
              <th>User Name</th>
              <th>Email</th>
              <th>Country</th>
              <th>Position</th>
              <th>Club</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ textAlign: "center" }}>
                  {photoUrls[u.id] ? (
                    <img
                      src={photoUrls[u.id]}
                      alt="avatar"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid #ddd",
                      }}
                      onError={() => console.log("IMAGE FAILED:", photoUrls[u.id])}
                    />
                  ) : (
                    "-"
                  )}
                </td>

                <td style={{ maxWidth: 240, wordBreak: "break-all" }}>{u.id}</td>
                <td>{u.user_name || "-"}</td>
                <td>{u.email || "-"}</td>
                <td>{u.country || "-"}</td>
                <td>{u.position || "-"}</td>
                <td>{u.club || "-"}</td>

                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setViewUser(u)}>View</button>

                    {/* EDIT now navigates to EditUser page */}
                    <button onClick={() => nav(`/admin/users/${u.id}/edit`)}>Edit</button>

                    <button onClick={() => deleteUser(u.id)} style={{ color: "crimson" }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center" }}>
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* VIEW MODAL */}
      {viewUser ? (
        <Modal title="User Details" onClose={() => setViewUser(null)}>
          {photoUrls[viewUser.id] ? (
            <div style={{ marginBottom: 12 }}>
              <img
                src={photoUrls[viewUser.id]}
                alt="avatar"
                style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover" }}
                onError={() => console.log("IMAGE FAILED (VIEW):", photoUrls[viewUser.id])}
              />
            </div>
          ) : null}

          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(viewUser, null, 2)}</pre>
        </Modal>
      ) : null}
    </div>
  );
}