const SPECIAL: Record<string, string> = {
  ø: 'o',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
  ħ: 'h',
};

/** "Český Krumlov" → "cesky-krumlov" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[øæœßłđðþıħ]/g, (c) => SPECIAL[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
