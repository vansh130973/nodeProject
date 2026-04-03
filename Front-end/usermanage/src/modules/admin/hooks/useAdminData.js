import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiGetDashboard, apiGetAllUsers, apiGetAllAdmins } from "../services/admin.service";
import { showApiError } from "../../../utils/api";

const useAdminData = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const didInit   = useRef(false); // prevent re-firing when navigate reference changes

  const [users, setUsers]               = useState([]);
  const [pagination, setPagination]     = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [admins, setAdmins]             = useState([]);
  const [dashboardCounts, setDashboardCounts] = useState(null);

  useEffect(() => {
    // Redirect if not admin
    if (!user || !(user.role === "ADMIN" || user.role === "MASTER_ADMIN")) {
      navigate("/admin/login");
      return;
    }
    if (didInit.current) return;
    didInit.current = true;

    // Dashboard counts
    apiGetDashboard()
      .then((res) => setDashboardCounts(res.data))
      .catch((err) => showApiError(err, (m) => toast.error(m)));

    // Admins list — MASTER_ADMIN only, needed for "Total Admins" card on first load
    if (user.role === "MASTER_ADMIN") {
      apiGetAllAdmins()
        .then((res) => setAdmins(res.admins))
        .catch(() => {});
    }
  }, [user]);

  const fetchUsers = async (page = 1, limit = 10, status = "", search = "") => {
    try {
      const res = await apiGetAllUsers({ page, limit, status, search });
      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    }
  };

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