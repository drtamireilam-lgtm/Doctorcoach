import type {Metadata} from 'next';
import {AccountDeletionPage} from '../../components/account-deletion-page';

export const metadata:Metadata={title:'DoctorCoach | בקשת מחיקת חשבון',description:'בקשת מחיקת חשבון ונתונים ב־DoctorCoach, מעקב אחר הבקשה ויצירת קשר עם הצוות.'};
export const dynamic='force-dynamic';
export default function Page(){return <AccountDeletionPage/>;}
