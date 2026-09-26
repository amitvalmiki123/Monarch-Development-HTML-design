import { initials } from '../../utils/format';

export default function Avatar({ name, color = '#7C4DFF', size = 44, status, showStatus = false }) {
  const style = {
    width: size,
    height: size,
    background: color,
    fontSize: Math.max(12, size * 0.38)
  };
  return (
    <div className="avatar" style={style}>
      {initials(name || '?')}
      {showStatus && status === 'online' && <span className="status-dot" />}
    </div>
  );
}
