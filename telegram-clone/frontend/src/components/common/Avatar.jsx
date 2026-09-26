import { initials } from '../../utils/format';
import { resolveMediaUrl } from '../../utils/resolveUrl';

export default function Avatar({ name, color = '#7C4DFF', photoUrl, size = 44, status, showStatus = false }) {
  const style = {
    width: size,
    height: size,
    background: photoUrl ? undefined : color,
    fontSize: Math.max(12, size * 0.38)
  };
  return (
    <div className="avatar" style={style}>
      {photoUrl ? (
        <img src={resolveMediaUrl(photoUrl)} alt={name || 'avatar'} className="avatar__img" />
      ) : (
        initials(name || '?')
      )}
      {showStatus && status === 'online' && <span className="status-dot" />}
    </div>
  );
}
