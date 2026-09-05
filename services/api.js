const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

export const fetchApi = async (endpoint, options = {}) => {
  let token = null;
  if (typeof window !== 'undefined') {
    try {
      const authData = localStorage.getItem('crm_auth_data');
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed?.accessToken || parsed?.token || null;
      }
    } catch (e) {}
    if (!token) {
      token = localStorage.getItem('token');
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'omit', // Default, we will change it to include for refresh
  });

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    // Attempt token refresh
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Send HttpOnly cookie
        });

        if (!refreshRes.ok) {
          throw new Error('Refresh failed');
        }

        const refreshData = await refreshRes.json();
        const newToken = refreshData?.data?.accessToken;
        
        if (newToken) {
          localStorage.setItem('token', newToken);
          if (typeof window !== 'undefined') {
            const currentDataStr = localStorage.getItem('crm_auth_data');
            if (currentDataStr) {
              const currentData = JSON.parse(currentDataStr);
              currentData.accessToken = newToken;
              if (refreshData?.data?.permissions) {
                  currentData.permissions = refreshData.data.permissions;
              }
              if (refreshData?.data?.sidebarPermissions !== undefined) {
                  currentData.sidebarPermissions = refreshData.data.sidebarPermissions;
              }
              if (refreshData?.data?.user) {
                  currentData.user = refreshData.data.user;
              }
              localStorage.setItem('crm_auth_data', JSON.stringify(currentData));
            }
          }
          onRefreshed(newToken);
          isRefreshing = false;
        } else {
          throw new Error('No token returned');
        }
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        // Clear auth state
        localStorage.removeItem('token');
        localStorage.removeItem('crm_auth_data');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw err;
      }
    }

    // Wait for the new token
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh(async (newToken) => {
        if (!newToken) {
          return reject(new Error('Refresh failed'));
        }
        // Retry the original request
        const newHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`
        };
        try {
          const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: newHeaders
          });
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            reject(new Error(errorData.message || 'Something went wrong'));
          } else {
            resolve(await retryResponse.json());
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Something went wrong');
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};
