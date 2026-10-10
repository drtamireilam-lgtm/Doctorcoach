declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DOCTORCOACH_ADMIN_EMAILS?: string;
    DOCTORCOACH_CLINICIAN_EMAILS?: string;
  }
}
