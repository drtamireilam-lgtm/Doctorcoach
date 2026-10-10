import {Localize} from "../components/language-provider";
import { MessageCircle } from 'lucide-react';

const bookingMessage = 'שלום, אשמח לקבוע תור דרך DoctorCoach.';
const bookingUrl = `https://wa.me/972546753959?text=${encodeURIComponent(bookingMessage)}`;

export function WhatsAppBooking() {
  return (
    <Localize>{<a
      className="whatsapp-booking no-print"
      href={bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      aria-label="קביעת תור ב־WhatsApp למספר 0546753959 — נפתח בחלון חדש"
    >
      <MessageCircle size={24} aria-hidden="true" />
      <span>לקביעת תור ב־<bdi>WhatsApp</bdi></span>
    </a>}</Localize>
  );
}
