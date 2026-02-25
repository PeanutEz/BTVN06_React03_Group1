import axios from "axios";

const api = axios.create({
  baseURL: "https://696ee319a06046ce6184c729.mockapi.io/btvn05",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    console.log(
      "[REQUEST]",
      config.method?.toUpperCase(),
      config.url,
      config.data ?? ""
    );


    return config;
  },
  (error) => {
    console.error("[REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(
      "[RESPONSE]",
      response.status,
      response.config.url
    );

    return response;
  },
  (error) => {
    const status = error.response?.status;

    if (status === 404) {
      console.error("API not found");
    }

    if (status === 500) {
      console.error("Server error");
    }

    return Promise.reject(error);
  }
);

export default api;