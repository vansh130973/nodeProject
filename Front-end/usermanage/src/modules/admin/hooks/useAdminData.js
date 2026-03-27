import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiGetAllUsers, apiGetAllAdmins } from "../services/admin.service";
import { showApiError } from "../../../utils/api";

// Fetches users and admins (admins only for MASTER_ADMIN), redirects if not authorized
const useAdminData = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    if (!user || !(user.role === "ADMIN" || user.role === "MASTER_ADMIN")) {
      navigate("/admin/login");
      return;
    }

    const loadInitial = async () => {
      try {
        const usersData = await apiGetAllUsers();
        setUsers(usersData.users);
      } catch (err) {
        showApiError(err, (msg) => toast.error(msg));
      }

      if (user.role === "MASTER_ADMIN") {
        try {
          const adminsData = await apiGetAllAdmins();
          setAdmins(adminsData.admins);
        } catch (err) {
          showApiError(err, (msg) => toast.error(msg));
        }
      }
    };

    loadInitial();
  }, [user, navigate]);

  return { users, setUsers, admins, setAdmins };
};

export default useAdminData;
