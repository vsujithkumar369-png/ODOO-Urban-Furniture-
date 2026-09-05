import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, List, LayoutGrid } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import { getProducts } from '../../../api/products';
import toast from 'react-hot-toast';

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getProducts()
      .then(r => setProducts(r.data.data))
      .catch(() => toast.error('Failed to load products.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
  const cols = [
    { key: 'image_url', label: '', render: (url, row) => (
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-xs overflow-hidden">
        {url ? <img src={url} alt={row.name} className="w-8 h-8 object-cover rounded-lg" /> : row.name?.[0]}
      </div>
    )},
    { key: 'name',        label: 'Product' },
    { key: 'category',   label: 'Category' },
    { key: 'type',        label: 'Type',         render: v => <StatusBadge status={v} /> },
    { key: 'sales_price', label: 'Sales Price',  render: v => fmt(v) },
    { key: 'cost',        label: 'Cost',         render: v => fmt(v) },
  ];

  return (
    <div>
      <PageHeader title="Products" subtitle="Manage your product catalog">
        <button className="btn-primary" onClick={() => navigate('/products/new')} id="new-product-btn">
          <Plus size={15} /> New Product
        </button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button onClick={() => setView('list')} className={`btn-icon btn-sm ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><List size={15} /></button>
          <button onClick={() => setView('kanban')} className={`btn-icon btn-sm ${view === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><LayoutGrid size={15} /></button>
        </div>
      </div>

      {view === 'list' ? (
        <DataTable columns={cols} data={filtered} loading={loading} onRowClick={r => navigate(`/products/${r.id}`)} emptyMessage="No products yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/products/${p.id}`)}>
              <div className="w-full h-28 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 flex items-center justify-center text-3xl text-gray-300 dark:text-gray-600 overflow-hidden">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-28 object-cover rounded-lg" /> : '📦'}
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{p.category}</p>
              <div className="flex items-center justify-between mt-2">
                <StatusBadge status={p.type} />
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">₹{Number(p.sales_price).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
