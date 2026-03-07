import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppNavbar from "./components/AppNavbar";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboard from "./pages/UserDashboard";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";

// Layout wraps every page with the shared Navbar
const Layout = ({ children }) => (
  <>
    <AppNavbar />
    <main>{children}</main>
  </>
);

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      {/* Single ToastContainer for the whole app */}
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
        {/* Public routes */}
        <Route path="/login"       element={<Layout><LoginPage /></Layout>} />
        <Route path="/register"    element={<Layout><RegisterPage /></Layout>} />
        <Route path="/admin/login" element={<Layout><AdminLoginPage /></Layout>} />

        {/* Protected user route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="user" redirectTo="/login">
              <Layout><UserDashboard /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Protected admin route */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin" redirectTo="/admin/login">
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;