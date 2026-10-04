import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AccountProfile = {
  id: string;
  display_name: string;
  effort_mode: 'RPE' | 'RIR';
  version: number;
};
export type ProfileInput = Pick<AccountProfile, 'display_name' | 'effort_mode'>;

export function validateProfile(input: ProfileInput): ProfileInput {
  const name = input.display_name.trim();
  if (!name || name.length > 100) throw new Error('יש להזין שם באורך 1–100 תווים.');
  if (input.effort_mode !== 'RPE' && input.effort_mode !== 'RIR') throw new Error('סולם מאמץ לא תקין.');
  // An explicit allowlist excludes roles, program assignment and medical clearance.
  return { display_name: name, effort_mode: input.effort_mode };
}

export function validAccountConfig(url: string, key: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
      !parsed.search && !parsed.hash && parsed.pathname === '/' &&
      /^[a-z0-9]+\.supabase\.co$/.test(parsed.hostname) &&
      /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  } catch { return false; }
}

export function createAccountClient(url: string, key: string) {
  if (!validAccountConfig(url, key)) throw new Error('הגדרות חיבור החשבון אינן תקינות.');
  return createClient(url, key, { auth: {
    persistSession: false, autoRefreshToken: true, detectSessionInUrl: false,
  } });
}

export class AccountService {
  constructor(private client: SupabaseClient) {}

  async signIn(email: string, password: string): Promise<string> {
    const { data, error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user || data.user.is_anonymous) throw new Error('לא ניתן להתחבר. בדקו את פרטי ההתחברות ואישור הדוא״ל.');
    return data.user.id;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw new Error('לא ניתן להשלים יציאה מהחשבון. נסו שוב.');
  }

  private async owner(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) throw new Error('נדרשת התחברות מחדש.');
    return data.user.id;
  }

  async load(): Promise<AccountProfile | null> {
    const id = await this.owner();
    const { data, error } = await this.client.from('doctorcoach_profiles')
      .select('id,display_name,effort_mode,version').eq('id', id).maybeSingle();
    if (error) throw new Error('לא ניתן לטעון פרופיל. לא נעשה שימוש בנתוני הדמו.');
    return data as AccountProfile | null;
  }

  async save(input: ProfileInput, expectedVersion: number | null): Promise<AccountProfile> {
    const values = validateProfile(input);
    const id = await this.owner();
    const table = this.client.from('doctorcoach_profiles');
    const request = expectedVersion === null ? table.insert({ id, ...values }) :
      table.update(values).eq('id', id).eq('version', expectedVersion);
    const { data, error } = await request.select('id,display_name,effort_mode,version').maybeSingle();
    if (error?.code === '23505' || (!error && !data)) throw new Error('הפרופיל השתנה במקביל. טענו מחדש לפני שמירה.');
    if (error || !data) throw new Error('השמירה נכשלה. השינויים לא אושרו בשרת.');
    return data as AccountProfile;
  }
}
