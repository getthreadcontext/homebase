import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/invite.css";

export const InvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<"username" | "discord">("username");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inviteCode = searchParams.get("code");

  if (!inviteCode) {
    return (
      <div className="page-shell invite-container">
        <div className="page-shell-inner">
          <div className="surface pad-xl invite-empty">
            <p className="eyebrow">invite</p>
            <h1>invalid invite</h1>
            <p className="subtle-copy">this link is invalid or expired.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    setStep("discord");
  };

  const handleDiscordAuth = async () => {
    setLoading(true);
    try {
      // Store username and invite code in localStorage before redirect
      localStorage.setItem("tempUsername", username);
      localStorage.setItem("tempInviteCode", inviteCode);

      const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI;
      const scope = "identify";
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      window.location.href = discordAuthUrl;
    } catch (err) {
      setError("Failed to start Discord auth");
      setLoading(false);
    }
  };

  return (
    <div className="page-shell invite-container">
      {step === "username" && (
        <form onSubmit={handleUsernameSubmit} className="invite-form surface pad-xl">
          <p className="eyebrow">invite flow</p>
          <h1>join tynz.sh</h1>
          <p className="subtle-copy">choose your handle first.</p>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
            className="input-field"
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary">
            Continue
          </button>
        </form>
      )}

      {step === "discord" && (
        <div className="invite-form surface pad-xl">
          <p className="eyebrow">authenticate</p>
          <h1>connect discord</h1>
          <p className="subtle-copy">
            username: <strong>{username}</strong>
          </p>
          <p className="subtle-copy">connect your discord account.</p>
          <button
            onClick={handleDiscordAuth}
            disabled={loading}
            className="btn-discord"
          >
            {loading ? "Connecting..." : "Connect Discord"}
          </button>
          <button
            onClick={() => {
              setStep("username");
              setError("");
            }}
            className="btn-secondary"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};
