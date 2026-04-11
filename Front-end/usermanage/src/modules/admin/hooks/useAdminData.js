import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiGetDashboard, apiGetAllUsers, apiGetAllAdmins } from "../services/admin.service";
import { showApiError } from "../../../utils/api";

const useAdminData = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const didInit  = useRef(false);

  const [users, setUsers]               = useState([]);
  const [pagination, setPagination]     = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [admins, setAdmins]             = useState([]);
  const [dashboardCounts, setDashboardCounts] = useState(null);

  useEffect(() => {
    if (!user || !(user.role === "ADMIN" || user.role === "MASTER_ADMIN")) {
      navigate("/admin/login");
      return;
    }
    didInit.current = true;
  }, [user, navigate]);

  const fetchDashboard = async () => {
    try {
      const res = await apiGetDashboard();
      setDashboardCounts(res.data);
    } catch (err) {
      if (!err.isSessionExpired) showApiError(err, (m) => toast.error(m));
    }
  };

  const fetchUsers = async (page = 1, limit = 10, status = "", search = "") => {
    try {
      const res = await apiGetAllUsers({ page, limit, status, search });
      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err) {
      if (!err.isSessionExpired) showApiError(err, (m) => toast.error(m));
    }
  };

  const fetchAdmins = async () => {
    if (user?.role !== "MASTER_ADMIN") return;
    try {
      const res = await apiGetAllAdmins();
      setAdmins(res.admins);
    } catch (err) {
      if (!err.isSessionExpired) showApiError(err, (m) => toast.error(m));
    }
  };

  return {
    users, setUsers,
    pagination, setPagination,
    fetchUsers,
    admins, setAdmins,
    fetchAdmins,
    dashboardCounts, setDashboardCounts,
    fetchDashboard,
  };
};

export default useAdminData;