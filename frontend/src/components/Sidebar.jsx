import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, BookOpen, BookMarked, BarChart2,
  ShoppingCart, FileText, Receipt, Truck, FileMinus, CreditCard,
  PieChart, TrendingUp, Scale, Wallet, ChevronDown, ChevronUp,
  LineChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const LOGO_TEXT = 'Urban Furniture';

function NavSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

function SideLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `nav-item ${isActive ? 'nav-item-active' : 'nav-item-default'}`
      }
    >
      <Icon size={16} className="flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ onClose }) {
  const { isContact } = useAuth();

  if (isContact) {
    return (
      <nav className="flex flex-col h-full">
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">UF</div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{LOGO_TEXT}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SideLink to="/portal" icon={Receipt} label="My Invoices" end />
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">UF</div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{LOGO_TEXT}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600">Accounting</p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Dashboard */}
        <SideLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" end />

        <NavSection title="Sales" defaultOpen>
          <SideLink to="/sales-orders"  icon={ShoppingCart} label="Sales Orders" />
          <SideLink to="/invoices"      icon={FileText}     label="Customer Invoices" />
        </NavSection>

        <NavSection title="Purchase" defaultOpen>
          <SideLink to="/purchase-orders" icon={Truck}     label="Purchase Orders" />
          <SideLink to="/bills"           icon={FileMinus} label="Vendor Bills" />
        </NavSection>

        <NavSection title="Master Data" defaultOpen>
          <SideLink to="/contacts"   icon={Users}       label="Contacts" />
          <SideLink to="/products"   icon={Package}     label="Products" />
          <SideLink to="/analytics"  icon={LineChart}   label="Analytic Accounts" />
          <SideLink to="/budgets"    icon={Wallet}      label="Budgets" />
          <SideLink to="/coa"        icon={BookOpen}    label="Chart of Accounts" />
        </NavSection>

        <NavSection title="Accounting">
          <SideLink to="/journals"         icon={BookMarked} label="Journals" />
          <SideLink to="/journal-entries"  icon={Receipt}    label="Journal Entries" />
        </NavSection>

        <NavSection title="Reports">
          <SideLink to="/reports/profit-loss"   icon={TrendingUp} label="Profit & Loss" />
          <SideLink to="/reports/balance-sheet" icon={Scale}      label="Balance Sheet" />
          <SideLink to="/reports/budget"        icon={PieChart}   label="Budget Report" />
        </NavSection>
      </div>
    </nav>
  );
}
