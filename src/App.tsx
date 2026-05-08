import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Documents from './pages/Documents';
import SavingsPots from './pages/SavingsPots';
import Notes from './pages/Notes';
import Planning from './pages/Planning';
import OfflineFallback from './pages/OfflineFallback';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import ConfirmModal from './components/ConfirmModal';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sage-300 border-t-sage-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sage-500 font-body text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuthStore();
  if (loading) return null;
  if (currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/savings" element={<ProtectedRoute><SavingsPots /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
      <Route path="/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/offline" element={<OfflineFallback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    const unsub = init();
    return () => unsub();
  }, [init]);

  const { currentUser } = useAuthStore();
  
  useEffect(() => {
    if (currentUser?.uid) {
      import('./utils/notifications').then(({ requestNotificationPermission }) => {
        requestNotificationPermission(currentUser.uid);
      });
    }
  }, [currentUser?.uid]);

  return (
    <BrowserRouter>
      <AppRoutes />
      <InstallPrompt />
      <UpdatePrompt />
      <ConfirmModal />
    </BrowserRouter>
  );
}
