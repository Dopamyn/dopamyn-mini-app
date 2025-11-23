import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

const extraHeaders = {
  // "x-api-key": import.meta.env.VITE_TEST_API_KEY,
  // source: import.meta.env.VITE_SOURCE,
};

const axiosRequestConfig: AxiosRequestConfig = {
  baseURL: process.env.NEXT_PUBLIC_CREDBUZZ_API_URL,
  responseType: "json",
  headers: {
    "Content-Type": "application/json",
    // "Access-Control-Allow-Origin": "*",
    ...extraHeaders,
  },
};

const apiClient: AxiosInstance = axios.create(axiosRequestConfig);

// Add request interceptor to include token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token-related errors
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Clear token
//       localStorage.removeItem("token");
//     }
//     return Promise.reject(error);
//   }
// );

export default apiClient;
