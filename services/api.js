const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';

export const fetchApi = async (endpoint, options = {}) => {
  let token = null;
  if (typeof window !== 'undefined') {
    try {
      const authData = localStorage.getItem('crm_auth_data');
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed?.token || null;
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
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Something went wrong');
  }

  return response.json();
};
