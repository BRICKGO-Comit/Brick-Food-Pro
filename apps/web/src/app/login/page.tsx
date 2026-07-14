'use client';

import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error);
      setLoading(false);
    }
    // Le redirect est géré par le layout une fois la session établie
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.png" alt="Brick Food" />
          <div className="logo-text">
            BRICK<span>FOOD</span>
          </div>
        </div>

        <h1>Administration Centrale</h1>
        <p className="login-subtitle">Connectez-vous pour accéder au portail d'administration</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-field">
            <span>Adresse email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@brickfood.com"
              required
              autoFocus
            />
          </label>

          <label className="login-field">
            <span>Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0F0F10 0%, #1a1a1a 100%);
          padding: 20px;
        }
        .login-card {
          background: #fff;
          border-radius: 20px;
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          margin-bottom: 24px;
        }
        .login-logo img {
          width: 56px;
          height: 56px;
          object-fit: contain;
        }
        .login-logo .logo-text {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -1px;
        }
        .login-logo .logo-text span {
          color: var(--primary);
        }
        .login-card h1 {
          font-size: 22px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 6px;
        }
        .login-subtitle {
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
          margin-bottom: 32px;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .login-field span {
          font-size: 13px;
          font-weight: 600;
        }
        .login-field input {
          padding: 12px 14px;
          border: 1.5px solid var(--border);
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: var(--transition);
        }
        .login-field input:focus {
          border-color: var(--primary);
        }
        .login-error {
          background: #FFF0F0;
          color: #E30613;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          border: 1px solid #FFD0D0;
        }
        .login-btn {
          background: var(--primary);
          color: #fff;
          border: none;
          padding: 14px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition);
          margin-top: 4px;
        }
        .login-btn:hover:not(:disabled) {
          background: var(--primary-hover);
        }
        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
