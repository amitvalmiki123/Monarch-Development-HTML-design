import { useRef, useState, useCallback } from 'react';

const LONG_PRESS_MS = 420;
const SWIPE_REPLY_PX = 58; // how far right you must drag before releasing triggers a reply
const SWIPE_MAX_PX = 74; // visual cap so the bubble doesn't fly off-screen
const MOVE_THRESHOLD = 10; // px of finger movement before we decide tap vs swipe vs scroll

// One gesture recognizer, shared by every message bubble, that tells apart
// three completely different things a touch on a message can mean:
//  - a quick tap            -> onTap()          (opens the reply/copy/forward/
//                                                 pin/delete action sheet)
//  - a press-and-hold       -> onLongPress()     (enters multi-select mode)
//  - a rightward drag       -> onSwipeReply()    (WhatsApp/Telegram-style
//                                                 swipe-to-reply), visually
//                                                 tracked via `swipeX` so the
//                                                 caller can translateX the
//                                                 bubble while dragging
// A vertical drag (scrolling the message list) is explicitly left alone —
// this never calls preventDefault unless it has already decided the touch
// is a horizontal swipe.
export function useMessageGestures({ onTap, onLongPress, onSwipeReply, disabled }) {
  const [swipeX, setSwipeX] = useState(0);
  const stateRef = useRef({ x: 0, y: 0, mode: null, timer: null });

  const clearTimer = () => {
    if (stateRef.current.timer) {
      clearTimeout(stateRef.current.timer);
      stateRef.current.timer = null;
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

  const handleEnd = useCallback(() => {
    clearTimer();
    const mode = stateRef.current.mode;
    if (mode === 'swipe') {
      const firedReply = swipeX >= SWIPE_REPLY_PX;
      setSwipeX(0);
      if (firedReply) onSwipeReply?.();
    } else if (mode === null && !disabled) {
      onTap?.();
    }
    stateRef.current.mode = null;
  }, [swipeX, onSwipeReply, onTap, disabled]);

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
