const AUTOSENDING_API_URL = 'https://autosending.touch-api.com';

class AutosendingApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private userToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setUserToken(token: string) {
    this.userToken = token;
    this.accessToken = null;
    this.refreshToken = null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  async authenticate(): Promise<boolean> {
    if (!this.userToken) return false;
    try {
      const res = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.userToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.accessToken) {
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken || null;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${this.baseUrl}/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      return true;
    } catch {
      return false;
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken && this.userToken) {
      await this.authenticate();
    }

    const url = `${this.baseUrl}${endpoint}`;
    let response = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
    });

    if (response.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          headers: { ...this.getHeaders(), ...options.headers },
        });
      } else if (this.userToken) {
        const reauthed = await this.authenticate();
        if (reauthed) {
          response = await fetch(url, {
            ...options,
            headers: { ...this.getHeaders(), ...options.headers },
          });
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Ошибка ${response.status}`);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text);
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const autosendingApi = new AutosendingApiClient(AUTOSENDING_API_URL);
