import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import { useTheme, WALLPAPERS } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';
import { EMOJI_CATEGORIES, REACTION_CHOICES, DEFAULT_QUICK_REACTIONS } from '../data/emojiData';
import {
  UserGlyphIcon, AtIcon, InfoIcon, CakeIcon, AddPersonIcon, LogoutIcon,
  MoonIcon, SunIcon, BookmarkIcon, ImageIcon, BellIcon, GroupIcon,
  SpeakerIcon, WrenchIcon, PuzzleIcon, TrashIcon, CrownIcon,
  LockIcon, ShieldIcon, KeyIcon, DevicesIcon
} from '../components/common/SettingsIcons';
import http from '../api/http';
import { pushStatus, subscribeStatus, initNotifications, registerPushIfConfigured, sendLocalTestNotification, sendServerTestPush, getNotifPrefs, setNotifPrefs } from '../utils/notifications';
import {
  isPasscodeEnabled, setPasscode, disablePasscode, verifyPasscode,
  getAutoLockSeconds, setAutoLockSeconds, AUTO_LOCK_OPTIONS
} from '../utils/passcodeLock';

function Row({ icon, iconColor = 'blue', label, sub, right, onClick, danger }) {
  return (
    <div className={`settings-row${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <span className={`settings-row__icon--badge icon-badge--${iconColor}`}>{icon}</span>
      <div className="settings-row__text">
        <div className="settings-row__label" style={danger ? { color: 'var(--danger)' } : undefined}>{label}</div>
        {sub && <div className="settings-row__sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button className={`switch${checked ? ' on' : ''}`} onClick={onChange}>
      <span className="switch__knob" />
    </button>
  );
}

function NotificationSettings() {
  const [prefs, setPrefsState] = useState(() => getNotifPrefs());
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const update = (patch) => setPrefsState(setNotifPrefs(patch));

  return (
    <>
      <Row
        icon={<BellIcon />}
        iconColor="orange"
        label="Message notifications"
        sub="Alerts for new messages"
        right={<Switch checked={prefs.messages} onChange={() => update({ messages: !prefs.messages })} />}
      />
      <Row
        icon={<GroupIcon />}
        iconColor="green"
        label="Group notifications"
        sub="Alerts for group and channel messages"
        right={<Switch checked={prefs.groups} onChange={() => update({ groups: !prefs.groups })} />}
      />
      <Row
        icon={<SpeakerIcon />}
        iconColor="purple"
        label="Sound"
        sub="Play a sound with notifications"
        right={<Switch checked={prefs.sound} onChange={() => update({ sound: !prefs.sound })} />}
      />
      <Row
        icon={<WrenchIcon />}
        iconColor="gray"
        label="Troubleshoot notifications"
        sub="Not getting notifications? Tap to check what's wrong"
        onClick={() => setShowTroubleshoot((v) => !v)}
      />
      {showTroubleshoot && <NotificationTroubleshoot />}
    </>
  );
}

function NotificationTroubleshoot() {
  const [, forceRender] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    // Subscribe to live status updates (native registration success/failure
    // arrives asynchronously, well after the initial check resolves) and
    // kick off a fresh check right away.
    const unsubscribe = subscribeStatus(() => forceRender((n) => n + 1));
    let cancelled = false;
    (async () => {
      setBusy(true);
      await initNotifications();
      await registerPushIfConfigured(http);
      if (!cancelled) setBusy(false);
    })();
    return () => { cancelled = true; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testLocal = async () => {
    setBusy(true);
    try {
      await sendLocalTestNotification();
      setLastResult({ ok: true, text: 'Local notification sent — check your notification tray now.' });
    } catch (e) {
      setLastResult({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    try {
      await initNotifications();
      await registerPushIfConfigured(http);
    } finally {
      setBusy(false);
    }
  };

  const testServer = async () => {
    setBusy(true);
    try {
      const data = await sendServerTestPush(http);
      setLastResult({
        ok: data.sent > 0,
        text: data.sent > 0
          ? `Sent to ${data.sent} device(s) — check your notification tray (this can take a few seconds).`
          : `Failed: ${data.errors?.join(', ') || 'no devices reachable'}`
      });
    } catch (e) {
      setLastResult({ ok: false, text: e.response?.data?.error || e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="danger-confirm-box" style={{ borderColor: 'var(--border-soft)' }}>
      <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
        <div>Platform: <b>{pushStatus.isNative ? 'Native app' : 'Web/PWA'}</b></div>
        <div>Local alert permission: <b>{pushStatus.localPermission}</b></div>
        <div>Server push configured: <b>{pushStatus.serverEnabled === null ? 'checking…' : pushStatus.serverEnabled ? 'yes' : 'no'}</b></div>
        {pushStatus.serverError && <div style={{ color: 'var(--danger)' }}>Server error: {pushStatus.serverError}</div>}
        <div>Device registered for push: <b>{pushStatus.registering && !pushStatus.tokenRegistered ? 'checking…' : pushStatus.tokenRegistered ? 'yes' : 'not yet'}</b></div>
        {pushStatus.lastError && <div style={{ color: 'var(--danger)' }}>Last error: {pushStatus.lastError}</div>}
      </div>
      {lastResult && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: lastResult.ok ? 'var(--gold-light)' : 'var(--danger)' }}>
          {lastResult.text}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: '1 1 auto', background: 'var(--bg-elevated)', boxShadow: 'none', fontSize: 12.5, padding: '8px 10px' }} disabled={busy} onClick={testLocal}>
          Send local test
        </button>
        {/* Only truly block this once the server has explicitly said push
            isn't configured — while it's still "checking…" (serverEnabled
            === null) the button stays clickable, otherwise a slow or
            failed status check makes it look permanently broken with zero
            feedback, which is exactly what was happening before. */}
        <button className="btn-primary btn-gold" style={{ flex: '1 1 auto', fontSize: 12.5, padding: '8px 10px' }} disabled={busy || pushStatus.serverEnabled === false} onClick={testServer}>
          Send real push test
        </button>
      </div>
      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 8, background: 'var(--bg-elevated)', boxShadow: 'none', fontSize: 12.5, padding: '8px 10px' }}
        disabled={busy}
        onClick={recheck}
      >
        🔄 Re-check status
      </button>

      {/* Step-by-step trace of exactly what happened and when — copy this
          and send it over if something above still looks wrong. This is
          the single most useful thing for diagnosing a real-device issue
          without needing adb/logcat access. */}
      <details style={{ marginTop: 10 }}>
        <summary style={{ fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          Detailed log ({pushStatus.log.length} lines)
        </summary>
        <div
          style={{
            marginTop: 6, maxHeight: 220, overflowY: 'auto', background: 'var(--bg-input)',
            border: '1px solid var(--border-soft)', borderRadius: 8, padding: 8,
            fontFamily: 'monospace', fontSize: 10.5, lineHeight: 1.6, color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}
        >
          {pushStatus.log.length ? pushStatus.log.join('\n') : '(no log lines yet)'}
        </div>
        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: 6, background: 'var(--bg-elevated)', boxShadow: 'none', fontSize: 12.5, padding: '8px 10px' }}
          onClick={async () => {
            const text = pushStatus.log.join('\n');
            try {
              await navigator.clipboard.writeText(text);
              setLastResult({ ok: true, text: 'Log copied — paste it in chat.' });
            } catch {
              setLastResult({ ok: false, text: 'Could not copy automatically — long-press the log above to copy manually.' });
            }
          }}
        >
          📋 Copy debug log
        </button>
      </details>
    </div>
  );
}

function EditableRow({ icon, iconColor, label, value, placeholder, type = 'text', onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const save = async () => {
    await onSave(draft.trim());
    setEditing(false);
  };

  if (!editing) {
    return (
      <Row
        icon={icon}
        iconColor={iconColor}
        label={value || placeholder}
        sub={label}
        onClick={() => { setDraft(value || ''); setEditing(true); }}
        right={<span className="settings-row__edit">✎</span>}
      />
    );
  }

  return (
    <div className="settings-row">
      <span className={`settings-row__icon--badge icon-badge--${iconColor}`}>{icon}</span>
      <div className="settings-row__text">
        <div className="settings-row__sub">{label}</div>
        <input
          className="profile-inline-input"
          type={type}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        />
      </div>
      <button className="settings-row__edit" onClick={save}>✓</button>
    </div>
  );
}

function PasscodeLockSettings() {
  const [enabled, setEnabled] = useState(() => isPasscodeEnabled());
  const [mode, setMode] = useState(null); // null | 'setup' | 'change'
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');
  const [autoLock, setAutoLock] = useState(() => getAutoLockSeconds());

  const startSetup = () => { setMode('setup'); setPin1(''); setPin2(''); setCurrentPin(''); setError(''); };
  const startChange = () => { setMode('change'); setPin1(''); setPin2(''); setCurrentPin(''); setError(''); };
  const cancel = () => { setMode(null); setError(''); };

  const savePin = async () => {
    setError('');
    if (!/^\d{4,6}$/.test(pin1)) return setError('Passcode must be 4-6 digits');
    if (pin1 !== pin2) return setError('Passcodes do not match');
    if (mode === 'change') {
      const ok = await verifyPasscode(currentPin);
      if (!ok) return setError('Current passcode is incorrect');
    }
    await setPasscode(pin1);
    setEnabled(true);
    setMode(null);
  };

  const turnOff = async () => {
    const ok = await verifyPasscode(currentPin);
    if (!ok) return setError('Current passcode is incorrect');
    disablePasscode();
    setEnabled(false);
    setMode(null);
    setError('');
  };

  const changeAutoLock = (val) => {
    setAutoLockSeconds(val);
    setAutoLock(val);
  };

  return (
    <>
      <Row
        icon={<LockIcon />}
        iconColor="green"
        label="Passcode Lock"
        sub={enabled ? `On — auto-lock ${AUTO_LOCK_OPTIONS.find((o) => o.value === autoLock)?.label.toLowerCase() || 'immediately'}` : 'Off'}
        onClick={() => (enabled ? setMode(mode ? null : 'menu') : startSetup())}
      />
      {enabled && mode === 'menu' && (
        <div className="danger-confirm-box" style={{ borderColor: 'var(--border-soft)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Locks FairyChat with a PIN whenever you reopen it. This is stored only on this device.
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Auto-Lock</label>
            <select
              className="profile-inline-input"
              style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              value={autoLock}
              onChange={(e) => changeAutoLock(Number(e.target.value))}
            >
              {AUTO_LOCK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={startChange}>
              Change Passcode
            </button>
            <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)', boxShadow: 'none' }} onClick={() => { setMode('turnoff'); setCurrentPin(''); setError(''); }}>
              Turn Off
            </button>
          </div>
        </div>
      )}
      {(mode === 'setup' || mode === 'change') && (
        <div className="danger-confirm-box" style={{ borderColor: 'var(--border-soft)' }}>
          {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 8 }}>{error}</div>}
          {mode === 'change' && (
            <input
              className="profile-inline-input"
              style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, width: '100%' }}
              type="password" inputMode="numeric" placeholder="Current passcode"
              value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            />
          )}
          <input
            className="profile-inline-input"
            style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, width: '100%' }}
            type="password" inputMode="numeric" placeholder="New passcode (4-6 digits)"
            value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <input
            className="profile-inline-input"
            style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 10, width: '100%' }}
            type="password" inputMode="numeric" placeholder="Re-enter passcode"
            value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={cancel}>Cancel</button>
            <button className="btn-primary btn-gold" style={{ flex: 1 }} onClick={savePin}>Save</button>
          </div>
        </div>
      )}
      {mode === 'turnoff' && (
        <div className="danger-confirm-box">
          <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>Turn off Passcode Lock?</div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 8 }}>{error}</div>}
          <input
            className="profile-inline-input"
            style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 10, width: '100%' }}
            type="password" inputMode="numeric" placeholder="Current passcode"
            value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={cancel}>Cancel</button>
            <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)', boxShadow: 'none' }} onClick={turnOff}>Turn Off</button>
          </div>
        </div>
      )}
    </>
  );
}

function TwoStepSettings() {
  const [status, setStatus] = useState(null); // { enabled, hint }
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState(null); // null | 'set' | 'remove'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [removePassword, setRemovePassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await http.get('/users/me/two-step');
      setStatus(res.data);
      setHint(res.data.hint || '');
    } catch {
      setStatus({ enabled: false, hint: '' });
    }
  };

  const toggleExpand = () => {
    setExpanded((v) => !v);
    if (!expanded && !status) load();
  };

  const startSet = () => { setMode('set'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); };
  const startRemove = () => { setMode('remove'); setRemovePassword(''); setError(''); };
  const cancel = () => { setMode(null); setError(''); };

  const submitSet = async () => {
    setError('');
    if (newPassword.length < 4) return setError('Password must be at least 4 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setBusy(true);
    try {
      const res = await http.post('/users/me/two-step', { currentPassword, newPassword, hint });
      setStatus({ enabled: true, hint: res.data.hint || '' });
      setMode(null);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const submitRemove = async () => {
    setError('');
    setBusy(true);
    try {
      await http.delete('/users/me/two-step', { data: { password: removePassword } });
      setStatus({ enabled: false, hint: '' });
      setMode(null);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Row
        icon={<ShieldIcon />}
        iconColor="purple"
        label="Two-Step Verification"
        sub={status ? (status.enabled ? 'On' : 'Off') : 'Adds a password on top of your login'}
        onClick={toggleExpand}
      />
      {expanded && status && (
        <div className="danger-confirm-box" style={{ borderColor: 'var(--border-soft)' }}>
          {mode === null && (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 10 }}>
                {status.enabled
                  ? `Enabled${status.hint ? ` — hint: "${status.hint}"` : ''}. You'll need this cloud password whenever you log in from a new device.`
                  : 'Require an extra cloud password when logging into your account, on top of your regular password.'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary btn-gold" style={{ flex: 1 }} onClick={startSet}>
                  {status.enabled ? 'Change Password' : 'Set Password'}
                </button>
                {status.enabled && (
                  <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)', boxShadow: 'none' }} onClick={startRemove}>
                    Disable
                  </button>
                )}
              </div>
            </>
          )}
          {mode === 'set' && (
            <>
              {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 8 }}>{error}</div>}
              {status.enabled && (
                <input
                  className="profile-inline-input"
                  style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, width: '100%' }}
                  type="password" placeholder="Current cloud password"
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                />
              )}
              <input
                className="profile-inline-input"
                style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, width: '100%' }}
                type="password" placeholder="New cloud password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                className="profile-inline-input"
                style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, width: '100%' }}
                type="password" placeholder="Re-enter password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <input
                className="profile-inline-input"
                style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 10, width: '100%' }}
                type="text" placeholder="Hint (optional)"
                value={hint} onChange={(e) => setHint(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={cancel} disabled={busy}>Cancel</button>
                <button className="btn-primary btn-gold" style={{ flex: 1 }} onClick={submitSet} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
              </div>
            </>
          )}
          {mode === 'remove' && (
            <>
              <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>Disable Two-Step Verification?</div>
              {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 8 }}>{error}</div>}
              <input
                className="profile-inline-input"
                style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 10, width: '100%' }}
                type="password" placeholder="Current cloud password"
                value={removePassword} onChange={(e) => setRemovePassword(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={cancel} disabled={busy}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)', boxShadow: 'none' }} onClick={submitRemove} disabled={busy}>
                  {busy ? 'Removing...' : 'Disable'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ActiveSessionsSettings() {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const res = await http.get('/sessions');
      setSessions(res.data.sessions);
    } catch {
      setSessions([]);
    }
  };

  const toggleExpand = () => {
    setExpanded((v) => !v);
    if (!expanded) load();
  };

  const revoke = async (id) => {
    setBusyId(id);
    try {
      await http.delete(`/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore — list stays as-is, user can retry
    } finally {
      setBusyId(null);
    }
  };

  const revokeAllOthers = async () => {
    if (!confirm('Terminate all other sessions? You will stay logged in on this device only.')) return;
    setBusyId('__all__');
    try {
      await http.delete('/sessions/others');
      setSessions((prev) => prev.filter((s) => s.current));
    } finally {
      setBusyId(null);
    }
  };

  const others = sessions ? sessions.filter((s) => !s.current) : [];

  return (
    <>
      <Row
        icon={<DevicesIcon />}
        iconColor="blue"
        label="Active Sessions"
        sub={sessions ? `${sessions.length} device${sessions.length === 1 ? '' : 's'}` : 'See where you\'re logged in'}
        onClick={toggleExpand}
      />
      {expanded && sessions && (
        <div className="danger-confirm-box" style={{ borderColor: 'var(--border-soft)' }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {s.deviceLabel}{s.current ? ' · This device' : ''}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  {s.ipAddress || 'unknown IP'} · active {timeAgo(s.lastActiveAt)}
                </div>
              </div>
              {!s.current && (
                <button
                  className="btn-primary"
                  style={{ background: 'var(--bg-elevated)', boxShadow: 'none', fontSize: 12, padding: '6px 10px' }}
                  disabled={busyId === s.id}
                  onClick={() => revoke(s.id)}
                >
                  {busyId === s.id ? '...' : 'Terminate'}
                </button>
              )}
            </div>
          ))}
          {others.length > 0 && (
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 10, background: 'var(--danger)', boxShadow: 'none' }}
              disabled={busyId === '__all__'}
              onClick={revokeAllOthers}
            >
              {busyId === '__all__' ? 'Terminating...' : 'Terminate All Other Sessions'}
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function SettingsPage({ onOpenSaved }) {
  const { logout, user, updateProfile, accounts, switchAccount, forgetAccount, deleteAccount } = useAuth();
  const { theme, toggleTheme, wallpaper, setWallpaper } = useTheme();
  const { chats } = useChat();
  const navigate = useNavigate();
  const [hiddenCategories, setHiddenCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('monarch_hidden_emoji_categories') || '[]'); } catch { return []; }
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const savedChat = chats.find((c) => c.type === 'saved');
  const quickReactions = user?.quickReactions?.length ? user.quickReactions : DEFAULT_QUICK_REACTIONS;
  const otherAccounts = accounts.filter((a) => a.user.id !== user?.id);

  const toggleCategory = (catId) => {
    setHiddenCategories((prev) => {
      // Always keep at least one category visible in the emoji picker.
      if (!prev.includes(catId) && prev.length >= EMOJI_CATEGORIES.length - 1) return prev;
      const next = prev.includes(catId) ? prev.filter((p) => p !== catId) : [...prev, catId];
      localStorage.setItem('monarch_hidden_emoji_categories', JSON.stringify(next));
      return next;
    });
  };

  const toggleReaction = (emoji) => {
    const has = quickReactions.includes(emoji);
    let next;
    if (has) {
      next = quickReactions.filter((e) => e !== emoji);
    } else {
      if (quickReactions.length >= 8) return;
      next = [...quickReactions, emoji];
    }
    updateProfile({ quickReactions: next });
  };

  const handleRemoveSavedAccount = (e, userId, name) => {
    e.stopPropagation();
    if (confirm(`Remove "${name}" from this device's account switcher? You can always log back in with its password.`)) {
      forgetAccount(userId);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } catch (err) {
      alert('Could not delete account: ' + (err.response?.data?.error || err.message));
      setDeleting(false);
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Settings</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-profile-head">
          <Avatar name={user?.name} color={user?.avatarColor} photoUrl={user?.avatarUrl} size={62} />
          <div>
            <div className="settings-profile-head__name">{user?.name}</div>
            <div className="settings-profile-head__sub">
              {user?.phone ? `${user.phone} • ` : ''}@{user?.username}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Account</div>
          <EditableRow icon={<UserGlyphIcon />} iconColor="blue" label="Profile Name" value={user?.name} placeholder="Add your name" onSave={(v) => v && updateProfile({ name: v })} />
          <EditableRow icon={<InfoIcon />} iconColor="green" label="Bio" value={user?.bio} placeholder="Add a bio" onSave={(v) => updateProfile({ bio: v })} />
          <EditableRow icon={<CakeIcon />} iconColor="pink" label="Birthday" value={user?.birthday} placeholder="Add Birthday" type="date" onSave={(v) => updateProfile({ birthday: v })} />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Accounts</div>
          <div className="account-switch-row account-switch-row--active">
            <Avatar name={user?.name} color={user?.avatarColor} photoUrl={user?.avatarUrl} size={38} />
            <div className="settings-row__text">
              <div className="settings-row__label">{user?.name}</div>
              <div className="settings-row__sub">@{user?.username} · this device</div>
            </div>
            <span className="account-switch-row__check">✓</span>
          </div>
          {otherAccounts.map((a) => (
            <div key={a.user.id} className="account-switch-row clickable" onClick={() => switchAccount(a.user.id)}>
              <Avatar name={a.user.name} color={a.user.avatarColor} photoUrl={a.user.avatarUrl} size={38} />
              <div className="settings-row__text">
                <div className="settings-row__label">{a.user.name}</div>
                <div className="settings-row__sub">@{a.user.username} · tap to switch</div>
              </div>
              <button className="account-switch-row__remove" onClick={(e) => handleRemoveSavedAccount(e, a.user.id, a.user.name)}>✕</button>
            </div>
          ))}
          <Row icon={<AddPersonIcon />} iconColor="blue" label="Add Another Account" sub="Sign in or register with a different account" onClick={() => navigate('/login?addAccount=1')} />
          <Row icon={<LogoutIcon />} iconColor="red" label="Log Out" onClick={() => logout()} danger />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Privacy and Security</div>
          <PasscodeLockSettings />
          <TwoStepSettings />
          <ActiveSessionsSettings />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Chat Settings</div>
          <div className="settings-row" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <span className="settings-row__icon--badge icon-badge--orange"><ImageIcon /></span>
              <div className="settings-row__text">
                <div className="settings-row__label">Chat Wallpaper</div>
                <div className="settings-row__sub">Choose a background for your chats</div>
              </div>
            </div>
            <div className="wallpaper-grid">
              {WALLPAPERS.map((w) => (
                <button
                  key={w.id}
                  className={`wallpaper-swatch wallpaper-swatch--${w.id}${wallpaper === w.id ? ' active' : ''}`}
                  onClick={() => setWallpaper(w.id)}
                  title={w.label}
                >
                  {wallpaper === w.id && <span className="wallpaper-swatch__check">✓</span>}
                </button>
              ))}
            </div>
          </div>
          <Row
            icon={theme === 'dark' ? <MoonIcon /> : <SunIcon />}
            iconColor="orange"
            label="Night Mode"
            sub={theme === 'dark' ? 'On' : 'Off'}
            right={<Switch checked={theme === 'dark'} onChange={toggleTheme} />}
          />
          <Row icon={<BookmarkIcon />} iconColor="blue" label="Saved Messages" sub="Send notes and files to yourself" onClick={() => savedChat && onOpenSaved(savedChat.id)} />
          <NotificationSettings />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Stickers &amp; Emoji</div>
          <Row
            icon={<PuzzleIcon />}
            iconColor="purple"
            label="Stickers"
            sub="Real, animated Telegram-style stickers — search or browse trending in the Stickers tab"
          />
          <div style={{ padding: '2px 16px 6px', fontSize: 12, color: 'var(--text-muted)' }}>
            Tap a category below to show or hide it in the Emoji tab.
          </div>
          {EMOJI_CATEGORIES.map((cat) => (
            <Row
              key={cat.id}
              icon={cat.icon}
              iconColor="gray"
              label={cat.label}
              onClick={() => toggleCategory(cat.id)}
              right={<Switch checked={!hiddenCategories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} />}
            />
          ))}
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Message Reactions</div>
          <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
            Pick up to 8 emoji for your quick-react bar (long-press a message to use it).
          </div>
          <div className="reaction-manage-grid">
            {REACTION_CHOICES.map((e) => (
              <button
                key={e}
                className={`reaction-manage-btn${quickReactions.includes(e) ? ' active' : ''}`}
                onClick={() => toggleReaction(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section__title">About</div>
          <Row icon={<CrownIcon />} iconColor="gold" label="FairyChat" sub="v1.0 — your own private messaging platform" />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Danger Zone</div>
          {!deleting ? (
            <Row
              icon={<TrashIcon />}
              iconColor="red"
              label="Delete Account"
              sub="Permanently deletes your account. This cannot be undone."
              onClick={() => setDeleting(true)}
              danger
            />
          ) : (
            <div className="danger-confirm-box">
              <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>Delete your account permanently?</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                Your profile, phone number and username will be erased. Your past messages will stay
                visible to others but show as sent by "Deleted Account". Type <b>DELETE</b> to confirm.
              </div>
              <input
                className="profile-inline-input"
                style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={() => { setDeleting(false); setDeleteConfirmText(''); }}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1, background: 'var(--danger)', boxShadow: 'none' }}
                  disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                  onClick={handleDeleteAccount}
                >
                  Delete Forever
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
