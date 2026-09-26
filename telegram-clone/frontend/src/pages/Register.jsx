import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ name: name.trim(), username: username.trim().toLowerCase(), phone: phone.trim() || undefined, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
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
        <h2>Create a new account</h2>
        <p className="subtitle">Get started in a few seconds</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amit Sharma" required />
          </div>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. amit_sharma" required />
          </div>
          <div className="field">
            <label>Phone number (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
          </div>
          <button className="btn-primary btn-gold" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>

        <div className="auth-switch">
          Already have an account?
          <Link to="/login"><button type="button">Log in</button></Link>
        </div>
      </div>
    </div>
  );
}
