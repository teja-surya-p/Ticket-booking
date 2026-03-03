import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS } from "./constants";
import "./adminApi.module.css";
export function fetchAdminDashboardStats() {
  return APICallHandler({
    url: API_ENDPOINTS.admin.stats,
    method: "GET",
    operation: "Fetch admin dashboard stats"
  });
}
