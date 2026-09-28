import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, submitTwoStep, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const addingAccount = params.get('addAccount') === '1';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Two-Step Verification: set once the server says the account's cloud
  // password is required to finish signing in. `pendingToken` is the
  // short-lived token that /auth/two-step redeems.
  const [twoStep, setTwoStep] = useState(null); // { pendingToken, hint }
  const [cloudPassword, setCloudPassword] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(identifier.trim(), password);
      if (result?.requiresTwoStep) {
        setTwoStep({ pendingToken: result.pendingToken, hint: result.hint });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || (!err.response ? 'No internet connection — please check your network and try again' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const submitCloudPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await submitTwoStep(twoStep.pendingToken, cloudPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || (!err.response ? 'No internet connection — please check your network and try again' : 'Incorrect password'));
    } finally {
      setLoading(false);
    }
  };

  if (twoStep) {
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
          <h2>Enter your cloud password</h2>
          <p className="subtitle">
            This account is protected with an additional password. {twoStep.hint ? `Hint: ${twoStep.hint}` : ''}
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={submitCloudPassword}>
            <div className="field">
              <label>Cloud Password</label>
              <input
                type="password"
                autoFocus
                value={cloudPassword}
                onChange={(e) => setCloudPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button className="btn-primary" disabled={loading}>{loading ? 'Verifying...' : 'Verify'}</button>
          </form>

          <div className="auth-switch">
            <button type="button" onClick={() => { setTwoStep(null); setCloudPassword(''); setError(''); }}>← Back to login</button>
          </div>
        </div>
      </div>
    );
  }

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
        <h2>{addingAccount ? 'Add another account' : 'Welcome back'}</h2>
        <p className="subtitle">{addingAccount ? `Signed in as ${user?.name} — log in with a different account` : 'Log in to your account'}</p>

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
          <Link to={addingAccount ? '/register?addAccount=1' : '/register'}><button type="button">Register</button></Link>
        </div>
        {addingAccount && (
          <div className="auth-switch">
            <button type="button" onClick={() => navigate('/', { replace: true })}>← Cancel, go back</button>
          </div>
        )}
      </div>
    </div>
  );
}
