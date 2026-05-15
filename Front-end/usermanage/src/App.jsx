import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
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

const ADMIN_ROLES  = ["ADMIN", "MASTER_ADMIN"];
const MASTER_ROLES = ["MASTER_ADMIN"];

const Layout = ({ children }) => (
  <>
    <AppNavbar />
    <main>{children}</main>
  </>
);

const UserRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["USER"]}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

const AdminRoute = ({ children, roles = ADMIN_ROLES }) => (
  <ProtectedRoute allowedRoles={roles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

const App = () => (
  <AuthProvider>
    <SocketProvider>
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

        {/* Admin routes (ADMIN + MASTER_ADMIN) */}
        <Route path="/admin/dashboard"       element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/tickets"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/tickets/:id"     element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/profile"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/change-password" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        {/* Master admin only */}
        <Route path="/admin/admins"     element={<AdminRoute roles={MASTER_ROLES}><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/add-admin"  element={<AdminRoute roles={MASTER_ROLES}><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/modules"    element={<AdminRoute roles={MASTER_ROLES}><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/roles"      element={<AdminRoute roles={MASTER_ROLES}><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/notifications"  element={<AdminRoute roles={MASTER_ROLES}><AdminDashboard /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </SocketProvider>
  </AuthProvider>
);

export default App;
