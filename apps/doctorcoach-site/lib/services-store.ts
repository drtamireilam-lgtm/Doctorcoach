import { defaultServices, parseService, publicService, ServiceError } from './services.ts';
import type { ConsultationService } from './services.ts';
import { isStaff } from './staff.ts';
import type { StaffIdentity } from './staff.ts';

const columns = `id, title, description, provider, format, duration_minutes AS durationMinutes,
  price_agorot AS priceAgorot, price_confirmed AS priceConfirmed, status, booking_url AS bookingUrl,
  payment_url AS paymentUrl, payment_instructions AS paymentInstructions, version, updated_at AS updatedAt`;
type Row = Omit<ConsultationService, 'priceConfirmed'> & { priceConfirmed: number };
const fromRow = (row: Row): ConsultationService => ({ ...row, priceConfirmed: row.priceConfirmed === 1 });

export function servicesStore(db: D1Database, adminEmails?: string) {
  function requireStaff(user: StaffIdentity | null): StaffIdentity {
    if (!user) throw new ServiceError('יש להתחבר כדי לנהל שירותים.', 401);
    if (!isStaff(user, adminEmails)) throw new ServiceError('אזור זה זמין לחשבונות צוות מורשים בלבד.', 403);
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
    async listAdmin(user: StaffIdentity | null) { requireStaff(user); return all(); },
    async save(user: StaffIdentity | null, input: unknown): Promise<ConsultationService> {
      const editor = requireStaff(user);
      const service = parseService(input);
      const now = new Date().toISOString();
      const values = [service.title, service.description, service.provider, service.format,
        service.durationMinutes, service.priceAgorot, service.priceConfirmed ? 1 : 0,
        service.status, service.bookingUrl, service.paymentUrl, service.paymentInstructions];
      const row = service.version === 0
        ? await db.prepare(`INSERT INTO consultation_services
          (id, title, description, provider, format, duration_minutes, price_agorot, price_confirmed, status, booking_url, payment_url, payment_instructions, created_at, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING ${columns}`)
          .bind(service.id, ...values, now, now, editor.userId).first<Row>()
        : await db.prepare(`UPDATE consultation_services SET title = ?, description = ?, provider = ?, format = ?,
          duration_minutes = ?, price_agorot = ?, price_confirmed = ?, status = ?, booking_url = ?, payment_url = ?, payment_instructions = ?,
          updated_at = ?, updated_by = ?, version = version + 1 WHERE id = ? AND version = ? RETURNING ${columns}`)
          .bind(...values, now, editor.userId, service.id, service.version).first<Row>();
      if (row) return fromRow(row);
      const current = await get(service.id);
      if (!current) throw new ServiceError('השירות לא נמצא. טענו מחדש את רשימת השירותים.', 404);
      throw new ServiceError('השירות השתנה מאז שפתחתם אותו. טענו את הגרסה השמורה לפני עריכה נוספת.', 409, current);
    },
  };
}
