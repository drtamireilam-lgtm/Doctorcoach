import {env} from 'cloudflare:workers';
import {getRawDb} from '../db/raw';
import {googleCalendarStore} from './google-calendar';
export const calendarConfig=()=>({clientId:env.DOCTORCOACH_CALENDAR_CLIENT_ID,ownerEmail:env.DOCTORCOACH_CALENDAR_OWNER_EMAIL,encryptionKey:env.DOCTORCOACH_CALENDAR_ENCRYPTION_KEY,adminEmails:env.DOCTORCOACH_ADMIN_EMAILS,origin:env.DC_AUTH_ORIGIN,calendarId:env.DOCTORCOACH_CALENDAR_ID});
export const serverCalendar=()=>googleCalendarStore(getRawDb(),calendarConfig());
