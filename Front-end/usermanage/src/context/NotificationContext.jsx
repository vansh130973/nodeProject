/**
 * NotificationContext
 *
 * Single source of truth for the notification badge count.
 * - UserDashboard writes to it (on fetch, on live socket event, on read-all)
 * - AppNavbar reads from it to show the bell badge
 *
 * This avoids duplicating socket listeners or prop-drilling.
 */
import { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const incrementNotifCount = useCallback(() => {
    setUnreadNotifCount((prev) => prev + 1);
  }, []);

  const resetNotifCount = useCallback(() => {
    setUnreadNotifCount(0);
  }, []);

  const syncNotifCount = useCallback((count) => {
    setUnreadNotifCount(Number(count) || 0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ unreadNotifCount, incrementNotifCount, resetNotifCount, syncNotifCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used inside NotificationProvider");
  return ctx;
};