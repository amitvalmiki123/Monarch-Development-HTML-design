import { useEffect } from 'react';
import { pushBackHandler, popBackHandler } from '../../utils/backStack';

export default function Modal({ title, onClose, children, width }) {
  // Let the Android hardware/gesture back button close this modal instead
  // of minimizing the whole app or navigating the screen behind it.
  useEffect(() => {
    pushBackHandler(onClose);
    return () => popBackHandler(onClose);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={width ? { maxWidth: width } : undefined}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
