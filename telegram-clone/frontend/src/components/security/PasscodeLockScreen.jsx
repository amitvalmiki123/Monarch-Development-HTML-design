import { useState } from 'react';
import { verifyPasscode } from '../../utils/passcodeLock';
import { useAuth } from '../../context/AuthContext';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

export default function PasscodeLockScreen({ onUnlock }) {
  const { user, logout } = useAuth();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const press = async (key) => {
    if (checking) return;
    if (key === '') return;
    if (key === 'back') {
      setDigits((d) => d.slice(0, -1));
      setError(false);
      return;
    }
    if (digits.length >= 6) return;
    const next = digits + key;
    setDigits(next);
    setError(false);
    if (next.length >= 4) {
      setChecking(true);
      const ok = await verifyPasscode(next);
      setChecking(false);
      if (ok) {
        onUnlock();
      } else if (next.length === 6) {
        setError(true);
        setDigits('');
      }
      // If it's 4-5 digits and wrong, keep waiting for more digits (PINs
      // can be 4-6 long) unless it's already maxed out at 6.
    }
  };

  const forgot = () => {
    if (confirm('Forgot your passcode? This will log you out of FairyChat on this device. You can log back in with your account password.')) {
      logout();
    }
  };

  return (
    <div className="passcode-lock">
      <img className="passcode-lock__crest" src="/icons/brand-crest.png" alt="FairyChat" />
      <div className="passcode-lock__title">{user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'FairyChat is locked'}</div>
      <div className={`passcode-lock__hint${error ? ' passcode-lock__hint--error' : ''}`}>
        {error ? 'Incorrect passcode' : 'Enter your passcode to unlock'}
      </div>
      <div className="passcode-lock__dots">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`passcode-lock__dot${i < digits.length ? ' passcode-lock__dot--filled' : ''}`} />
        ))}
      </div>
      <div className="passcode-lock__keypad">
        {KEYS.map((k, i) => (
          <button
            key={i}
            className={`passcode-lock__key${k === '' ? ' passcode-lock__key--ghost' : ''}`}
            disabled={k === ''}
            onClick={() => press(k)}
          >
            {k === 'back' ? '⌫' : k}
          </button>
        ))}
      </div>
      <button className="passcode-lock__forgot" onClick={forgot}>Forgot passcode?</button>
    </div>
  );
}
