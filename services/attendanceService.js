import { fetchApi } from './api';

export const getAttendance = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/attendance?${queryString}` : '/attendance';
  return fetchApi(url);
};

export const createAttendance = async (data) => {
  return fetchApi('/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAttendance = async (id, data) => {
  return fetchApi(`/attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteAttendance = async (id) => {
  return fetchApi(`/attendance/${id}`, {
    method: 'DELETE',
  });
};

export const getAttendanceSummary = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/attendance/summary?${queryString}` : '/attendance/summary';
  return fetchApi(url);
};

export const getAttendanceStats = async () => {
  return fetchApi('/attendance/stats');
};

export const punchIn = async (data = {}) => {
  return fetchApi('/attendance/punch-in', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const punchOut = async (data = {}) => {
  return fetchApi('/attendance/punch-out', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getTodayStatus = async (employeeId = null) => {
  const url = employeeId ? `/attendance/today?employeeId=${employeeId}` : '/attendance/today';
  return fetchApi(url);
};

export const getWeekendPolicy = async () => {
  return fetchApi('/attendance/weekend-policy');
};

export const updateWeekendPolicy = async (policy = {}) => {
  return fetchApi('/attendance/weekend-policy', {
    method: 'PUT',
    body: JSON.stringify(policy),
  });
};
