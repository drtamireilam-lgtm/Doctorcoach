import { getRawDb } from '../../../db/raw';
import { servicesStore } from '../../../lib/services-store';
import { privateJson } from '../../../lib/private-json';
import { apiError } from '../../../lib/api-helpers';

export async function GET() {
  try { return privateJson({ services: await servicesStore(getRawDb()).listPublic() }); }
  catch (error) { return apiError(error); }
}
