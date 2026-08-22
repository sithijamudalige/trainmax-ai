import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css"
      />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .welcome-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
          font-family: system-ui;
        }

        .ball {
          position: absolute;
          font-size: 120px;
          opacity: 0.04;
          animation: floatBall linear infinite;
          pointer-events: none;
          user-select: none;
        }
        .ball:nth-child(1) { top: 5%;  left: 5%;  font-size: 160px; animation-duration: 9s;  animation-delay: 0s; }
        .ball:nth-child(2) { top: 10%; right: 8%; font-size: 100px; animation-duration: 7s;  animation-delay: 1s; }
        .ball:nth-child(3) { bottom: 8%; left: 10%; font-size: 140px; animation-duration: 11s; animation-delay: 2s; }
        .ball:nth-child(4) { bottom: 12%; right: 5%; font-size: 90px; animation-duration: 8s;  animation-delay: 0.5s; }
        .ball:nth-child(5) { top: 45%; left: 2%;  font-size: 70px;  animation-duration: 10s; animation-delay: 3s; }
        .ball:nth-child(6) { top: 40%; right: 3%; font-size: 80px;  animation-duration: 6s;  animation-delay: 1.5s; }

        @keyframes floatBall {
          0%   { transform: translateY(0px) rotate(0deg); }
          50%  { transform: translateY(-30px) rotate(180deg); }
          100% { transform: translateY(0px) rotate(360deg); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(106,17,203,0.5); }
          50%       { box-shadow: 0 0 60px rgba(37,117,252,0.7); }
        }

        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 100%; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }

        .hero-logo {
          width: 160px;
          height: 160px;
          border-radius: 28px;
          object-fit: contain;
          margin: 0 auto 32px;
          animation: pulse-glow 3s ease-in-out infinite, fadeInDown 0.7s ease forwards;
          position: relative;
          z-index: 1;
          display: block;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(106,17,203,0.25);
          border: 1px solid rgba(106,17,203,0.4);
          border-radius: 30px;
          padding: 6px 16px;
          color: #c4b5fd;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 20px;
          animation: fadeInDown 0.5s ease forwards;
        }

        .hero-title {
          font-size: clamp(32px, 6vw, 56px);
          font-weight: 900;
          text-align: center;
          line-height: 1.1;
          margin-bottom: 16px;
          animation: fadeInUp 0.6s ease 0.1s both;
          letter-spacing: -1px;
        }

        .hero-title .white { color: #fff; }
        .hero-title .gradient {
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          color: rgba(255,255,255,0.55);
          font-size: clamp(14px, 2.5vw, 17px);
          text-align: center;
          max-width: 480px;
          line-height: 1.7;
          margin-bottom: 40px;
          animation: fadeInUp 0.6s ease 0.2s both;
        }

        /* ---- Player section ---- */
        .section-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 12px;
          animation: fadeInUp 0.6s ease 0.25s both;
        }

        .section-label.player { color: #a78bfa; }
        .section-label.coach  { color: #34d399; }

        .btn-group-hero {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeInUp 0.6s ease 0.3s both;
          margin-bottom: 16px;
        }

        /* Divider */
        .or-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          max-width: 560px;
          margin: 24px 0;
          animation: fadeInUp 0.6s ease 0.35s both;
        }

        .or-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        .or-text {
          color: rgba(255,255,255,0.2);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          white-space: nowrap;
        }

        /* Coach section */
        .coach-section {
          animation: fadeInUp 0.6s ease 0.4s both;
          margin-bottom: 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
          max-width: 560px;
        }

        .coach-banner {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 14px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .coach-banner-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #059669, #10b981);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .coach-banner-text {
          flex: 1;
        }

        .coach-banner-title {
          color: #34d399;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .coach-banner-sub {
          color: rgba(255,255,255,0.35);
          font-size: 12px;
        }

        .coach-btns {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        /* Button styles */
        .btn-primary-hero {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          border: none;
          border-radius: 14px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
          font-family: system-ui;
          box-shadow: 0 4px 20px rgba(106,17,203,0.4);
        }

        .btn-primary-hero::before {
          content: "";
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: shimmer 2.5s infinite;
        }

        .btn-primary-hero:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(106,17,203,0.6);
          color: #fff;
        }

        .btn-secondary-hero {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 14px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          font-family: system-ui;
          backdrop-filter: blur(10px);
        }

        .btn-secondary-hero:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.3);
          transform: translateY(-3px);
          color: #fff;
        }

        .btn-coach-login {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 10px;
          color: #34d399;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          font-family: system-ui;
          white-space: nowrap;
        }

        .btn-coach-login:hover {
          background: rgba(16,185,129,0.25);
          border-color: rgba(16,185,129,0.5);
          transform: translateY(-2px);
          color: #34d399;
          box-shadow: 0 4px 14px rgba(16,185,129,0.2);
        }

        .btn-coach-register {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: linear-gradient(135deg, #059669, #10b981);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          font-family: system-ui;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(5,150,105,0.3);
          position: relative;
          overflow: hidden;
        }

        .btn-coach-register::before {
          content: "";
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: shimmer 2.5s infinite;
        }

        .btn-coach-register:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(5,150,105,0.4);
          color: #fff;
        }

        /* Feature cards */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          max-width: 680px;
          width: 100%;
          animation: fadeInUp 0.6s ease 0.45s both;
          margin-bottom: 40px;
        }

        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr; max-width: 340px; }
          .coach-banner { flex-direction: column; text-align: center; }
          .coach-btns { justify-content: center; }
        }

        .feature-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px 16px;
          text-align: center;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        }

        .feature-card:hover {
          background: rgba(106,17,203,0.15);
          border-color: rgba(106,17,203,0.3);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(106,17,203,0.2);
        }

        .feature-icon {
          font-size: 28px;
          margin-bottom: 10px;
          display: block;
          animation: bounce 2s ease-in-out infinite;
        }

        .feature-card:nth-child(2) .feature-icon { animation-delay: 0.3s; }
        .feature-card:nth-child(3) .feature-icon { animation-delay: 0.6s; }

        .feature-title {
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .feature-desc {
          color: rgba(255,255,255,0.45);
          font-size: 12px;
          line-height: 1.5;
        }

        .stats-row {
          display: flex;
          gap: 32px;
          justify-content: center;
          flex-wrap: wrap;
          animation: fadeInUp 0.6s ease 0.5s both;
          margin-bottom: 32px;
        }

        .stat-item { text-align: center; }

        .stat-number {
          color: #fff;
          font-size: 24px;
          font-weight: 900;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          color: rgba(255,255,255,0.4);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .footer-note {
          color: rgba(255,255,255,0.2);
          font-size: 12px;
          text-align: center;
          animation: fadeInUp 0.6s ease 0.6s both;
        }

        .footer-note span { color: rgba(255,255,255,0.35); font-weight: 700; }
      `}</style>

      <div className="welcome-page">

        {/* Floating footballs */}
        <div className="ball">⚽</div>
        <div className="ball">⚽</div>
        <div className="ball">⚽</div>
        <div className="ball">⚽</div>
        <div className="ball">⚽</div>
        <div className="ball">⚽</div>

        {/* Badge */}
        <div className="hero-badge">
          <span>⚽</span> AI-Powered Football Coaching
        </div>

        {/* Logo */}
        <img className="hero-logo" src="/logo.png" alt="Train Max Logo" />

        {/* Title */}
        <h1 className="hero-title">
          <span className="white">Meet </span>
          <span className="gradient">Train Max AI</span>
          <br />
          <span className="white">Your Personal Coach</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          Get personalized football training plans, AI-powered drills,
          and expert coaching tailored to your position, skill level, and goals.
        </p>

        {/* ---- Player section ---- */}
        <div className="section-label player">👤 For Players</div>
        <div className="btn-group-hero">
          <Link to="/login" className="btn-primary-hero">
            <span>🚀</span> Player Login
          </Link>
          <Link to="/signup" className="btn-secondary-hero">
            <span>✨</span> Create Player Account
          </Link>
        </div>

        {/* ---- Divider ---- */}
        <div className="or-divider">
          <div className="or-line" />
          <div className="or-text">Are you a coach?</div>
          <div className="or-line" />
        </div>

        {/* ---- Coach section ---- */}
        <div className="coach-section">
          <div className="coach-banner">
            <div className="coach-banner-icon">🧑‍🏫</div>
            <div className="coach-banner-text">
              <div className="coach-banner-title">Coach Portal</div>
              <div className="coach-banner-sub">
                Manage your players, create training plans, and track their progress
              </div>
            </div>
            <div className="coach-btns">
              <Link to="/coach-login" className="btn-coach-login">
                🔑 Coach Login
              </Link>
              <Link to="/coach-signup" className="btn-coach-register">
                🧑‍🏫 Register as Coach
              </Link>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🧠</span>
            <div className="feature-title">AI Coach Max</div>
            <div className="feature-desc">Personalized coaching that remembers your progress</div>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📋</span>
            <div className="feature-title">Training Plans</div>
            <div className="feature-desc">Auto-generated plans from your coaching sessions</div>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🎤</span>
            <div className="feature-title">Voice Input</div>
            <div className="feature-desc">Talk to your coach hands-free during training</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-number">AI</div>
            <div className="stat-label">Powered</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-label">Personalized</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">∞</div>
            <div className="stat-label">Sessions</div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-note">
          Powered by <span>Groq LLM</span> · Built for football players everywhere ⚽
        </div>

      </div>
    </>
  );
}