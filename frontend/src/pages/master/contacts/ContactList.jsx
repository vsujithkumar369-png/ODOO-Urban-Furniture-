import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List, Trash2, Globe } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import { getContacts, deleteContact } from '../../../api/contacts';
import toast from 'react-hot-toast';

export default function ContactList() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchContacts = useCallback(() => {
    setLoading(true);
    const params = typeFilter !== 'all' ? { type: typeFilter } : {};
    getContacts(params)
      .then(r => setContacts(r.data.data || []))
      .catch(() => toast.error('Failed to load contacts.'))
      .finally(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete contact "${name}"?`)) return;

    try {
      await deleteContact(id);
      toast.success(`Contact "${name}" deleted successfully`);
      fetchContacts();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete contact';
      toast.error(msg);
    }
  };

  const filtered = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.country || '').toLowerCase().includes(search.toLowerCase())
  );

  const getTypeBadge = (type) => {
    const t = (type || '').toUpperCase();
    if (t === 'CUSTOMER') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Customer</span>;
    }
    if (t === 'VENDOR') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Vendor</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Both</span>;
  };

  const cols = [
    {
      key: 'image_url',
      label: 'Avatar',
      render: (url, row) => (
        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs flex-shrink-0">
          {url ? <img src={url} alt={row.name} className="w-8 h-8 rounded-full object-cover" /> : row.name?.[0]?.toUpperCase()}
        </div>
      )
    },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type', render: v => getTypeBadge(v) },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile', render: v => v || <span className="text-gray-400 italic">—</span> },
    {
      key: 'location',
      label: 'Location',
      render: (_, row) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {[row.city, row.state, row.country].filter(Boolean).join(', ') || <span className="text-gray-400 italic">—</span>}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={(e) => handleDelete(e, row.id, row.name)}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete contact"
        >
          <Trash2 size={15} />
        </button>
      )
    }
  ];

  return (
    <div>
      <PageHeader title="Contacts" subtitle="Manage customers, vendors, and portal user logins">
        <button className="btn-primary" onClick={() => navigate('/contacts/new')} id="new-contact-btn">
          <Plus size={15} /> New Contact
        </button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Search contacts by name, email, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium">
            {[
              { id: 'all', label: 'All' },
              { id: 'customer', label: 'Customers' },
              { id: 'vendor', label: 'Vendors' },
              { id: 'both', label: 'Both' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  typeFilter === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg self-end sm:self-auto">
          <button
            onClick={() => setView('list')}
            className={`btn-icon btn-sm ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
            title="List view"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`btn-icon btn-sm ${view === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
            title="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <DataTable
          columns={cols}
          data={filtered}
          loading={loading}
          onRowClick={r => navigate(`/contacts/${r.id}`)}
          emptyMessage="No contacts yet. Click New Contact to add one."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            [1, 2, 3, 4].map(i => <div key={i} className="card h-40 animate-pulse bg-gray-100 dark:bg-gray-800" />)
          ) : filtered.length === 0 ? (
            <p className="text-gray-400 col-span-full text-center py-10">No contacts found.</p>
          ) : filtered.map(c => (
            <div
              key={c.id}
              className="card p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary-500 relative group"
              onClick={() => navigate(`/contacts/${c.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold flex-shrink-0">
                    {c.image_url ? <img src={c.image_url} alt={c.name} className="w-10 h-10 rounded-full object-cover" /> : c.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">{c.name}</p>
                    <div className="mt-0.5">{getTypeBadge(c.type)}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, c.id, c.name)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded transition-opacity"
                  title="Delete contact"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <p className="truncate">{c.email || '—'}</p>
                <p>{c.mobile || '—'}</p>
                {(c.city || c.country) && (
                  <p className="flex items-center gap-1 text-gray-400">
                    <Globe size={11} /> {[c.city, c.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
