import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Auth Guard: chặn truy cập các trang private.
 * - Đang load session → full-screen spinner
 * - Chưa đăng nhập → redirect /login (giữ lại location để login xong quay về)
 * - Đã đăng nhập → render route con
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4"
        style={{ background: "#080809" }}
      >
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{
            border: "3px solid rgba(201, 164, 91, 0.2)",
            borderTopColor: "#C9A45B",
          }}
        />
        <span className="text-xs text-[#8A8A8A] font-semibold tracking-wide">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
