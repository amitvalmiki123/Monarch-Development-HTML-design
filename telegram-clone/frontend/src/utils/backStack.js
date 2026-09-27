// A tiny shared stack that lets any currently-open overlay (a modal, the
// message action sheet, in-chat multi-select, an inline edit box, ...)
// register itself as "the thing the hardware/gesture back button should
// close next", without every one of those components needing to know
// about each other or about the Android back-button plumbing at all.
//
// Each screen-level popup pushes its own close function on mount and pops
// it on unmount. The single global back-button listener (see ChatApp.jsx)
// always tries the top of this stack first; only once the stack is empty
// does it fall through to real navigation (closing a chat, switching tabs,
// and only then exiting the app).
const stack = [];

export function pushBackHandler(fn) {
  stack.push(fn);
}

export function popBackHandler(fn) {
  const idx = stack.lastIndexOf(fn);
  if (idx !== -1) stack.splice(idx, 1);
}

// Returns true if something on the stack handled the back press (so the
// caller should do nothing else), false if the stack was empty.
export function consumeBack() {
  if (stack.length === 0) return false;
  const fn = stack[stack.length - 1];
  fn();
  return true;
}
