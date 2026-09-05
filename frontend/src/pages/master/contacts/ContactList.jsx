import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import { getContacts } from '../../../api/contacts';
import toast from 'react-hot-toast';

export default function ContactList() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getContacts()
      .then(r => setContacts(r.data.data))
      .catch(() => toast.error('Failed to load contacts.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const cols = [
    { key: 'image_url', label: 'Avatar', render: (url, row) => (
      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs flex-shrink-0">
        {url ? <img src={url} alt={row.name} className="w-8 h-8 rounded-full object-cover" /> : row.name?.[0]?.toUpperCase()}
      </div>
    )},
    { key: 'name',   label: 'Name' },
    { key: 'type',   label: 'Type',  render: v => <span className="capitalize">{v}</span> },
    { key: 'email',  label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'city',   label: 'City' },
  ];

  return (
    <div>
      <PageHeader title="Contacts" subtitle="Manage customers and vendors">
        <button className="btn-primary" onClick={() => navigate('/contacts/new')} id="new-contact-btn">
          <Plus size={15} /> New Contact
        </button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button onClick={() => setView('list')} className={`btn-icon btn-sm ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><List size={15} /></button>
          <button onClick={() => setView('kanban')} className={`btn-icon btn-sm ${view === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><LayoutGrid size={15} /></button>
        </div>
      </div>

      {view === 'list' ? (
        <DataTable columns={cols} data={filtered} loading={loading} onRowClick={r => navigate(`/contacts/${r.id}`)} emptyMessage="No contacts yet. Click New Contact to add one." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="card h-36 animate-pulse bg-gray-100 dark:bg-gray-800" />)
          ) : filtered.length === 0 ? (
            <p className="text-gray-400 col-span-full text-center py-10">No contacts found.</p>
          ) : filtered.map(c => (
            <div key={c.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/contacts/${c.id}`)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">
                  {c.image_url ? <img src={c.image_url} alt={c.name} className="w-10 h-10 rounded-full object-cover" /> : c.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{c.type}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.mobile}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
