import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SecurityGateway from './pages/SecurityGateway';
import Dashboard from './pages/Dashboard';
import StaffPass from './pages/StaffPass';
import VisitorRegistry from './pages/VisitorRegistry';
import ZoneControl from './pages/ZoneControl';
import AdminPanel from './pages/AdminPanel';
import Reports from './pages/Reports';
import PrivateRoute from './components/PrivateRoute';
import NotificationListener from './components/NotificationListener';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <NotificationListener />
      <Routes>
        <Route path="/" element={<SecurityGateway />} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/gatepass" element={<StaffPass />} />
          <Route path="/visitors" element={<VisitorRegistry />} />
          <Route path="/zones" element={<ZoneControl />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
