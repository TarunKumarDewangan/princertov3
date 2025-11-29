import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import CitizenList from './components/CitizenList';
import CreateCitizen from './components/CreateCitizen';
import CitizenDetails from './components/CitizenDetails';
import AccountStatement from './components/AccountStatement';
import ExpiryReports from './components/ExpiryReports';
import BackupPage from './components/BackupPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" reverseOrder={false} />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/citizens" element={<CitizenList />} />
        <Route path="/create-citizen" element={<CreateCitizen />} />
        <Route path="/citizens/:id" element={<CitizenDetails />} />
        <Route path="/citizens/:id/accounts" element={<AccountStatement />} />
        <Route path="/reports/expiry" element={<ExpiryReports />} />
        <Route path="/backup" element={<BackupPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
