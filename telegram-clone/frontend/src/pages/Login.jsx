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
      setError(err.response?.data?.error || 'Login nahi ho paya');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand__crest">M</div>
          <div>
            <h1>FairyChat</h1>
            <span>Apka apna private messenger</span>
          </div>
        </div>
        <h2>Wapas swagat hai</h2>
        <p className="subtitle">Apne account me login karein</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Username ya Phone</label>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="username ya phone number" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn-primary" disabled={loading}>{loading ? 'Login ho raha hai...' : 'Login Karein'}</button>
        </form>

        <div className="auth-switch">
          Account nahi hai?
          <Link to="/register"><button type="button">Register karein</button></Link>
        </div>
      </div>
    </div>
  );
}
