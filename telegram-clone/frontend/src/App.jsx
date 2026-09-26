import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatApp from './pages/ChatApp';

function Splash() {
  return (
    <div className="auth-screen">
      <div style={{ color: 'var(--text-secondary)' }}>Loading FairyChat...</div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Login/Register are also reachable while already signed in, when adding a
// second account (Settings -> "Add Another Account" links here with
// ?addAccount=1) — the currently-active session is left untouched until the
// new login/register actually succeeds.
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const addingAccount = params.get('addAccount') === '1';
  if (loading) return <Splash />;
  if (user && !addingAccount) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ChatProvider>
              <ChatApp />
            </ChatProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
