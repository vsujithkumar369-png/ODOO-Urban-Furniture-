import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import Login         from './pages/auth/Login';
import Signup        from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';

// App
import Dashboard from './pages/Dashboard';

// Master
import ContactList  from './pages/master/contacts/ContactList';
import ContactForm  from './pages/master/contacts/ContactForm';
import ProductList  from './pages/master/products/ProductList';
import ProductForm  from './pages/master/products/ProductForm';
import CoaList      from './pages/master/coa/CoaList';
import JournalList  from './pages/master/journals/JournalList';
import AnalyticsList from './pages/master/analytics/AnalyticsList';
import BudgetList   from './pages/master/budgets/BudgetList';
import BudgetForm   from './pages/master/budgets/BudgetForm';

// Documents (unified)
import DocumentList from './pages/documents/DocumentList';
import DocumentForm from './pages/documents/DocumentForm';

// Accounting
import { JournalEntriesList, JournalEntryDetail } from './pages/accounting/JournalEntries';

// Reports
import ProfitLoss   from './pages/reports/ProfitLoss';
import BalanceSheet from './pages/reports/BalanceSheet';
import BudgetReport from './pages/reports/BudgetReport';
import VendorReports from './pages/reports/VendorReports';

// Portal
import Portal from './pages/portal/Portal';
import VendorPortal from './pages/portal/VendorPortal';

const INTERNAL_ROLES = ['admin', 'accountant'];
const ALL_ROLES      = ['admin', 'accountant', 'contact'];

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/"                element={<Navigate to="/login" replace />} />

      {/* Protected — inside Layout */}
      <Route element={<ProtectedRoute roles={ALL_ROLES}><Layout /></ProtectedRoute>}>

        {/* Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={INTERNAL_ROLES}><Dashboard /></ProtectedRoute>
        } />

        {/* Contacts */}
        <Route path="/contacts"      element={<ProtectedRoute roles={INTERNAL_ROLES}><ContactList /></ProtectedRoute>} />
        <Route path="/contacts/new"  element={<ProtectedRoute roles={INTERNAL_ROLES}><ContactForm /></ProtectedRoute>} />
        <Route path="/contacts/:id"  element={<ProtectedRoute roles={INTERNAL_ROLES}><ContactForm /></ProtectedRoute>} />

        {/* Products */}
        <Route path="/products"      element={<ProtectedRoute roles={INTERNAL_ROLES}><ProductList /></ProtectedRoute>} />
        <Route path="/products/new"  element={<ProtectedRoute roles={INTERNAL_ROLES}><ProductForm /></ProtectedRoute>} />
        <Route path="/products/:id"  element={<ProtectedRoute roles={INTERNAL_ROLES}><ProductForm /></ProtectedRoute>} />

        {/* COA */}
        <Route path="/coa"           element={<ProtectedRoute roles={INTERNAL_ROLES}><CoaList /></ProtectedRoute>} />

        {/* Journals */}
        <Route path="/journals"      element={<ProtectedRoute roles={INTERNAL_ROLES}><JournalList /></ProtectedRoute>} />

        {/* Analytics */}
        <Route path="/analytics"     element={<ProtectedRoute roles={INTERNAL_ROLES}><AnalyticsList /></ProtectedRoute>} />

        {/* Budgets */}
        <Route path="/budgets"       element={<ProtectedRoute roles={INTERNAL_ROLES}><BudgetList /></ProtectedRoute>} />
        <Route path="/budgets/new"   element={<ProtectedRoute roles={INTERNAL_ROLES}><BudgetForm /></ProtectedRoute>} />
        <Route path="/budgets/:id"   element={<ProtectedRoute roles={INTERNAL_ROLES}><BudgetForm /></ProtectedRoute>} />

        {/* Sales Orders */}
        <Route path="/sales-orders"      element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentList docType="SO" /></ProtectedRoute>} />
        <Route path="/sales-orders/new"  element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentForm docType="SO" /></ProtectedRoute>} />
        <Route path="/sales-orders/:id"  element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentForm docType="SO" /></ProtectedRoute>} />

        {/* Customer Invoices */}
        <Route path="/invoices"      element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentList docType="CUSTOMER_INVOICE" /></ProtectedRoute>} />
        <Route path="/invoices/new"  element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentForm docType="CUSTOMER_INVOICE" /></ProtectedRoute>} />
        <Route path="/invoices/:id"  element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentForm docType="CUSTOMER_INVOICE" /></ProtectedRoute>} />

        {/* Purchase Orders */}
        <Route path="/purchase-orders"      element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentList docType="PO" /></ProtectedRoute>} />
        <Route path="/purchase-orders/new"  element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentForm docType="PO" /></ProtectedRoute>} />
        <Route path="/purchase-orders/:id"  element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentForm docType="PO" /></ProtectedRoute>} />

        {/* Vendor Bills */}
        <Route path="/bills"      element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentList docType="VENDOR_BILL" /></ProtectedRoute>} />
        <Route path="/bills/new"  element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentForm docType="VENDOR_BILL" /></ProtectedRoute>} />
        <Route path="/bills/:id"  element={<ProtectedRoute roles={INTERNAL_ROLES}><DocumentForm docType="VENDOR_BILL" /></ProtectedRoute>} />

        {/* Journal Entries */}
        <Route path="/journal-entries"     element={<ProtectedRoute roles={INTERNAL_ROLES}><JournalEntriesList /></ProtectedRoute>} />
        <Route path="/journal-entries/:id" element={<ProtectedRoute roles={INTERNAL_ROLES}><JournalEntryDetail /></ProtectedRoute>} />

        {/* Reports */}
        <Route path="/reports/profit-loss"   element={<ProtectedRoute roles={INTERNAL_ROLES}><ProfitLoss /></ProtectedRoute>} />
        <Route path="/reports/balance-sheet" element={<ProtectedRoute roles={INTERNAL_ROLES}><BalanceSheet /></ProtectedRoute>} />
        <Route path="/reports/budget"        element={<ProtectedRoute roles={INTERNAL_ROLES}><BudgetReport /></ProtectedRoute>} />
        <Route path="/vendor-reports"        element={<ProtectedRoute roles={INTERNAL_ROLES}><VendorReports /></ProtectedRoute>} />

        {/* Portal */}
        <Route path="/portal"        element={<ProtectedRoute roles={['contact', 'admin', 'accountant']}><Portal /></ProtectedRoute>} />
        <Route path="/vendor-portal" element={<ProtectedRoute roles={['contact', 'admin', 'accountant']}><VendorPortal /></ProtectedRoute>} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
