/**
 * API Service - Provider-agnostic backend communication
 * Handles authentication and data persistence through our FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login?: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface UserData {
  id: string;
  user_id: string;
  data_type: string;
  data: any;
  created_at: string;
  updated_at: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, name }),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    this.setToken(data.access_token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    this.setToken(data.access_token);
    return data;
  }

  async logout(): Promise<void> {
    if (this.token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: this.getHeaders(),
        });
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }

    this.clearToken();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  async updateUser(updates: { name?: string; avatar_url?: string }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    return this.handleResponse<User>(response);
  }

  async verifyToken(): Promise<{ valid: boolean; user_id: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ valid: boolean; user_id: string }>(response);
  }

  // User data methods
  async getUserData(dataType?: string): Promise<UserData[]> {
    const url = dataType
      ? `${API_BASE_URL}/user-data/?data_type=${dataType}`
      : `${API_BASE_URL}/user-data/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<UserData[]>(response);
  }

  async getUserDataByType(dataType: string): Promise<UserData> {
    const response = await fetch(`${API_BASE_URL}/user-data/${dataType}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<UserData>(response);
  }

  async saveUserData(dataType: string, data: any): Promise<UserData> {
    const response = await fetch(`${API_BASE_URL}/user-data/${dataType}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ data }),
    });

    return this.handleResponse<UserData>(response);
  }

  async deleteUserData(dataType: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user-data/${dataType}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    await this.handleResponse(response);
  }

  async exportAllUserData(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user-data/export/all`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async importAllUserData(data: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user-data/import/all`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    await this.handleResponse(response);
  }

  // Token management
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiService = new ApiService();
export type { User, AuthResponse, UserData };
