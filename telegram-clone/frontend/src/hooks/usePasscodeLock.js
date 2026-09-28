import { useEffect, useRef, useState, useCallback } from 'react';
import { isPasscodeEnabled, markHidden, shouldLockOnResume, clearHiddenStamp } from '../utils/passcodeLock';

// Wires the Page Visibility API to the passcode-lock feature: when the app
// is enabled and the tab/app is hidden then shown again after the
// configured auto-lock delay, `locked` flips true and the caller (App.jsx)
// should render the full-screen PasscodeLockScreen over everything else.
export default function usePasscodeLock(isAuthenticated) {
  const [locked, setLocked] = useState(false);
  // Only check "lock on fresh load" once per real page load — not every
  // time isAuthenticated flips true (which also happens right after a user
  // types their password on the Login screen; they shouldn't have to enter
  // the passcode again a second later).
  const checkedInitialLoad = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!checkedInitialLoad.current) {
      checkedInitialLoad.current = true;
      if (isPasscodeEnabled()) setLocked(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocked(false);
      return;
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        markHidden();
      } else if (shouldLockOnResume()) {
        setLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isAuthenticated]);

  const unlock = useCallback(() => {
    clearHiddenStamp();
    setLocked(false);
  }, []);

  return { locked, unlock };
}
