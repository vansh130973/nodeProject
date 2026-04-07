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

    // If the token is already invalid (e.g. admin logged user out before page load),
    // handleResponse in api.js will catch the 401 / session-expired message and
    // automatically call the global session-expired handler → redirect to /login.
    apiGetUserProfile()
      .then((res) => setProfile(res.data))
      .catch((err) => {
        // Session errors are already handled globally in api.js (toast + redirect).
        // Only show a toast for unrelated failures.
        if (!err.isSessionExpired) {
          toast.error("Failed to load profile");
        }
      });
  }, [user, navigate]);

  // Wraps any API call: if the token is invalidated mid-session (e.g. admin force-
  // logouts the user), handleResponse throws with isSessionExpired = true and the
  // global watcher in App.jsx redirects instantly — no polling required.
  const guardedCall = useCallback(async (apiFn, onSuccess) => {
    try {
      const result = await apiFn();
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (!err.isSessionExpired) throw err;
      // Session expired — already handled globally, just swallow here.
    }
  }, []);

  return { profile, setProfile, guardedCall };
};

export default useUserProfile;