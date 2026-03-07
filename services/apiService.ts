/**
 * API Service - Provider-agnostic backend communication
 * Handles authentication and data persistence through our FastAPI backend
 */

import { supabase } from '../config/supabase';

// Empty string from build means env var wasn't set, so fall back to localhost
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
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Get Supabase session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: any = new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.code = errorData.code;
      error.retryAfter = errorData.retry_after;
      throw error;
    }

    return response.json();
  }

  // Authentication methods (legacy - app uses Supabase directly)
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ email, password, name }),
    });

    return this.handleResponse<AuthResponse>(response);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    return this.handleResponse<AuthResponse>(response);
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: await this.getHeaders(),
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  async updateUser(updates: { name?: string; avatar_url?: string }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(updates),
    });

    return this.handleResponse<User>(response);
  }

  async verifyToken(): Promise<{ valid: boolean; user_id: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: await this.getHeaders(),
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
      headers: await this.getHeaders(),
    });

    return this.handleResponse<UserData[]>(response);
  }

  async getUserDataByType(dataType: string): Promise<UserData> {
    const response = await fetch(`${API_BASE_URL}/user-data/${dataType}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse<UserData>(response);
  }

  async saveUserData(dataType: string, data: any): Promise<UserData> {
    const response = await fetch(`${API_BASE_URL}/user-data/${dataType}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify({ data }),
    });

    return this.handleResponse<UserData>(response);
  }

  async deleteUserData(dataType: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user-data/${dataType}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    await this.handleResponse(response);
  }

  async exportAllUserData(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user-data/export/all`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async importAllUserData(data: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user-data/import/all`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });

    await this.handleResponse(response);
  }

  // Family plan methods
  async createFamilyPlan(planData: {
    plan_data: any;
    family_data?: any;
    preferences_data?: any;
    prep_tasks?: any;
    grocery_items?: any;
    invalidation_state?: any;
    has_plan?: string;
    current_stage?: string;
    title?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/family-plans/`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(planData),
    });

    return this.handleResponse(response);
  }

  async getMyFamilyPlans(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/family-plans/my-plans`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getMyMembership(): Promise<any | null> {
    const response = await fetch(`${API_BASE_URL}/family-plans/my-membership`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    // 204 No Content or empty response means no membership
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    const data = await this.handleResponse(response);
    // Backend returns null (JSON) when no membership exists
    return data || null;
  }

  async getFamilyPlan(planId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/family-plans/${planId}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getPlanByInviteCode(inviteCode: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/family-plans/by-invite-code/${inviteCode}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async joinFamily(inviteCode: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/family-plans/join`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ invite_code: inviteCode }),
    });

    return this.handleResponse(response);
  }

  async updateFamilyPlan(planId: string, updates: {
    plan_data?: any;
    family_data?: any;
    preferences_data?: any;
    prep_tasks?: any;
    grocery_items?: any;
    invalidation_state?: any;
    has_plan?: string;
    current_stage?: string;
    title?: string;
    is_locked?: boolean;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/family-plans/${planId}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(updates),
    });

    return this.handleResponse(response);
  }

  async leaveFamily(planId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/family-plans/${planId}/leave`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }
  async removeFamilyMember(planId: string, memberUserId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/family-plans/${planId}/members/${memberUserId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }



  async deleteFamilyPlan(planId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/family-plans/${planId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();
export type { User, AuthResponse, UserData };
