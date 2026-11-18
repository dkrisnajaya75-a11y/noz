import { Gender } from '../types/badminton';

export interface ParsedRosterLine {
  lineNumber: number;
  raw: string;
  name: string;
  gender: Gender;
  level: number;
  valid: boolean;
  error?: string;
}

const MALE_TOKENS = new Set([
  'm',
  'l',
  'laki',
  'laki-laki',
  'lakilaki',
  'pria',
  'male',
  'cowok',
  'cwk',
  'pa',
  'putra',
]);

const FEMALE_TOKENS = new Set([
  'f',
  'p',
  'perempuan',
  'wanita',
  'female',
  'cewek',
  'cw',
  'pi',
  'putri',
]);

function parseGenderToken(token: string | undefined): Gender | null {
  if (!token) return null;
  const clean = token.trim().toLowerCase();
  if (MALE_TOKENS.has(clean)) return 'M';
  if (FEMALE_TOKENS.has(clean)) return 'F';
  return null;
}

function parseLevelToken(token: string | undefined): number | null {
  if (!token) return null;
  const clean = token.trim().toLowerCase();

  // Strip common prefixes like "lv 2", "lv.2", "level 3"
  const numMatch = clean.match(/^(?:lv\.?|level)?\s*([1-3])$/);
  if (numMatch) {
    return Number(numMatch[1]);
  }

  if (clean.includes('pemula') || clean.includes('beginner') || clean === 'dasar') {
    return 1;
  }
  if (clean.includes('menengah') || clean.includes('intermediate') || clean === 'sedang') {
    return 2;
  }
  if (
    clean.includes('mahir') ||
    clean.includes('advanced') ||
    clean === 'tinggi' ||
    clean.includes('pro') ||
    clean.includes('atlet') ||
    clean === 'expert'
  ) {
    return 3;
  }

  return null;
}

/**
 * Parses pasted lines from WhatsApp notes or spreadsheets (Excel / Google Sheets).
 * Expected format per line: "Name, Gender, Level" (supports comma, tab, semicolon, or pipe).
 * Defaults: if gender omitted -> 'M' with warning? Wait: we keep gender default 'M' if 2-col or warn if invalid,
 * or better: if 3 parts: name, gender, level. If 2 parts: name + (gender or level). If 1 part: name only (L, Lv 3).
 */
export function parseRosterText(input: string): ParsedRosterLine[] {
  const rawLines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return rawLines.map((raw, idx) => {
    const lineNumber = idx + 1;
    // Strip common list prefixes like "1. ", "1) ", "- ", "• "
    const cleanedLine = raw.replace(/^(?:\d+[.)]\s*|[-•*]\s+)/, '').trim();

    // Split by tab, comma, semicolon, or pipe
    let parts = cleanedLine
      .split(/\t|,|;|\|/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Fallback: if single chunk with multiple spaces or trailing tokens like "Budi L 4"
    if (parts.length === 1) {
      const spaceTokens = cleanedLine.split(/\s+/);
      if (spaceTokens.length >= 3) {
        const last = spaceTokens[spaceTokens.length - 1];
        const secondLast = spaceTokens[spaceTokens.length - 2];
        const maybeLevel = parseLevelToken(last);
        const maybeGender = parseGenderToken(secondLast);
        if (maybeLevel !== null && maybeGender !== null) {
          parts = [
            spaceTokens.slice(0, -2).join(' '),
            secondLast,
            last,
          ];
        }
      }
    }

    // Skip obvious header rows
    const firstLower = (parts[0] ?? '').toLowerCase();
    if (
      (firstLower === 'nama' || firstLower === 'name' || firstLower === 'pemain') &&
      parts.length >= 2 &&
      (parts[1].toLowerCase().includes('gender') ||
        parts[1].toLowerCase().includes('kelamin') ||
        parts[1].toLowerCase() === 'l/p')
    ) {
      return {
        lineNumber,
        raw,
        name: '',
        gender: 'M',
        level: 2,
        valid: false,
        error: 'Baris judul dilewati',
      };
    }

    const name = (parts[0] ?? '').trim();
    if (!name) {
      return {
        lineNumber,
        raw,
        name: '',
        gender: 'M',
        level: 2,
        valid: false,
        error: 'Nama pemain kosong',
      };
    }

    let gender: Gender = 'M';
    let level = 2;

    if (parts.length >= 2) {
      const g1 = parseGenderToken(parts[1]);
      const l1 = parseLevelToken(parts[1]);

      if (g1 !== null) {
        gender = g1;
        if (parts[2] !== undefined) {
          const l2 = parseLevelToken(parts[2]);
          if (l2 !== null) {
            level = l2;
          } else {
            return {
              lineNumber,
              raw,
              name,
              gender,
              level: 2,
              valid: false,
              error: `Level "${parts[2]}" harus 1–3 atau Pemula/Menengah/Mahir`,
            };
          }
        }
      } else if (l1 !== null && parts.length === 2) {
        level = l1;
      } else {
        // Also check if parts[2] is gender and parts[1] is level
        const g2 = parseGenderToken(parts[2]);
        if (l1 !== null && g2 !== null) {
          level = l1;
          gender = g2;
        } else {
          return {
            lineNumber,
            raw,
            name,
            gender: 'M',
            level: 2,
            valid: false,
            error: `Format gender "${parts[1]}" tidak dikenali (gunakan L/P atau M/F)`,
          };
        }
      }
    }

    return {
      lineNumber,
      raw,
      name,
      gender,
      level,
      valid: true,
    };
  });
}
