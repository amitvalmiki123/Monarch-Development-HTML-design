import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img className="auth-brand__crest" src="/icons/brand-crest.png" alt="FairyChat" />
          <div>
            <h1>FairyChat</h1>
            <span>Your own private messenger</span>
          </div>
        </div>
        <h2>Welcome back</h2>
        <p className="subtitle">Log in to your account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Username or Phone</label>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="username or phone number" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn-primary" disabled={loading}>{loading ? 'Logging in...' : 'Log In'}</button>
        </form>

        <div className="auth-switch">
          Don't have an account?
          <Link to="/register"><button type="button">Register</button></Link>
        </div>
      </div>
    </div>
  );
}
