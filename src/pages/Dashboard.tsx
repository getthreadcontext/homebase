import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

interface ZiplineInvite {
  _id: string;
  code: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  uses: number;
  maxUses?: number;
}

export const Dashboard: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [ziplineInvites, setZiplineInvites] = useState<ZiplineInvite[]>([]);
  const [inviteLoading, setInviteLoading] = useState(true);
  const ziplineBaseUrl =
    import.meta.env.VITE_ZIPLINE_BASE_URL || "https://zip.freedom4me.nl";

  if (!user) {
    navigate("/login");
    return null;
  }

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const response = await fetch("/api/auth/invites", {
          headers: {
            "X-Discord-ID": user.discordId,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setZiplineInvites(data);
        }
      } catch (error) {
        console.error("Failed to fetch Zipline invites:", error);
      } finally {
        setInviteLoading(false);
      }
    };

    fetchInvites();
  }, [user.discordId]);

  const latestInvite = useMemo(() => {
    if (!ziplineInvites.length) return null;
    return [...ziplineInvites].sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [ziplineInvites]);

  const getZiplineInviteUrl = (code: string) => {
    return `${ziplineBaseUrl}/invite/${code}`;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="page-shell dashboard-container">
      <header className="dashboard-header page-shell-inner">
        <div>
          <p className="mono-label">workspace</p>
          <h1>tynz.sh dashboard</h1>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="btn-secondary"
            >
              admin
            </button>
          )}
          <button onClick={handleLogout} className="btn-danger">
            logout
          </button>
        </div>
      </header>

      <main className="dashboard-main page-shell-inner editor-grid two-col">
        <section className="surface pad-xl user-info">
          <p className="eyebrow">member</p>
          <h2>{user.username}</h2>
          <div className="split-rule" />
          <div className="info-card">
            <p>
              <strong>discord id</strong>
              <br />
              {user.discordId}
            </p>
            <p>
              <strong>status</strong>
              <br />
              {isAdmin ? "admin" : "member"}
            </p>
            <p>
              <strong>joined</strong>
              <br />
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </section>

        <section className="surface pad-xl projects">
          <p className="eyebrow">invite</p>
          <h2>zipline invite</h2>
          <div className="split-rule" />
          {inviteLoading ? (
            <p>loading invite...</p>
          ) : latestInvite ? (
            <div className="info-card">
              <p>
                <strong>link</strong>
                <br />
                {getZiplineInviteUrl(latestInvite.code)}
              </p>
              <p>
                <strong>code</strong>
                <br />
                {latestInvite.code}
              </p>
              <p>
                <strong>uses</strong>
                <br />
                {latestInvite.uses}
                {latestInvite.maxUses ? ` / ${latestInvite.maxUses}` : ""}
              </p>
              <p>
                <strong>expires</strong>
                <br />
                {latestInvite.expiresAt
                  ? new Date(latestInvite.expiresAt).toLocaleString()
                  : "never"}
              </p>
            </div>
          ) : (
            <p>no invite yet.</p>
          )}
        </section>
      </main>
    </div>
  );
};
