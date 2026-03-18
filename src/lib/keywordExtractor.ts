/**
 * keywordExtractor — Simple word-frequency keyword extraction.
 * Extracts top N most frequent meaningful words from text.
 */

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','it','its','this','that','these','those','are','was','were','be',
  'been','being','have','has','had','do','does','did','will','would','could',
  'should','may','might','can','shall','not','no','nor','so','if','then',
  'than','too','very','just','about','above','after','again','all','also',
  'am','as','because','before','between','both','during','each','few','further',
  'get','got','here','how','i','into','me','more','most','my','need','new',
  'now','only','other','our','out','over','own','same','she','he','they','we',
  'what','when','where','which','while','who','whom','why','you','your','up',
  'down','want','like','make','such','some','any','there','their','them','us',
  'well','way','use','used','using','try','tried','work','working','based',
  'etc','via','per','already','still','also','must','much','many','may',
  'describe','solution','solve','challenge','problem','impact','tried','far',
  'core','business','want','expect','successful',
]);

/**
 * Extract top keywords by frequency from text.
 * Returns lowercase keywords sorted by frequency (descending).
 */
export function extractKeywords(text: string, topN = 5): string[] {
  if (!text || text.length < 100) return [];

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Match extracted keywords against a list of domain tags.
 * Returns tags where any keyword appears in the tag name (case-insensitive).
 */
export function matchTagsByKeywords(
  keywords: string[],
  availableTags: string[],
  alreadySelected: string[],
): string[] {
  if (keywords.length === 0) return [];

  return availableTags.filter(tag => {
    if (alreadySelected.includes(tag)) return false;
    const tagLower = tag.toLowerCase();
    return keywords.some(kw => tagLower.includes(kw) || kw.includes(tagLower.replace(/[^a-z]/g, '')));
  });
}
