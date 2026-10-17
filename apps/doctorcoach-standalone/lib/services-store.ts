import { defaultServices, parseService, publicService, ServiceError } from './services.ts';
import type { ConsultationService } from './services.ts';
import { isStaff } from './staff.ts';
import type { StaffIdentity } from './staff.ts';

const columns = `id, title, description, provider, format, duration_minutes AS durationMinutes,
  price_agorot AS priceAgorot, price_confirmed AS priceConfirmed, status, booking_url AS bookingUrl,
  payment_url AS paymentUrl, payment_instructions AS paymentInstructions, version, updated_at AS updatedAt`;
type Row = Omit<ConsultationService, 'priceConfirmed'> & { priceConfirmed: number };
const fromRow = (row: Row): ConsultationService => ({ ...row, priceConfirmed: row.priceConfirmed === 1 });

export function servicesStore(db: D1Database, adminEmails?: string,restricted?:{userId:string;provider:'lior';guard:{sql:string;args:(string|number)[]}}) {
  function requireStaff(user: StaffIdentity | null): StaffIdentity {
    if (!user) throw new ServiceError('יש להתחבר כדי לנהל שירותים.', 401);
    if (!isStaff(user, adminEmails)&&user.userId!==restricted?.userId) throw new ServiceError('אזור זה זמין לחשבונות צוות מורשים בלבד.', 403);
    return user;
  }
  async function all(): Promise<ConsultationService[]> {
    const result = await db.prepare(`SELECT ${columns} FROM consultation_services ORDER BY created_at, id`).all<Row>();
    const merged = new Map(defaultServices.map(service => [service.id, { ...service }]));
    for (const row of result.results) merged.set(row.id, fromRow(row));
    return [...merged.values()];
  }
  async function get(id: string): Promise<ConsultationService | undefined> {
    const row = await db.prepare(`SELECT ${columns} FROM consultation_services WHERE id = ?`).bind(id).first<Row>();
    return row ? fromRow(row) : defaultServices.find(service => service.id === id);
  }
  return {
    async listPublic() { return (await all()).filter(service => service.status !== 'draft').map(publicService); },
    async listAdmin(user: StaffIdentity | null) { requireStaff(user); const rows=await all();if(restricted){const allowed=await db.prepare(`SELECT CASE WHEN ${restricted.guard.sql} THEN 1 ELSE 0 END allowed`).bind(...restricted.guard.args).first<{allowed:number}>();if(!allowed?.allowed)throw new ServiceError('הרשאת התזונה השתנתה.',403);}return restricted?rows.filter(s=>s.provider===restricted.provider):rows; },
    async save(user: StaffIdentity | null, input: unknown): Promise<ConsultationService> {
      const editor = requireStaff(user);
      const service = parseService(input);
      const existing=restricted?await get(service.id):undefined;
      if(restricted&&(service.provider!==restricted.provider||existing&&existing.provider!==restricted.provider))throw new ServiceError('אפשר לערוך רק את שירותי התזונה שלך.',403);
      const guard=restricted?.guard??{sql:'1=1',args:[] as (string|number)[]};
      const now = new Date().toISOString();
      const values = [service.title, service.description, service.provider, service.format,
        service.durationMinutes, service.priceAgorot, service.priceConfirmed ? 1 : 0,
        service.status, service.bookingUrl, service.paymentUrl, service.paymentInstructions];
      const row = service.version === 0
        ? await db.prepare(`INSERT INTO consultation_services
          (id, title, description, provider, format, duration_minutes, price_agorot, price_confirmed, status, booking_url, payment_url, payment_instructions, created_at, updated_at, updated_by)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (${guard.sql}) ON CONFLICT(id) DO NOTHING RETURNING ${columns}`)
          .bind(service.id, ...values, now, now, editor.userId,...guard.args).first<Row>()
        : await db.prepare(`UPDATE consultation_services SET title = ?, description = ?, provider = ?, format = ?,
          duration_minutes = ?, price_agorot = ?, price_confirmed = ?, status = ?, booking_url = ?, payment_url = ?, payment_instructions = ?,
          updated_at = ?, updated_by = ?, version = version + 1 WHERE id = ? AND version = ? AND (${guard.sql}) ${restricted?"AND provider='lior'":''} RETURNING ${columns}`)
          .bind(...values, now, editor.userId, service.id, service.version,...guard.args).first<Row>();
      if (row) return fromRow(row);
      if(restricted){const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END allowed`).bind(...guard.args).first<{allowed:number}>();if(!allowed?.allowed)throw new ServiceError('הרשאת התזונה השתנתה. השינוי לא נשמר.',403);}
      const current = await get(service.id);
      if(restricted&&current&&current.provider!==restricted.provider)throw new ServiceError('השירות אינו זמין לעריכה בחשבון שלך.',403);
      if (!current) throw new ServiceError('השירות לא נמצא. טענו מחדש את רשימת השירותים.', 404);
      throw new ServiceError('השירות השתנה מאז שפתחתם אותו. טענו את הגרסה השמורה לפני עריכה נוספת.', 409, current);
    },
  };
}
