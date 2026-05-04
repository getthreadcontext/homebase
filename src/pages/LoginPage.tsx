import React from "react";
import { useAuth } from "../hooks/useAuth";
import "../styles/login.css";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="page-shell">
      <div className="page-shell-inner editor-grid two-col">
        <section className="surface pad-xl login-hero">
          <p className="eyebrow">tynz.sh access</p>
          <h1 className="display-title">private entry</h1>
          <div className="split-rule" />
          <p className="subtle-copy login-manifesto">
            a quiet gate for invited users, admins, and private project access.
          </p>
        </section>

        <section className="surface pad-xl login-box">
          <p className="eyebrow">sign in</p>
          <h2>discord authentication</h2>
          <p className="subtle-copy login-copy">
            use discord to continue into the workspace.
          </p>

          <div className="login-content">
            <button onClick={login} className="btn-discord-large">
              continue with discord
            </button>
          </div>

          <footer className="login-footer">
            <p>invite required unless you are an admin.</p>
          </footer>
        </section>
      </div>
    </div>
  );
};
