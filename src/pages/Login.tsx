import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Slight artificial delay so it feels like a real auth call
    setTimeout(() => {
      const ok = login(username.trim(), password);
      if (ok) {
        navigate("/", { replace: true });
      } else {
        setError("Invalid username or password.");
        setLoading(false);
      }
    }, 600);
  }

  return (
    <div style={styles.page}>
      {/* Background grid pattern */}
      <div style={styles.grid} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <img
            src="/Astrikos Logo Transparent perfect 1.png"
            alt="Astrikos"
            style={styles.logo}
          />
        </div>

        <h1 style={styles.title}>Renewable Operations Dashboard</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Username */}
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrap}>
              <span style={styles.icon}>
                <UserIcon />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={styles.input}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <span style={styles.icon}>
                <LockIcon />
              </span>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ ...styles.input, paddingRight: 44 }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPwd ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <span style={{ marginRight: 6 }}>⚠</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={loading ? { ...styles.btn, ...styles.btnDisabled } : styles.btn}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p style={styles.footer}>
          Astrikos Energy Intelligence Platform · v2.4
        </p>
      </div>
    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0d0d0d 0%, #141a24 50%, #0d0d0d 100%)",
    position: "relative",
    overflow: "hidden",
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(91,141,224,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(91,141,224,0.04) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 420,
    background: "rgba(26,26,36,0.92)",
    border: "1px solid rgba(91,141,224,0.18)",
    borderRadius: 16,
    padding: "40px 36px 32px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(91,141,224,0.08)",
    backdropFilter: "blur(16px)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 20,
  },
  logo: {
    height: 56,
    objectFit: "contain",
    filter: "brightness(1.1)",
  },
  title: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: 600,
    color: "#e8eef5",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 13,
    color: "#7a90a8",
    marginBottom: 28,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: "#afc3d8",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  icon: {
    position: "absolute",
    left: 12,
    display: "flex",
    alignItems: "center",
    color: "#5b8de0",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "10px 12px 10px 38px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(91,141,224,0.2)",
    borderRadius: 8,
    color: "#e8eef5",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    background: "none",
    border: "none",
    color: "#5b8de0",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 8,
    background: "rgba(220,38,38,0.12)",
    border: "1px solid rgba(220,38,38,0.35)",
    color: "#f87171",
    fontSize: 13,
  },
  btn: {
    marginTop: 4,
    padding: "12px",
    borderRadius: 8,
    background: "linear-gradient(135deg, #3b6dbf 0%, #5b8de0 100%)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.3,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "opacity 0.2s",
    minHeight: 44,
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  spinner: {
    width: 18,
    height: 18,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
  footer: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 11,
    color: "#4a5a6a",
  },
};

// ── SVG icon components ────────────────────────────────────────────────────────

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
