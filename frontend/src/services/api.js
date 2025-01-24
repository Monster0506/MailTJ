import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  console.log('Request config:', {
    url: config.url,
    method: config.method,
    hasToken: !!token,
    token: token // Log the actual token for debugging
  });
  
  if (token) {
    // Make sure we're setting the token in the correct format
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      headers: error.config?.headers // Log request headers for debugging
    });
    return Promise.reject(error);
  }
);

export const login = async (credentials) => {
  try {
    console.log('Attempting login with:', credentials.email);
    const response = await api.post('/login', credentials);
    console.log('Login response:', response.data);
    
    if (response.data.success && response.data.token) {
      console.log('Login successful, setting token');
      localStorage.setItem('authToken', response.data.token);
      return response.data;
    } else {
      throw new Error(response.data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const fetchEmails = async (page = 1, perPage = 20) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  try {
    console.log('Fetching emails - page:', page, 'perPage:', perPage);
    const response = await api.get('/fetch-emails', {
      params: {
        page,
        per_page: perPage
      }
    });
    console.log('Emails fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('Fetch emails error:', error);
    throw error;
  }
};

export const sendEmail = async (emailData) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  try {
    console.log('Sending email:', emailData);
    const response = await api.post('/send-email', emailData);
    return response.data;
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
};

export const getEmail = async (emailId) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
  
    try {
      console.log('Fetching email:', emailId);
      const response = await api.get(`/email/${emailId}`);
      console.log('Email fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get email error:', error);
      throw error;
    }
  };
  
  export const updateEmail = async (emailId, emailData) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
  
    try {
      console.log('Updating email:', emailId, emailData);
      const response = await api.put(`/email/${emailId}`, emailData);
      console.log('Email updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update email error:', error);
      throw error;
    }
  };

export default api;