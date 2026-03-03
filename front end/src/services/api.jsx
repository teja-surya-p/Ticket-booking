import { APICallHandler } from "./apiCallHandler";
import "./api.module.css";
export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    headers,
    body,
    query,
    allowEmptyResponse = false
  } = options;
  return APICallHandler({
    url: path,
    method,
    operation: `${method} ${path}`,
    header: headers,
    body,
    query,
    allowEmptyResponse
  });
}
