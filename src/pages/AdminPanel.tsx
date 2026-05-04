import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import "../styles/admin.css";

interface Invite {
  _id: string;
  code: string;
  used: boolean;
  usedBy?: string;
  usedAt?: number;
  createdAt: number;
}

interface ZiplineInvite {
  _id: string;
  code: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  uses: number;
  maxUses?: number;
  inviterUsername: string;
  inviterRole: string;
  discordId: string;
}

export const AdminPanel: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const ziplineBaseUrl =
    import.meta.env.VITE_ZIPLINE_BASE_URL || "https://zip.freedom4me.nl";
  const [invites, setInvites] = useState<Invite[]>([]);
  const [ziplineInvites, setZiplineInvites] = useState<ZiplineInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [ziplineLoading, setZiplineLoading] = useState(true);
  const [generatingNew, setGeneratingNew] = useState(false);
  const [generatingZipline, setGeneratingZipline] = useState(false);
  const [activeTab, setActiveTab] = useState<"invites" | "settings">("invites");

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    const fetchInvites = async () => {
      try {
        const response = await fetch("/api/admin/invites");
        if (response.ok) {
          const data = await response.json();
          setInvites(data);
        }
      } catch (error) {
        console.error("Failed to fetch invites:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchZiplineInvites = async () => {
      try {
        const response = await fetch("/api/admin/zipline-invites", {
          headers: {
            "X-Discord-ID": user?.discordId || "",
          },
        });
        if (response.ok) {
          const data = await response.json();
          setZiplineInvites(data);
        }
      } catch (error) {
        console.error("Failed to fetch Zipline invites:", error);
      } finally {
        setZiplineLoading(false);
      }
    };

    fetchInvites();
    fetchZiplineInvites();
  }, [isAdmin, navigate, user?.discordId]);

  const handleGenerateInvite = async () => {
    setGeneratingNew(true);
    try {
      const response = await fetch("/api/admin/generate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdBy: user?.discordId }),
      });

      if (response.ok) {
        const newInvite = await response.json();
        setInvites([newInvite, ...invites]);
      }
    } catch (error) {
      console.error("Failed to generate invite:", error);
    } finally {
      setGeneratingNew(false);
    }
  };

  const handleGenerateZiplineInvite = async () => {
    setGeneratingZipline(true);
    try {
      const response = await fetch("/api/auth/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Discord-ID": user?.discordId || "",
        },
        body: JSON.stringify({ maxUses: 1 }),
      });

      if (response.ok) {
        await response.json();
        // Refresh list from server so it includes stored metadata
        const listResponse = await fetch("/api/admin/zipline-invites", {
          headers: {
            "X-Discord-ID": user?.discordId || "",
          },
        });
        if (listResponse.ok) {
          const data = await listResponse.json();
          setZiplineInvites(data);
        }
      }
    } catch (error) {
      console.error("Failed to generate Zipline invite:", error);
    } finally {
      setGeneratingZipline(false);
    }
  };

  const getInviteUrl = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite?code=${code}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getZiplineInviteUrl = (code: string) => {
    return `${ziplineBaseUrl}/invite/${code}`;
  };

  return (
    <div className="page-shell admin-container">
      <header className="admin-header page-shell-inner">
        <div>
          <p className="mono-label">admin</p>
          <h1>tynz.sh control</h1>
        </div>
        <div className="header-actions">
          <span className="user-badge">{user?.username}</span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="btn-danger"
          >
            logout
          </button>
        </div>
      </header>

      <nav className="admin-nav page-shell-inner">
        <button
          className={`nav-btn ${activeTab === "invites" ? "active" : ""}`}
          onClick={() => setActiveTab("invites")}
        >
          invites
        </button>
        <button
          className={`nav-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          settings
        </button>
      </nav>

      <main className="admin-content page-shell-inner editor-grid">
        {activeTab === "invites" && (
          <section className="surface pad-xl invites-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">direct access</p>
                <h2>invite links</h2>
              </div>
              <button
                onClick={handleGenerateInvite}
                disabled={generatingNew}
                className="btn-primary"
              >
                {generatingNew ? "generating..." : "new invite"}
              </button>
            </div>

            {loading ? (
              <p>loading invites...</p>
            ) : invites.length === 0 ? (
              <p>no invites yet.</p>
            ) : (
              <div className="invites-table">
                <div className="table-header">
                  <div>Code</div>
                  <div>Status</div>
                  <div>Created</div>
                  <div>Used By</div>
                  <div>Link</div>
                </div>
                {invites.map((invite) => (
                  <div key={invite._id} className="table-row">
                    <div className="code">{invite.code}</div>
                    <div className="status">
                      {invite.used ? (
                        <span className="badge-used">Used</span>
                      ) : (
                        <span className="badge-available">Available</span>
                      )}
                    </div>
                    <div>
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </div>
                    <div>{invite.usedBy || "-"}</div>
                    <div>
                      <button
                        onClick={() =>
                          copyToClipboard(getInviteUrl(invite.code))
                        }
                        className="btn-small"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="section-header" style={{ marginTop: "36px" }}>
              <div>
                <p className="eyebrow">zipline</p>
                <h2>zipline invites</h2>
              </div>
              <button
                onClick={handleGenerateZiplineInvite}
                disabled={generatingZipline}
                className="btn-primary"
              >
                {generatingZipline ? "generating..." : "zipline invite"}
              </button>
            </div>

            {ziplineLoading ? (
              <p>loading zipline invites...</p>
            ) : ziplineInvites.length === 0 ? (
              <p>no zipline invites yet.</p>
            ) : (
              <div className="invites-table">
                <div className="table-header">
                  <div>Code</div>
                  <div>Uses</div>
                  <div>Max Uses</div>
                  <div>Created</div>
                  <div>Link</div>
                </div>
                {ziplineInvites.map((invite) => (
                  <div key={invite._id} className="table-row">
                    <div className="code">{invite.code}</div>
                    <div>{invite.uses}</div>
                    <div>{invite.maxUses ?? "-"}</div>
                    <div>
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </div>
                      <div>
                        <button
                          onClick={() =>
                            copyToClipboard(getZiplineInviteUrl(invite.code))
                          }
                          className="btn-small"
                        >
                          Copy Link
                        </button>
                      </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "settings" && (
          <section className="surface pad-xl settings-section">
            <p className="eyebrow">system</p>
            <h2>settings</h2>
            <p>configure your tynz.sh instance.</p>
            <div className="settings-placeholder">
              <p>settings management coming soon.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
