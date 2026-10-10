import {Localize} from "../components/language-provider";
import { Camera, ArrowUpLeft } from 'lucide-react';

const profiles = [
  { name: 'ד״ר תמיר עילם', handle: 'dr.tamireilam' },
  { name: 'נדב רון', handle: 'nadav.ron' },
  { name: 'ליאור זליקסון', handle: 'liorzelikson' },
];

export function InstagramLinks() {
  return (
    <Localize>{<nav className="instagram-links" aria-label="האינסטגרם של הצוות">
      <p className="instagram-heading"><Camera size={22} aria-hidden="true" />האינסטגרם שלנו</p>
      <div className="instagram-profiles">
        {profiles.map(profile => (
          <a
            key={profile.handle}
            className="instagram-profile"
            href={`https://www.instagram.com/${profile.handle}/`}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            aria-label={`האינסטגרם של ${profile.name} — נפתח בחלון חדש`}
          >
            <div><strong>{profile.name}</strong><bdi dir="ltr">@{profile.handle}</bdi></div>
            <ArrowUpLeft size={18} aria-hidden="true" />
          </a>
        ))}
      </div>
    </nav>}</Localize>
  );
}
