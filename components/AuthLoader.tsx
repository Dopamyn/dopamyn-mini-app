"use client";

import { useUser } from "@/contexts/UserContext";

const FullScreenLoader = () => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      color: "white",
      fontSize: "2rem",
    }}
  >
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
  </div>
);

export const AuthLoader = () => {
  const { isSyncing } = useUser();
  return isSyncing ? <FullScreenLoader /> : null;
};
