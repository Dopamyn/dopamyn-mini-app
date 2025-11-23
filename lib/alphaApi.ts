import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { errorInterceptor, successInterceptor } from "./interceptors";

const baseUrl = "https://5rve3vmw9a.execute-api.eu-west-1.amazonaws.com";

// Server-side only - these should not be exposed to the client
const authToken = process.env.ACCESS_KEY;
const apiKey = process.env.API_KEY || "WfYu3ZzzTG4vxWaN0LH1b86HUF7Oz4PR5mriE6lf";

const axiosRequestConfigNew: AxiosRequestConfig = {
  baseURL: baseUrl,
  responseType: "json",
  headers: {
    "Content-Type": "application/json",
    Authorization: authToken,
    "x-api-key": apiKey,
  },
};

const apiClientNew: AxiosInstance = axios.create(axiosRequestConfigNew);

apiClientNew.interceptors.response.use(successInterceptor, errorInterceptor);

export default apiClientNew;
