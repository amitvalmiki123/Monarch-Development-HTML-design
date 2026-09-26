import { formatDateSeparator } from '../../utils/format';

export default function DateSeparator({ ts }) {
  return <div className="date-separator">{formatDateSeparator(ts)}</div>;
}
