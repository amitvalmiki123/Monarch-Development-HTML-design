import { useEffect, useState } from 'react';
import http from '../../api/http';
import {
  BellIcon, GroupIcon, SpeakerIcon, WrenchIcon,
  LockIcon, ShieldIcon, DevicesIcon
} from '../../components/common/SettingsIcons';
import {
  pushStatus, subscribeStatus, initNotifications, registerPushIfConfigured,
  sendLocalTestNotification, sendServerTestPush, getNotifPrefs, setNotifPrefs
} from '../../utils/notifications';
import {
  isPasscodeEnabled, setPasscode, disablePasscode, verifyPasscode,
  getAutoLockSeconds, setAutoLockSeconds, AUTO_LOCK_OPTIONS
} from '../../utils/passcodeLock';

// ---------------------------------------------------------------------------
// Small shared building blocks reused across every Settings page/sub-page.
// ---------------------------------------------------------------------------

export function Row({ icon, iconColor = 'blue', label, sub, right, onClick, danger }) {
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

export function Switch({ checked, onChange }) {
  return (
    <button className={`switch${checked ? ' on' : ''}`} onClick={onChange}>
      <span className="switch__knob" />
    </button>
  );
}

// Full-page header used by every dedicated Settings sub-page — a back arrow
// (returns to the parent list) plus the page title, matching the same
// .page-panel / .page-panel__topbar look as the top-level pages (Profile,
// Contacts, Settings) so drilling into e.g. "Chat Settings" genuinely feels
// like opening a new screen, Telegram-style, rather than an inline expander.
export function SettingsSubPage({ title, onBack, children }) {
  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <button className="icon-btn back-btn" onClick={onBack} aria-label="Back">←</button>
        <h1>{title}</h1>
        <span style={{ width: 38 }} />
      </div>
      <div className="settings-scroll">{children}</div>
    </div>
  );
}

export function EditableRow({ icon, iconColor, label, value, placeholder, type = 'text', onSave }) {
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

// ---------------------------------------------------------------------------
// Notifications (used inside Chat Settings)
// ---------------------------------------------------------------------------

export function NotificationSettings() {
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

// ---------------------------------------------------------------------------
// Privacy & Security (Passcode / Two-Step / Active Sessions)
// ---------------------------------------------------------------------------

export function PasscodeLockSettings() {
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

export function TwoStepSettings() {
  const [status, setStatus] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState(null);
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

export function ActiveSessionsSettings() {
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
