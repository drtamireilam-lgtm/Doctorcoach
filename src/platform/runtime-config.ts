export type RuntimeMode = 'local' | 'pilot' | 'production';

export type RuntimeConfig = {
  mode: RuntimeMode;
  apiBaseUrl: string;
  authIssuer?: string;
  authClientId?: string;
  mediaMaxBytes: number;
  pilotEnabled: boolean;
  pilotMaxUsers: number;
};

function env(name: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name];
}

function numberEnv(name: string, fallback: number): number {
  const value = Number(env(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const runtimeConfig: RuntimeConfig = {
  mode: (env('VITE_DOCTORCOACH_MODE') as RuntimeMode) || 'local',
  apiBaseUrl: env('VITE_DOCTORCOACH_API_URL') || '',
  authIssuer: env('VITE_DOCTORCOACH_AUTH_ISSUER'),
  authClientId: env('VITE_DOCTORCOACH_AUTH_CLIENT_ID'),
  mediaMaxBytes: numberEnv('VITE_DOCTORCOACH_MEDIA_MAX_BYTES', 250 * 1024 * 1024),
  pilotEnabled: env('VITE_DOCTORCOACH_PILOT_ENABLED') === 'true',
  pilotMaxUsers: numberEnv('VITE_DOCTORCOACH_PILOT_MAX_USERS', 25),
};

export function productionReady(config = runtimeConfig): boolean {
  return Boolean(config.apiBaseUrl && config.authIssuer && config.authClientId);
}
