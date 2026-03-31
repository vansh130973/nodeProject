import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiGetUserProfile } from "../services/user.service";

const useUserProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (didFetch.current) return;
    didFetch.current = true;

    apiGetUserProfile()
      .then((res) => setProfile(res.data))
      .catch((err) => {
        const msg = (err.message || "").toLowerCase();
        // Session was killed by admin force-logout
        if (msg.includes("session expired") || msg.includes("token") || msg.includes("unauthorized")) {
          toast.warn("Your session has ended. Please log in again.");
          logout();
          navigate("/login");
        } else {
          toast.error("Failed to load profile");
        }
      });
  }, [user, navigate, logout]);

  // Called after every API mutation — detects "session expired" on any request
  const guardedCall = async (apiFn, onSuccess) => {
    try {
      const result = await apiFn();
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("session expired") || msg.includes("token") || msg.includes("unauthorized")) {
        toast.warn("Your session has ended. Please log in again.");
        logout();
        navigate("/login");
        return;
      }
      throw err;
    }
  };

  return { profile, setProfile, guardedCall };
};

export default useUserProfile;
