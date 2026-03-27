import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiGetUserProfile } from "../services/user.service";

// Fetches and returns the logged-in user's profile, redirects if not logged in
const useUserProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    apiGetUserProfile()
      .then((res) => setProfile(res.data))
      .catch(() => toast.error("Failed to load profile"));
  }, [user, navigate]);

  return { profile, setProfile };
};

export default useUserProfile;
