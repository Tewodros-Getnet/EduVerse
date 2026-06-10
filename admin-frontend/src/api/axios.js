import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// ── Request: attach current access token ─────────────────────────────────────
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    // Only attach header if we actually have a real token string
    if (token && token !== 'undefined' && token !== 'null') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Response: silent token refresh on 401 ────────────────────────────────────
let _refreshing = false;
let _queue = [];

function processQueue(error, token = null) {
    _queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
    _queue = [];
}

api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config;

        if (
            err.response?.status === 401 &&
            !original._retry &&
            !original.url?.includes('/auth/refresh') &&
            !original.url?.includes('/auth/login')
        ) {
            const refreshToken = localStorage.getItem('admin_refreshToken');

            if (!refreshToken) {
                localStorage.removeItem('admin_token');
                window.location.href = '/login';
                return Promise.reject(err);
            }

            if (_refreshing) {
                return new Promise((resolve, reject) => {
                    _queue.push({ resolve, reject });
                }).then((newToken) => {
                    original.headers.Authorization = `Bearer ${newToken}`;
                    return api(original);
                });
            }

            original._retry = true;
            _refreshing = true;

            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
                const { accessToken, refreshToken: newRefresh } = data;

                localStorage.setItem('admin_token', accessToken);
                localStorage.setItem('admin_refreshToken', newRefresh);

                api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
                original.headers.Authorization = `Bearer ${accessToken}`;

                processQueue(null, accessToken);
                return api(original);
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshErr);
            } finally {
                _refreshing = false;
            }
        }

        return Promise.reject(err);
    }
);

export default api;
