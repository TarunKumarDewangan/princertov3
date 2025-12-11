import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard'; // Super Admin
import UserDashboard from './components/UserDashboard';   // Level 0 & 1
import CitizenList from './components/CitizenList';
import CreateCitizen from './components/CreateCitizen';
import CitizenDetails from './components/CitizenDetails';
import AccountStatement from './components/AccountStatement';
import ExpiryReports from './components/ExpiryReports';
import BackupPage from './components/BackupPage';
import CashFlow from './components/CashFlow';
import BulkImport from './components/BulkImport';
import WorkBook from './components/WorkBook';
import Settings from './components/Settings';
import ClientLedger from './components/ClientLedger';
import LicenseFlow from './components/LicenseFlow';
import ManageStaff from './components/ManageStaff';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" reverseOrder={false} />

      <Routes>
        <Route path="/" element={<Login />} />

        {/* SUPER ADMIN ROUTE */}
        <Route path="/super-admin" element={<AdminDashboard />} />

        {/* STAFF ROUTES (Level 1 & Level 0) */}
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/citizens" element={<CitizenList />} />
        <Route path="/create-citizen" element={<CreateCitizen />} />
        <Route path="/citizens/:id" element={<CitizenDetails />} />
        <Route path="/citizens/:id/accounts" element={<AccountStatement />} />
        <Route path="/reports/expiry" element={<ExpiryReports />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/cash-flow" element={<CashFlow />} />
        <Route path="/bulk-import" element={<BulkImport />} />
        <Route path="/work-book" element={<WorkBook />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/work-book/client/:id" element={<ClientLedger />} />
        <Route path="/license-flow" element={<LicenseFlow />} />
        <Route path="/manage-staff" element={<ManageStaff />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
