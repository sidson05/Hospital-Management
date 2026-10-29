// Centralized API client for HMS
import { normalizeRole } from '../utils/formatters';

let inMemoryToken = null;
let inMemoryUser = null;

// Initialize from sessionStorage on load
try {
  const savedToken = sessionStorage.getItem('hms_token');
  const savedUser = sessionStorage.getItem('hms_user');
  if (savedToken) inMemoryToken = savedToken;
  if (savedUser) inMemoryUser = JSON.parse(savedUser);
} catch (e) {
  // Session storage unavailable
}

export const authStorage = {
  getToken: () => inMemoryToken,
  getUser: () => inMemoryUser,
  setAuth: (token, user) => {
    inMemoryToken = token;
    inMemoryUser = user;
    try {
      if (token) {
        sessionStorage.setItem('hms_token', token);
      } else {
        sessionStorage.removeItem('hms_token');
      }
      if (user) {
        sessionStorage.setItem('hms_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('hms_user');
      }
    } catch (e) {}
  },
  clearAuth: () => {
    inMemoryToken = null;
    inMemoryUser = null;
    try {
      sessionStorage.removeItem('hms_token');
      sessionStorage.removeItem('hms_user');
    } catch (e) {}
  },
};

/**
 * Universal request wrapper
 */
async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = authStorage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (err) {
    throw new Error('Unable to reach the hospital server. Please check your connection and try again.');
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    authStorage.clearAuth();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Your session has expired. Please sign in again.');
  }

  // Handle 409 Conflict specifically
  if (response.status === 409) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.message || 'That time was just taken. Please choose another.';
    const err = new Error(msg);
    err.status = 409;
    throw err;
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    // Format human-friendly error messages
    let message = data?.message || `Request failed with status ${response.status}`;
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      // Validation error array
      message = data.errors.join('. ');
    } else if (data?.fieldErrors) {
      // Map of field errors
      message = Object.entries(data.fieldErrors)
        .map(([field, err]) => `${field}: ${err}`)
        .join('. ');
    }
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  // Backend wraps payload in ApiResponse<T> where actual data is in .data
  return data?.data !== undefined ? data.data : data;
}

export const api = {
  // Authentication
  auth: {
    login: async (credentials) => {
      const data = await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      // Store token and normalized user
      const user = {
        userId: data.userId,
        email: data.email,
        fullName: data.fullName,
        role: normalizeRole(data.role),
        rawRole: data.role,
        profileId: data.profileId,
      };
      authStorage.setAuth(data.token, user);
      return { token: data.token, user };
    },
    register: async (details) => {
      // Backend expects role prefixed with ROLE_ (ROLE_PATIENT or ROLE_DOCTOR)
      const role = details.role && details.role.startsWith('ROLE_')
        ? details.role
        : `ROLE_${(details.role || 'PATIENT').toUpperCase()}`;

      const payload = {
        firstName: details.firstName,
        lastName: details.lastName,
        phoneNumber: details.phoneNumber,
        email: details.email,
        password: details.password,
        role: role,
      };

      const data = await request('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const user = {
        userId: data.userId,
        email: data.email,
        fullName: data.fullName,
        role: normalizeRole(data.role),
        rawRole: data.role,
        profileId: data.profileId,
      };
      authStorage.setAuth(data.token, user);
      return { token: data.token, user };
    },
  },

  // Doctors & Availabilities & Slots
  doctors: {
    getAll: async (specialization) => {
      const url = specialization
        ? `/api/v1/doctors?specialization=${encodeURIComponent(specialization)}`
        : '/api/v1/doctors';
      return request(url);
    },
    getById: async (id) => request(`/api/v1/doctors/${id}`),
    getSlots: async (doctorId, dateStr) =>
      request(`/api/v1/doctors/${doctorId}/slots?date=${dateStr}`),
    getAvailabilities: async (doctorId) =>
      request(`/api/v1/doctors/${doctorId}/availabilities`),
  },

  // Appointments
  appointments: {
    book: async ({ doctorId, slotStartTime }) =>
      request('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify({ doctorId, slotStartTime }),
      }),
    getMine: async () => request('/api/v1/appointments/my'),
    getDoctorAppointments: async (doctorId) =>
      request(`/api/v1/appointments/doctor/${doctorId}`),
    cancel: async (id, reason) =>
      request(`/api/v1/appointments/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }),
    reschedule: async (id, newSlotStartTime) =>
      request(`/api/v1/appointments/${id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ newSlotStartTime }),
      }),
    updateStatus: async (id, status) =>
      request(`/api/v1/appointments/${id}/status?status=${status}`, {
        method: 'PATCH',
      }),
  },

  // Admin Reports
  reports: {
    getDaily: async (dateStr) => {
      const url = dateStr ? `/api/v1/admin/reports/daily?date=${dateStr}` : '/api/v1/admin/reports/daily';
      return request(url);
    },
    getBusiestDoctors: async (startDate, endDate, limit = 5) =>
      request(
        `/api/v1/admin/reports/busiest-doctors?startDate=${startDate}&endDate=${endDate}&limit=${limit}`
      ),
  },

  // Patient Profile
  patients: {
    getMe: async () => request('/api/v1/patients/me'),
  },
};
