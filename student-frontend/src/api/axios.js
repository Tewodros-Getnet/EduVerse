import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// ── Request: attach current access token ─────────────────────────────────────
api.interceptors.request.use((config) => {
    // Use stored role to pick the right token — prevents student token being
    // sent for instructor requests when both keys exist in localStorage.
    const role = localStorage.getItem('auth_role');
    const token = role === 'instructor'
        ? localStorage.getItem('instructor_token')
        : role === 'student'
        ? localStorage.getItem('student_token')
        : localStorage.getItem('student_token') || localStorage.getItem('instructor_token');

    if (token && token !== 'undefined' && token !== 'null') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Response: silent token refresh on 401 ────────────────────────────────────
let _refreshing = false;          // prevent parallel refresh attempts
let _queue = [];                  // requests waiting while refresh is in-flight

function processQueue(error, token = null) {
    _queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
    _queue = [];
}

api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config;

        // Only attempt refresh on 401, and not on the refresh endpoint itself
        if (
            err.response?.status === 401 &&
            !original._retry &&
            !original.url?.includes('/auth/refresh') &&
            !original.url?.includes('/auth/login')
        ) {
            const role = localStorage.getItem('auth_role');
            const studentRefresh = localStorage.getItem('student_refreshToken');
            const instructorRefresh = localStorage.getItem('instructor_refreshToken');
            const isStudent = role === 'student' || (!role && !!studentRefresh && !instructorRefresh);
            const refreshToken = isStudent ? studentRefresh : (instructorRefresh || studentRefresh);

            // No refresh token stored → force login immediately
            if (!refreshToken) {
                localStorage.removeItem('student_token');
                localStorage.removeItem('student_refreshToken');
                localStorage.removeItem('instructor_token');
                localStorage.removeItem('instructor_refreshToken');
                localStorage.removeItem('auth_role');
                window.location.href = '/login';
                return Promise.reject(err);
            }

            // If another request already triggered a refresh, queue this one
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

                // Write new tokens back to the same role key that was used
                const tokenKey = isStudent ? 'student_token' : 'instructor_token';
                const refreshKey = isStudent ? 'student_refreshToken' : 'instructor_refreshToken';
                localStorage.setItem(tokenKey, accessToken);
                localStorage.setItem(refreshKey, newRefresh);

                api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
                original.headers.Authorization = `Bearer ${accessToken}`;

                processQueue(null, accessToken);
                return api(original); // retry the original request
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                localStorage.removeItem('student_token');
                localStorage.removeItem('student_refreshToken');
                localStorage.removeItem('instructor_token');
                localStorage.removeItem('instructor_refreshToken');
                localStorage.removeItem('auth_role');
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
