import { useRef, useState, useCallback } from 'react';

const LONG_PRESS_MS = 420;
const SWIPE_REPLY_PX = 58; // how far right you must drag before releasing triggers a reply
const SWIPE_MAX_PX = 74; // visual cap so the bubble doesn't fly off-screen
const MOVE_THRESHOLD = 10; // px of finger movement before we decide tap vs swipe vs scroll
const DOUBLE_TAP_MS = 280; // max gap between two taps to count as a double-tap (heart-react)

// One gesture recognizer, shared by every message bubble, that tells apart
// four completely different things a touch on a message can mean:
//  - a quick tap             -> onTap()          (opens the reply/copy/forward/
//                                                  pin/delete action sheet)
//  - two quick taps          -> onDoubleTap()    (Telegram/Instagram-style
//                                                  double-tap-to-heart-react)
//  - a press-and-hold        -> onLongPress()     (enters multi-select mode)
//  - a rightward drag        -> onSwipeReply()    (WhatsApp/Telegram-style
//                                                  swipe-to-reply), visually
//                                                  tracked via `swipeX` so the
//                                                  caller can translateX the
//                                                  bubble while dragging
// A vertical drag (scrolling the message list) is explicitly left alone —
// this never calls preventDefault unless it has already decided the touch
// is a horizontal swipe.
//
// A single tap is deliberately NOT actioned the instant the finger lifts.
// Two things need that brief pause:
//  1) telling it apart from the second tap of a double-tap
//  2) sidestepping a real mobile-browser bug: after a touchend, the browser
//     still queues up a synthetic "click" at the same screen coordinates.
//     If onTap() ran synchronously it would re-render the bubble into a
//     fixed action sheet right where the finger just was, and that trailing
//     click would land on whichever sheet button ended up under it —
//     silently "pressing" Reply/Copy/Forward/whatever right after opening.
//     Deferring onTap lets that stray click finish (harmlessly, against the
//     plain bubble, which has no onClick) before anything new is drawn.
export function useMessageGestures({ onTap, onDoubleTap, onLongPress, onSwipeReply, disabled }) {
  const [swipeX, setSwipeX] = useState(0);
  const stateRef = useRef({ x: 0, y: 0, mode: null, timer: null });
  const tapRef = useRef({ pendingTimer: null, lastTapAt: 0 });

  const clearTimer = () => {
    if (stateRef.current.timer) {
      clearTimeout(stateRef.current.timer);
      stateRef.current.timer = null;
    }
  };

  const clearPendingTap = () => {
    if (tapRef.current.pendingTimer) {
      clearTimeout(tapRef.current.pendingTimer);
      tapRef.current.pendingTimer = null;
    }
  };

  const handleStart = useCallback((clientX, clientY) => {
    if (disabled) return;
    stateRef.current.x = clientX;
    stateRef.current.y = clientY;
    stateRef.current.mode = null;
    clearTimer();
    stateRef.current.timer = setTimeout(() => {
      stateRef.current.mode = 'longpress';
      clearPendingTap();
      if (navigator.vibrate) navigator.vibrate(15);
      onLongPress?.();
    }, LONG_PRESS_MS);
  }, [disabled, onLongPress]);

  const handleMove = useCallback((clientX, clientY) => {
    if (disabled || stateRef.current.mode === 'longpress') return;
    const dx = clientX - stateRef.current.x;
    const dy = clientY - stateRef.current.y;
    if (stateRef.current.mode === null) {
      if (Math.abs(dy) > MOVE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        // Vertical scroll — bail out entirely, let the browser handle it.
        stateRef.current.mode = 'scroll';
        clearTimer();
        return;
      }
      if (dx > MOVE_THRESHOLD) {
        stateRef.current.mode = 'swipe';
        clearTimer();
      }
    }
    if (stateRef.current.mode === 'swipe') {
      setSwipeX(Math.max(0, Math.min(SWIPE_MAX_PX, dx)));
    }
  }, [disabled]);

  const handleEnd = useCallback((e) => {
    // Suppresses the browser's trailing synthetic click after a touch
    // sequence (see the big comment above) — the actual sheet-opening is
    // deferred below anyway, but this also stops double-firing on devices
    // that would otherwise send both a touch tap and a compatibility click.
    if (e?.cancelable) e.preventDefault();
    clearTimer();
    const mode = stateRef.current.mode;
    if (mode === 'swipe') {
      const firedReply = swipeX >= SWIPE_REPLY_PX;
      setSwipeX(0);
      if (firedReply) onSwipeReply?.();
    } else if (mode === null && !disabled) {
      const now = Date.now();
      if (tapRef.current.pendingTimer && now - tapRef.current.lastTapAt < DOUBLE_TAP_MS) {
        // Second tap of a double-tap: cancel the pending single-tap action
        // and fire the double-tap heart-react instead.
        clearPendingTap();
        tapRef.current.lastTapAt = 0;
        onDoubleTap?.();
      } else {
        tapRef.current.lastTapAt = now;
        tapRef.current.pendingTimer = setTimeout(() => {
          tapRef.current.pendingTimer = null;
          onTap?.();
        }, DOUBLE_TAP_MS);
      }
    }
    stateRef.current.mode = null;
  }, [swipeX, onSwipeReply, onTap, onDoubleTap, disabled]);

  const handleCancel = useCallback(() => {
    clearTimer();
    stateRef.current.mode = null;
    setSwipeX(0);
  }, []);

  return {
    swipeX,
    handlers: {
      onTouchStart: (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY),
      onTouchMove: (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY),
      onTouchEnd: handleEnd,
      onTouchCancel: handleCancel,
      onMouseDown: (e) => handleStart(e.clientX, e.clientY),
      onMouseMove: (e) => { if (e.buttons === 1) handleMove(e.clientX, e.clientY); },
      onMouseUp: handleEnd,
      onMouseLeave: handleCancel,
      onContextMenu: (e) => { e.preventDefault(); }
    }
  };
}
