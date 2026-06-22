import React, { useState, useEffect } from "react";

const NAVY = "#0B1F3F";
const GOLD = "#C99B3F";
const CREAM = "#F7F3EA";
const GREEN = "#1E5631";

export default function AdminApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem("symecs_admin_token") || "");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      sessionStorage.setItem("symecs_admin_token", data.token);
      setToken(data.token);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("symecs_admin_token");
    setToken("");
  }

  if (!token) {
    return (
      <div style={styles.loginPage}>
        <form onSubmit={handleLogin} style={styles.loginCard}>
          <div style={styles.loginEyebrow}>Admin access</div>
          <h1 style={styles.loginTitle}>Techpulse 2026 admin panel</h1>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            required
            autoFocus
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
          />
          {loginError && <div style={styles.errorBox}>{loginError}</div>}
          <button type="submit" style={styles.primaryBtn} disabled={loggingIn}>
            {loggingIn ? "Checking..." : "Log in"}
          </button>
        </form>
      </div>
    );
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}

function Dashboard({ token, onLogout }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/registrations", {
        headers: { "x-admin-token": token },
      });
      if (res.status === 401) {
        sessionStorage.removeItem("symecs_admin_token");
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRegistrations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(id) {
    if (!window.confirm("Delete this registration?")) return;
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });
      if (!res.ok) throw new Error("Delete failed");
      setRegistrations((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.fullName?.toLowerCase().includes(q) ||
      r.instituteName?.toLowerCase().includes(q) ||
      r.contact?.toLowerCase().includes(q)
    );
  });

  const totalCollected = registrations.reduce((sum, r) => sum + (r.totalFee || 0), 0);
  const totalEntries = registrations.reduce((sum, r) => sum + (r.competitions?.length || 0), 0);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={styles.brandTitle}>Techpulse 2026 — admin panel</div>
            <div style={styles.brandSub}>All registrations from the database</div>
          </div>
          <button style={styles.logoutBtn} onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.statsRow}>
          <StatCard label="Total registrations" value={registrations.length} />
          <StatCard label="Total competition entries" value={totalEntries} />
          <StatCard label="Total fee collected" value={`Rs ${totalCollected}`} />
        </div>

        <div style={styles.toolbar}>
          <input
            style={styles.searchInput}
            placeholder="Search by name, institute or contact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button style={styles.refreshBtn} onClick={loadData}>
            Refresh
          </button>
        </div>

        {loading && <div style={styles.muted}>Loading registrations...</div>}
        {error && <div style={styles.errorBox}>{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div style={styles.muted}>No registrations found.</div>
        )}

        <div style={styles.cardList}>
          {filtered.map((r) => (
            <div key={r._id} style={styles.regCard}>
              <div
                style={styles.regCardHeader}
                onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
              >
                <div>
                  <div style={styles.regName}>{r.fullName}</div>
                  <div style={styles.regMeta}>
                    {r.instituteName} · {r.contact} · {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={styles.regFeeBadge}>Rs {r.totalFee}</div>
              </div>

              {expandedId === r._id && (
                <div style={styles.regDetails}>
                  <div style={styles.detailLabel}>Competitions</div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Competition</th>
                        <th style={styles.th}>Squad type</th>
                        <th style={styles.th}>Players</th>
                        <th style={styles.th}>Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.competitions?.map((c, idx) => (
                        <tr key={idx}>
                          <td style={styles.td}>{c.name}</td>
                          <td style={styles.td}>{c.squadOption || "-"}</td>
                          <td style={styles.td}>{c.players}</td>
                          <td style={styles.td}>Rs {c.fee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={styles.screenshotRow}>
                    <div style={styles.detailLabel}>Payment screenshot</div>
                    <a
                      href={`/uploads/${r.screenshotPath}`}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.viewLink}
                    >
                      View screenshot
                    </a>
                  </div>

                  <button style={styles.deleteBtn} onClick={() => handleDelete(r._id)}>
                    Delete registration
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    background: CREAM,
    minHeight: "100vh",
    color: NAVY,
  },
  loginPage: {
    fontFamily: "Inter, system-ui, sans-serif",
    background: `linear-gradient(180deg, ${NAVY}, #122a52)`,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loginCard: {
    background: "#fff",
    borderRadius: 18,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
  },
  loginEyebrow: {
    color: GREEN,
    fontWeight: 700,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  loginTitle: { fontSize: 20, fontWeight: 700, margin: "0 0 20px", fontFamily: "Poppins, sans-serif" },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: {
    width: "100%",
    padding: "11px 14px",
    border: "1px solid #d7cdb3",
    borderRadius: 10,
    fontSize: 14.5,
    boxSizing: "border-box",
    marginBottom: 12,
  },
  primaryBtn: {
    background: GOLD,
    color: NAVY,
    border: "none",
    padding: "12px 20px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
  },
  errorBox: {
    background: "#fcebeb",
    color: "#791f1f",
    fontSize: 13,
    padding: "10px 12px",
    borderRadius: 8,
    marginBottom: 12,
  },
  header: {
    background: `linear-gradient(180deg, #122a52, ${NAVY})`,
    padding: "18px 20px",
    borderBottom: `3px solid ${GOLD}`,
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  brandTitle: { color: "#fff", fontWeight: 700, fontSize: 17, fontFamily: "Poppins, sans-serif" },
  brandSub: { color: "#cdd6e8", fontSize: 12.5, marginTop: 2 },
  logoutBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid #2c3e63",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13.5,
  },
  main: { maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 24,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e3d9c2",
    borderRadius: 14,
    padding: "16px 18px",
  },
  statLabel: { fontSize: 12.5, color: "#6b7794", textTransform: "uppercase" },
  statValue: { fontSize: 24, fontWeight: 700, marginTop: 4 },
  toolbar: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  searchInput: {
    flex: 1,
    minWidth: 220,
    padding: "10px 14px",
    border: "1px solid #d7cdb3",
    borderRadius: 10,
    fontSize: 14,
  },
  refreshBtn: {
    background: "#fff",
    border: "1px solid #d7cdb3",
    borderRadius: 10,
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  muted: { color: "#6b7794", fontSize: 14, padding: "20px 0", textAlign: "center" },
  cardList: { display: "flex", flexDirection: "column", gap: 10 },
  regCard: {
    background: "#fff",
    border: "1px solid #e3d9c2",
    borderRadius: 14,
    overflow: "hidden",
  },
  regCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 18px",
    cursor: "pointer",
    gap: 12,
    flexWrap: "wrap",
  },
  regName: { fontWeight: 700, fontSize: 15.5 },
  regMeta: { fontSize: 12.5, color: "#6b7794", marginTop: 2 },
  regFeeBadge: {
    background: "#fdf3e0",
    color: "#8a6312",
    fontWeight: 700,
    fontSize: 13.5,
    padding: "5px 12px",
    borderRadius: 8,
  },
  regDetails: { padding: "0 18px 18px", borderTop: "1px solid #e3d9c2" },
  detailLabel: { fontSize: 12, color: "#6b7794", textTransform: "uppercase", margin: "14px 0 8px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th: { textAlign: "left", padding: "6px 8px", color: "#6b7794", borderBottom: "1px solid #e3d9c2" },
  td: { padding: "6px 8px", borderBottom: "1px solid #f0ead8" },
  screenshotRow: { marginTop: 8 },
  viewLink: { color: GREEN, fontWeight: 600, fontSize: 13.5 },
  deleteBtn: {
    marginTop: 14,
    background: "#fcebeb",
    color: "#791f1f",
    border: "1px solid #f0c1c1",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};
