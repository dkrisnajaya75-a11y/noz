import { Gender, GenderStyle } from '../types/badminton';

export function getGenderCardClasses(
  gender: Gender,
  style: GenderStyle,
  isSelected = false
): string {
  if (isSelected) {
    return 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30';
  }

  if (style === 'soft_bg') {
    return gender === 'M'
      ? 'bg-sky-50/85 border-sky-200/80 hover:border-sky-300'
      : 'bg-rose-50/85 border-rose-200/80 hover:border-rose-300';
  }

  if (style === 'thin_edge') {
    return gender === 'M'
      ? 'bg-white border-slate-200 border-l-2 border-l-sky-500 hover:border-slate-300'
      : 'bg-white border-slate-200 border-l-2 border-l-rose-500 hover:border-slate-300';
  }

  return 'bg-white border-slate-200 hover:border-slate-300';
}

export function getGenderLabelClasses(
  gender: Gender,
  style: GenderStyle
): string {
  if (style === 'none') {
    return 'text-slate-600 font-semibold';
  }
  return gender === 'M'
    ? 'text-sky-700 font-semibold'
    : 'text-rose-700 font-semibold';
}

export function getGenderShortLabel(gender: Gender): string {
  return gender === 'M' ? 'L' : 'P';
}

export function getGenderFullLabel(gender: Gender): string {
  return gender === 'M' ? 'Laki-laki' : 'Perempuan';
}

export const LEVEL_OPTIONS: Array<{
  level: 1 | 2 | 3;
  label: string;
  description: string;
}> = [
  {
    level: 1,
    label: 'Pemula',
    description: 'Bisa mukul',
  },
  {
    level: 2,
    label: 'Menengah',
    description: 'Bisa mukul dari ujung ke ujung',
  },
  {
    level: 3,
    label: 'Mahir',
    description: 'Bisa mukul backhand dari ujung sampai setengah lapangan',
  },
];

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Pemula',
  2: 'Menengah',
  3: 'Mahir',
};

export const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Bisa mukul',
  2: 'Bisa mukul dari ujung ke ujung',
  3: 'Bisa mukul backhand dari ujung sampai setengah lapangan',
};

export function clampLevel(level: number): 1 | 2 | 3 {
  if (!Number.isFinite(level) || level <= 1) return 1;
  if (level >= 3) return 3;
  return 2;
}
