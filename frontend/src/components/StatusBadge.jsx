// StatusBadge — maps status strings to colored pills
const MAP = {
  draft:     'badge-gray',
  confirmed: 'badge-blue',
  posted:    'badge-indigo',
  paid:      'badge-green',
  cancelled: 'badge-red',
  revised:   'badge-amber',
  due:       'badge-orange',
  'pay now': 'badge-orange',
  income:    'badge-green',
  expense:   'badge-red',
  goods:     'badge-blue',
  service:   'badge-indigo',
  combo:     'badge-amber',
  asset:     'badge-blue',
  liability: 'badge-red',
  capital:   'badge-indigo',
  bank:      'badge-green',
  cash:      'badge-amber',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const cls = MAP[status.toLowerCase()] ?? 'badge-gray';
  return <span className={cls}>{status}</span>;
}
