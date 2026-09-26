export function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatMessageTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateSeparator(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatLastSeen(status, lastSeen) {
  if (status === 'online') return 'online';
  if (!lastSeen) return 'offline';
  const diffMs = Date.now() - lastSeen;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'last seen just now';
  if (mins < 60) return `last seen ${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `last seen ${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'last seen yesterday';
  if (days < 7) return `last seen ${days} days ago`;
  return 'last seen on ' + new Date(lastSeen).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
