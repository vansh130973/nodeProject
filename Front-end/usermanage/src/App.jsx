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
  <ProtectedRoute allowedRoles={["USER"]}>
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
        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
        <Route path="/forgot-password" element={<Layout><ForgotPasswordPage /></Layout>} />

        <Route path="/dashboard" element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/edit-profile" element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/change-password" element={<UserRoute><UserDashboard /></UserRoute>} />

        <Route path="/admin/login" element={<Layout><AdminLoginPage /></Layout>} />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={["ADMIN", "MASTER_ADMIN"]}>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={["ADMIN", "MASTER_ADMIN"]}>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/admins" element={
          <ProtectedRoute allowedRoles={["MASTER_ADMIN"]}>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/add-admin" element={
          <ProtectedRoute allowedRoles={["MASTER_ADMIN"]}>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/unauthorized" element={<Layout><Unauthorized /></Layout>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
