import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, BookOpen, BookMarked, BarChart2,
  ShoppingCart, FileText, Receipt, Truck, FileMinus, CreditCard,
  PieChart, TrendingUp, Scale, Wallet, ChevronDown, ChevronUp,
  LineChart, CheckCircle2, FileSpreadsheet
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
  const { user, isContact } = useAuth();
  const contactType = (user?.contact_type || '').toUpperCase();
  const isVendorContact = contactType === 'VENDOR';
  const isBothContact = contactType === 'BOTH';

  if (isContact) {
    return (
      <nav className="flex flex-col h-full">
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">UF</div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{LOGO_TEXT}</p>
              <p className="text-xs text-primary-600 font-semibold mt-0.5">
                {isVendorContact ? 'Vendor Portal' : isBothContact ? 'Partner Portal' : 'Customer Portal'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Vendor Specific Sidebar */}
          {(isVendorContact || isBothContact) && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Supplier Orders
              </div>
              <SideLink to="/vendor-portal?tab=orders" icon={Truck} label="Assigned Orders" />
              <SideLink to="/vendor-portal?tab=completed" icon={CheckCircle2} label="Completed Orders" />
              <SideLink to="/vendor-portal?tab=bills" icon={FileText} label="Vendor Bills" />
              <SideLink to="/vendor-portal?tab=report" icon={FileSpreadsheet} label="Final Report & Save" />
            </>
          )}

          {/* Customer Specific Sidebar */}
          {(!isVendorContact || isBothContact) && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Customer Orders
              </div>
              <SideLink to="/portal?tab=orders" icon={Package} label="My Orders (Ordered)" />
              <SideLink to="/portal?tab=invoices" icon={Receipt} label="Invoices & Receipts" />
            </>
          )}
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
          <SideLink to="/vendor-reports"  icon={FileSpreadsheet} label="Vendor Fulfillment Reports" />
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
