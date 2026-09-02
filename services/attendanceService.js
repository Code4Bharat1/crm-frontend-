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
