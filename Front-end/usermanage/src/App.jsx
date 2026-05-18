import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppNavbar from "./components/AppNavbar";

// User pages
import LoginPage from "./modules/user/pages/LoginPage";
import RegisterPage from "./modules/user/pages/RegisterPage";
import ForgotPasswordPage from "./modules/user/pages/ForgotPasswordPage";
import UserDashboard from "./modules/user/pages/UserDashboard";

// Admin pages
import AdminLoginPage from "./modules/admin/pages/AdminLoginPage";
import AdminDashboard from "./modules/admin/pages/AdminDashboard";

import Unauthorized from "./components/Unauthorized";

const Layout = ({ children }) => (
  <>
    <AppNavbar />
    <main>{children}</main>
  </>
);

const UserRoute = ({ children }) => (
  <ProtectedRoute userOnly>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

const AdminRoute = ({ children, masterOnly = false }) => (
  <ProtectedRoute adminOnly masterOnly={masterOnly}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

const App = () => (
  <AuthProvider>
<BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <Routes>
        {/* Public */}
        <Route path="/login"            element={<Layout><LoginPage /></Layout>} />
        <Route path="/register"         element={<Layout><RegisterPage /></Layout>} />
        <Route path="/forgot-password"  element={<Layout><ForgotPasswordPage /></Layout>} />
        <Route path="/admin/login"      element={<Layout><AdminLoginPage /></Layout>} />
        <Route path="/unauthorized"     element={<Layout><Unauthorized /></Layout>} />

        {/* User routes */}
        <Route path="/dashboard"        element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/edit-profile"     element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/change-password"  element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/tickets"          element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/tickets/:id"      element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/notifications"    element={<UserRoute><UserDashboard /></UserRoute>} />

        {/* Admin routes (any admin; master = userName "admin") */}
        <Route path="/admin/dashboard"       element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/tickets"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/tickets/:id"     element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/profile"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/change-password" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        {/* Master admin only (userName "admin") */}
        <Route path="/admin/admins"          element={<AdminRoute masterOnly><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/add-admin"       element={<AdminRoute masterOnly><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/modules"         element={<AdminRoute masterOnly><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/roles"           element={<AdminRoute masterOnly><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/notifications"   element={<AdminRoute masterOnly><AdminDashboard /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
