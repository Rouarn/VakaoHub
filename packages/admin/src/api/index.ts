import { del, get, patch, post } from './client';
import type {
  AppRow,
  AuditLog,
  ArtifactRow,
  EventRow,
  Funnel,
  LoginResult,
  Paginated,
  ReleaseRow,
  Stats,
} from './types';

export const api = {
  login: (username: string, password: string) =>
    post<LoginResult>('/admin/auth/login', { username, password }),

  stats: () => get<Stats>('/admin/stats'),

  funnel: (appId?: number) =>
    get<Funnel>('/admin/stats/funnel', { params: { appId } }),

  auditLogs: (params: { page?: number; pageSize?: number }) =>
    get<Paginated<AuditLog>>('/admin/audit-logs', { params }),

  changePassword: (oldPassword: string, newPassword: string) =>
    post<{ success: true }>('/admin/auth/change-password', {
      oldPassword,
      newPassword,
    }),

  events: (params: {
    page?: number;
    pageSize?: number;
    appId?: number;
    type?: string;
  }) => get<Paginated<EventRow>>('/admin/events', { params }),

  apps: {
    list: () => get<AppRow[]>('/admin/apps'),
    create: (data: Partial<AppRow>) => post<AppRow>('/admin/apps', data),
    update: (id: number, data: Partial<AppRow>) =>
      patch<AppRow>(`/admin/apps/${id}`, data),
    remove: (id: number) => del<{ success: true }>(`/admin/apps/${id}`),
  },

  releases: {
    list: (params: {
      appId?: number;
      status?: number;
      page?: number;
      pageSize?: number;
    }) => get<Paginated<ReleaseRow>>('/admin/releases', { params }),
    detail: (id: number) => get<ReleaseRow>(`/admin/releases/${id}`),
    create: (data: {
      appId: number;
      versionName: string;
      versionCode: number;
      channel?: string;
      updateLog?: string;
      minVersionCode?: number;
    }) => post<ReleaseRow>('/admin/releases', data),
    update: (id: number, data: Partial<ReleaseRow>) =>
      patch<ReleaseRow>(`/admin/releases/${id}`, data),
    publish: (
      id: number,
      data: { mode: 'full' | 'gray'; grayPercent?: number },
    ) => post<ReleaseRow>(`/admin/releases/${id}/publish`, data),
    offline: (id: number) => post<ReleaseRow>(`/admin/releases/${id}/offline`),
    force: (id: number, enabled: boolean) =>
      post<ReleaseRow>(`/admin/releases/${id}/force`, { enabled }),
    rollback: (appId: number, channel = 'stable') =>
      post<ReleaseRow>(`/admin/releases/rollback/${appId}`, { channel }),
    remove: (id: number) => del<{ success: true }>(`/admin/releases/${id}`),
  },

  artifacts: {
    upload: (form: FormData) => post<ArtifactRow>('/admin/artifacts', form),
    remove: (id: number) => del<{ success: true }>(`/admin/artifacts/${id}`),
  },
};
