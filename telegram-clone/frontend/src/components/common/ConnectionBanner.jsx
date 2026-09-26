import useNetworkStatus from '../../hooks/useNetworkStatus';

// A slim, non-blocking banner shown whenever we can't reach the server —
// the app itself stays fully open and usable from cached data, per the
// "never force a re-login just because the network dropped" requirement.
export default function ConnectionBanner() {
  const { online, deviceOnline } = useNetworkStatus();
  if (online) return null;
  return (
    <div className="connection-banner">
      {deviceOnline ? 'Connecting…' : 'No internet connection'}
    </div>
  );
}
