export interface IcalMatch {
  opponent: string;
  date: string;      // YYYY-MM-DD
  time?: string;     // HH:MM
  location?: string;
}

export interface IcalCalendar {
  teamName: string;
  matches: IcalMatch[];
}

/** Unfold iCal line continuations: CRLF/LF followed by a space or tab */
function unfoldLines(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

/**
 * Parse a DTSTART value like "20260530T170000" or "20260530T170000Z".
 * The caller should already have stripped TZID parameters so only the bare
 * value is passed in.
 */
function parseDate(value: string): { date: string; time?: string } {
  const clean = value.replace(/Z$/, '').trim();
  if (clean.includes('T')) {
    const [d, t] = clean.split('T');
    return {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      time: `${t.slice(0, 2)}:${t.slice(2, 4)}`,
    };
  }
  return {
    date: `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`,
  };
}

/**
 * Parse an iCal text and return the calendar name and future matches.
 * @param text   Raw iCal content
 * @param today  ISO date string (YYYY-MM-DD) — matches before this date are excluded
 */
export function parseIcal(text: string, today: string): IcalCalendar {
  const lines = unfoldLines(text).split(/\r?\n/);

  // Extract calendar / team name from X-WR-CALNAME
  let teamName = '';
  for (const line of lines) {
    if (line.startsWith('X-WR-CALNAME:')) {
      teamName = line.slice('X-WR-CALNAME:'.length).trim();
      break;
    }
  }

  const matches: IcalMatch[] = [];
  let inEvent = false;
  let event: Record<string, string> = {};

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      event = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;

      const dtstart = event['DTSTART'];
      const summary = event['SUMMARY'];
      if (!dtstart || !summary) continue;

      const { date, time } = parseDate(dtstart);

      // Only include matches that haven't been played yet
      if (date < today) continue;

      // Determine opponent from "HomeTeam - AwayTeam" in SUMMARY
      let opponent = summary;
      const dashIdx = summary.indexOf(' - ');
      if (dashIdx > -1 && teamName) {
        const home = summary.slice(0, dashIdx).trim();
        const away = summary.slice(dashIdx + 3).trim();
        const tl = teamName.toLowerCase();
        // Our team is the one whose name is contained in — or contains — the CALNAME
        if (home.toLowerCase().includes(tl) || tl.includes(home.toLowerCase())) {
          opponent = away;
        } else {
          opponent = home;
        }
      }

      matches.push({
        opponent,
        date,
        time,
        location: event['LOCATION']?.trim() || undefined,
      });
    } else if (inEvent) {
      const ci = line.indexOf(':');
      if (ci > 0) {
        // Strip parameters like TZID= from the key (e.g. "DTSTART;TZID=Europe/Oslo")
        event[line.slice(0, ci).split(';')[0]] = line.slice(ci + 1);
      }
    }
  }

  return { teamName, matches };
}

/**
 * Fetch iCal data from a fotball.no URL.
 * Tries a direct fetch first, then falls back to a CORS proxy.
 */
export async function fetchIcal(url: string): Promise<string> {
  // Direct fetch (works in dev with a proxy plugin, or if fotball.no ever adds CORS headers)
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const text = await resp.text();
      if (text.includes('BEGIN:VCALENDAR')) return text;
    }
  } catch {
    // CORS error or network error — fall through to proxy
  }

  // CORS proxy fallback
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`Kunne ikke hente kalenderen (HTTP ${resp.status})`);
  const text = await resp.text();
  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error('Lenken ser ikke ut til å peke på en gyldig fotball.no-kalender');
  }
  return text;
}
