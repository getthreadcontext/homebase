import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/auth.css";

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const username = localStorage.getItem("tempUsername") || "User";
        const inviteCode = localStorage.getItem("tempInviteCode");

        if (!code) {
          throw new Error("Missing authorization code");
        }

        // Exchange code for user data
        const response = await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, username, inviteCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Authentication failed");
        }

        const userData = await response.json();
        localStorage.setItem("user", JSON.stringify(userData));

        // Clean up temp storage
        localStorage.removeItem("tempUsername");
        localStorage.removeItem("tempInviteCode");

        // Auto-register as admin if authorized
        try {
          await fetch("/api/admin/register-if-authorized", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discordId: userData.discordId }),
          });
        } catch (adminError) {
          console.warn("Admin registration check failed (non-critical):", adminError);
        }

        // Redirect to dashboard
        navigate("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
        console.error("Auth error:", err);
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="auth-container">
      {error ? (
        <div>
          <h1>Authentication Error</h1>
          <p>{error}</p>
          <p>Redirecting...</p>
        </div>
      ) : (
        <div>
          <h1>Authenticating...</h1>
          <p>Please wait while we verify your Discord account.</p>
        </div>
      )}
    </div>
  );
};
