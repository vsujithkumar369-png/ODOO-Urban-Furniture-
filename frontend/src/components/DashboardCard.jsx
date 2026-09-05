// DashboardCard — KPI card with icon, title, value, and subtle accent
export default function DashboardCard({ title, value, icon: Icon, color = 'indigo', sub }) {
  const colors = {
    indigo: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 text-indigo-600 dark:text-indigo-400',
    green:  'from-green-50  to-green-100  dark:from-green-900/20  dark:to-green-800/20  text-green-600  dark:text-green-400',
    red:    'from-red-50    to-red-100    dark:from-red-900/20    dark:to-red-800/20    text-red-600    dark:text-red-400',
    amber:  'from-amber-50  to-amber-100  dark:from-amber-900/20  dark:to-amber-800/20  text-amber-600  dark:text-amber-400',
    blue:   'from-blue-50   to-blue-100   dark:from-blue-900/20   dark:to-blue-800/20   text-blue-600   dark:text-blue-400',
    purple: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 text-purple-600 dark:text-purple-400',
    teal:   'from-teal-50   to-teal-100   dark:from-teal-900/20   dark:to-teal-800/20   text-teal-600   dark:text-teal-400',
  };
  const cls = colors[color] ?? colors.indigo;
  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow duration-200">
      <div className={`rounded-xl p-3 bg-gradient-to-br ${cls} flex-shrink-0`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
