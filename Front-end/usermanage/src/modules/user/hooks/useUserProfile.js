import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiGetUserProfile } from "../services/user.service";

const useUserProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (!user) { navigate("/login", { replace: true }); return; }
    if (didFetch.current) return;
    didFetch.current = true;

    apiGetUserProfile()
      .then((res) => setProfile(res.data))
      .catch(() => toast.error("Failed to load profile"));
  }, [user, navigate]);

  const guardedCall = useCallback(async (apiFn, onSuccess) => {
    try {
      const result = await apiFn();
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  return { profile, setProfile, guardedCall };
};

export default useUserProfile;