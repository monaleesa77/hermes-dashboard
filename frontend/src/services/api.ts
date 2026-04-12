import type { SessionInfo, SessionDetail, ModelInfo, GatewayStatus } from '../types';

const API_BASE = '/api';

class ApiService {
  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async health(): Promise<{ status: string; hermes_connected: boolean }> {
    return this.fetch('/health');
  }

  // Sessions
  async getSessions(): Promise<SessionInfo[]> {
    return this.fetch('/sessions');
  }

  async getSession(sessionId: string): Promise<SessionDetail> {
    return this.fetch(`/sessions/${sessionId}`);
  }

  async createSession(platform: string = 'api', name?: string): Promise<SessionDetail> {
    return this.fetch('/sessions', {
      method: 'POST',
      body: JSON.stringify({ platform, name }),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.fetch(`/sessions/${sessionId}`, { method: 'DELETE' });
  }

  // Models
  async getModels(): Promise<ModelInfo[]> {
    return this.fetch('/models');
  }

  // Gateway
  async getGatewayStatus(): Promise<GatewayStatus> {
    return this.fetch('/gateway/status');
  }
}

export const api = new ApiService();
