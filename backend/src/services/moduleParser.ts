import { Tier, Subtype } from '../types';

export interface ParsedModule {
  code: string;
  width: number;
  name: string;
  annotations: string[];
  isCorner: boolean;
  subtype: Subtype;
}

// Prefix → subtype mapping. Longer prefixes checked first to avoid
// "С" matching before "СК2", "СЯШ", etc.
const PREFIX_SUBTYPE: Array<{ prefix: string; subtype: Subtype }> = [
  { prefix: 'ГВПГУ', subtype: 'corner' },
  { prefix: 'ГВПГ', subtype: 'standard' },
  { prefix: 'ГПГУ', subtype: 'corner' },
  { prefix: 'ГПГ', subtype: 'standard' },
  { prefix: 'ВПГ', subtype: 'standard' },
  { prefix: 'ВПУ', subtype: 'corner' },
  { prefix: 'ВП', subtype: 'standard' },
  { prefix: 'ПНС', subtype: 'with_oven_microwave' },
  { prefix: 'ПН', subtype: 'standard' },
  { prefix: 'ПГ', subtype: 'standard' },
  { prefix: 'ПУ', subtype: 'corner' },
  { prefix: 'СЯШ', subtype: 'drawer' },
  { prefix: 'СК2', subtype: 'combo' },
  { prefix: 'СДШ', subtype: 'oven' },
  { prefix: 'СМ', subtype: 'sink' },
  { prefix: 'СУ', subtype: 'corner' },
  { prefix: 'СБ', subtype: 'filler' },
  { prefix: 'С', subtype: 'standard' },
  { prefix: 'П', subtype: 'standard' },
];

// Directory name → tier mapping (order matters: more specific patterns first)
const DIR_TIER_MAP: Array<{ pattern: RegExp; tier: Tier }> = [
  { pattern: /нижние модули/i, tier: 'lower' },
  { pattern: /мойка/i, tier: 'lower' },
  { pattern: /плита/i, tier: 'lower' },
  { pattern: /пеналы/i, tier: 'pantry' },
  { pattern: /высок.*верхн.*90|ВП\s*-/i, tier: 'upper_tall' },
  { pattern: /антресоли.*45.*глубок|ГВПГ/i, tier: 'antresol_45_deep' },
  { pattern: /антресоли.*35.*глубок|ГПГ/i, tier: 'antresol_35_deep' },
  { pattern: /антресоли.*45|ВПГ/i, tier: 'antresol_45' },
  { pattern: /антресоли.*35|ПГ\s*-/i, tier: 'antresol_35' },
  { pattern: /верхний шкаф|П-верхний/i, tier: 'upper' },
];

export function parseFilename(filename: string): ParsedModule {
  // Normalize to NFC (macOS uses NFD for filenames)
  const name = filename.replace(/\.glb$/i, '').normalize('NFC');

  // Extract annotations from parentheses
  const annotations: string[] = [];
  const parenMatches = name.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const m of parenMatches) {
      annotations.push(m.replace(/[()]/g, '').trim());
    }
  }

  // Extract "с ..." phrases (e.g., "с Духовкой", "с духовкой и микроволновкой")
  const withMatch = name.match(/\s+с\s+(.+?)(?:\s*\(|$)/i);
  if (withMatch) {
    annotations.push('с ' + withMatch[1].trim());
  }

  // Detect corner from annotations or name patterns
  const isCorner = annotations.some(a => /углов/i.test(a))
    || /угловой/i.test(name)
    || /У\s*\d/.test(name.replace(/СУ|ПУ|ВПУ|ГПГУ|ГВПГУ/, ''));

  // Match prefix code first (longest prefix match)
  let code = '';
  let subtype: Subtype = 'standard';
  const nameClean = name.replace(/\(.*?\)/g, '').trim();

  for (const entry of PREFIX_SUBTYPE) {
    const re = new RegExp(`^${entry.prefix}(?:\\s|$)`);
    if (re.test(nameClean)) {
      code = entry.prefix;
      subtype = entry.subtype;
      break;
    }
  }

  // Fallback: take first word as code
  if (!code) {
    code = nameClean.split(/\s/)[0];
  }

  // Extract width: find the number AFTER the prefix code (skip digits inside prefix like "СК2")
  const afterCode = nameClean.slice(code.length).trim();
  // Remove annotations like "- угловой" before looking for width
  const cleanedAfterCode = afterCode.replace(/-\s*[а-яА-Я].*$/i, '').trim();
  const widthMatch = cleanedAfterCode.match(/(\d+)/);
  let width = widthMatch ? parseInt(widthMatch[1], 10) : 0;

  // Normalize "601" → 600 (naming convention in filenames, not actual width)
  if (width === 601) width = 600;

  // Special case: "ПН 600 с Духовкой" → with_oven
  if (code === 'ПН' && annotations.some(a => /духовк/i.test(a)) && !annotations.some(a => /микроволн/i.test(a))) {
    subtype = 'with_oven';
  }

  return { code, width, name, annotations, isCorner, subtype };
}

export function tierFromDirPath(dirPath: string): Tier {
  // Normalize to NFC (macOS returns NFD filenames)
  const normalized = dirPath.normalize('NFC');
  for (const entry of DIR_TIER_MAP) {
    if (entry.pattern.test(normalized)) {
      return entry.tier;
    }
  }
  return 'lower'; // default fallback
}

/**
 * Generate a URL-safe slug from a catalog folder name
 * e.g., "Каталог Рояль Мебелей" → "katalog-royal-mebelej" (simplified)
 */
export function slugify(name: string): string {
  // Cyrillic → Latin transliteration (simplified)
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  };

  return name
    .toLowerCase()
    .split('')
    .map(ch => map[ch] || ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
