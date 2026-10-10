'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ConsultationService, PublicService } from '../lib/services';

export class ServiceRequestError extends Error {
  status: number;
  current?: ConsultationService;
  constructor(message: string, status: number, current?: ConsultationService) {
    super(message); this.status = status; this.current = current;
  }
}
export async function serviceRequest<T>(url: string, body?: ConsultationService): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache:'no-store', method:body ? 'PUT' : 'GET',
      headers:body ? { 'Content-Type':'application/json' } : undefined,
      body:body ? JSON.stringify(body) : undefined });
  } catch { throw new ServiceRequestError('אין חיבור לשרת. בדקו את החיבור ונסו שוב; השינויים נשארו בטופס.', 0); }
  const json = await response.json().catch(() => null) as ({ error?:string; current?:ConsultationService } & T) | null;
  if (!response.ok || !json) throw new ServiceRequestError(json?.error ?? 'לא ניתן לטעון את השירותים כרגע. נסו שוב.', response.status, json?.current);
  return json;
}

export type StaffAccess = 'loading' | 'signedOut' | 'member' | 'staff' | 'error';
export function useStaffAccess() {
  const [careRole, setCareRole] = useState<'clinician'|'coach'|'dietitian'|'coordinator'|null>(null);
  const [access, setAccess] = useState<StaffAccess>('loading');
  const reload = useCallback(async () => {
    setAccess('loading');
    try {
      const account = await serviceRequest<{signedIn:boolean;canManageServices:boolean;careRole:'clinician'|'coach'|'dietitian'|'coordinator'|null}>('/api/account');
      setCareRole(account.careRole);
      setAccess(account.canManageServices ? 'staff' : account.signedIn ? 'member' : 'signedOut');
    } catch { setCareRole(null); setAccess('error'); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { access, careRole, reload };
}

export function useServiceCatalog() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setState('loading');
    try {
      const data = await serviceRequest<{services:PublicService[]}>('/api/services');
      setServices(data.services); setState('ready'); setError('');
    } catch (failure) { setError((failure as Error).message); setState('error'); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { services, state, error, reload };
}
