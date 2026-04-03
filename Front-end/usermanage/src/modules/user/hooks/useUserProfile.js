import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { apiGetUserProfile } from "../services/user.service";

const POLL_INTERVAL = 5_000; // 5 seconds

const isSessionError = (msg = "") =>
  msg.includes("session expired") ||
  msg.includes("token") ||
  msg.includes("unauthorized");

const useUserProfile = () => {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const [profile, setProfile]           = useState(null);
  const [sessionKilled, setSessionKilled] = useState(false);
  const didFetch  = useRef(false);
  const pollTimer = useRef(null);

  // Called whenever a session-expired response is detected
  const handleSessionKilled = useCallback(() => {
    clearInterval(pollTimer.current);
    logout();
    toast.warn("Your session was ended by an admin. Redirecting to login...", {
      toastId: "session-killed", // prevent duplicate toasts
    });
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    if (!user) { navigate("/login", { replace: true }); return; }
    if (didFetch.current) return;
    didFetch.current = true;

    apiGetUserProfile()
      .then((res) => setProfile(res.data))
      .catch((err) => {
        if (isSessionError((err.message || "").toLowerCase())) {
          handleSessionKilled();
        } else {
          toast.error("Failed to load profile");
        }
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    pollTimer.current = setInterval(async () => {
      try {
        await apiGetUserProfile();
      } catch (err) {
        if (isSessionError((err.message || "").toLowerCase())) {
          handleSessionKilled();
        }
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollTimer.current);
  }, [user, handleSessionKilled]);

  const guardedCall = useCallback(async (apiFn, onSuccess) => {
    try {
      const result = await apiFn();
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (isSessionError((err.message || "").toLowerCase())) {
        handleSessionKilled();
        return;
      }
      throw err;
    }
  }, [handleSessionKilled]);

  return { profile, setProfile, sessionKilled, guardedCall };
};

export default useUserProfile;
