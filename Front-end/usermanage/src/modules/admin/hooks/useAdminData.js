import { useState } from "react";
import { toast } from "react-toastify";
import { apiGetDashboard, apiGetAllUsers, apiGetAllAdmins } from "../services/admin.service";
import { showApiError } from "../../../utils/api";

const useAdminData = () => {
  const [users, setUsers]                     = useState([]);
  const [pagination, setPagination]           = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [admins, setAdmins]                   = useState([]);
  const [dashboardCounts, setDashboardCounts] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await apiGetDashboard();
      setDashboardCounts(res.data);
    } catch (err) {
      showApiError(err, (m) => toast.error(m));
    }
  };

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
    fetchDashboard,
  };
};

export default useAdminData;