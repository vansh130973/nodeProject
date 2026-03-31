import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiGetDashboard, apiGetAllUsers, apiGetAllAdmins } from "../services/admin.service";
import { showApiError } from "../../../utils/api";

const useAdminData = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [admins, setAdmins] = useState([]);
  const [dashboardCounts, setDashboardCounts] = useState(null);

  // Fetch dashboard counts once on mount
  useEffect(() => {
    if (!user || !(user.role === "ADMIN" || user.role === "MASTER_ADMIN")) {
      navigate("/admin/login");
      return;
    }
    apiGetDashboard()
      .then((res) => setDashboardCounts(res.data))
      .catch((err) => showApiError(err, (m) => toast.error(m)));
  }, [user, navigate]);

  // Fetch users for page
  const fetchUsers = async (page = 1, limit = 10) => {
    try {
      const res = await apiGetAllUsers({ page, limit });
      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    }
  };

  // Fetch admins (MASTER_ADMIN only)
  const fetchAdmins = async () => {
    if (user?.role !== "MASTER_ADMIN") return;
    try {
      const res = await apiGetAllAdmins();
      setAdmins(res.admins);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    }
  };

  return {
    users, setUsers,
    pagination, setPagination,
    fetchUsers,
    admins, setAdmins,
    fetchAdmins,
    dashboardCounts, setDashboardCounts,
  };
};

export default useAdminData;