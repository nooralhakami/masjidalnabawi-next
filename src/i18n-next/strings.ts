import type { LangCode } from '../data/types';

/**
 * Interface texts added by «next» (the ported src/i18n stays byte for byte as the live app's).
 * Every key in every one of the 26 languages — tests/unit/ui-strings.test.ts enforces it.
 * First-pass translations (2026-10-16): they need a native speaker's review, as the live app's did.
 */
export const NEXT_UI: Record<LangCode, Record<string, string>> = {
  ar: { recent_title: 'عمليات البحث الأخيرة', recent_clear: 'مسح' },
  en: { recent_title: 'Recent searches', recent_clear: 'Clear' },
  tr: { recent_title: 'Son aramalar', recent_clear: 'Temizle' },
  ur: { recent_title: 'حالیہ تلاشیں', recent_clear: 'صاف کریں' },
  id: { recent_title: 'Pencarian terakhir', recent_clear: 'Hapus' },
  uz: { recent_title: 'Soʻnggi qidiruvlar', recent_clear: 'Tozalash' },
  bn: { recent_title: 'সাম্প্রতিক অনুসন্ধান', recent_clear: 'মুছুন' },
  fr: { recent_title: 'Recherches récentes', recent_clear: 'Effacer' },
  fa: { recent_title: 'جستجوهای اخیر', recent_clear: 'پاک کردن' },
  ru: { recent_title: 'Недавние запросы', recent_clear: 'Очистить' },
  ms: { recent_title: 'Carian terkini', recent_clear: 'Kosongkan' },
  ha: { recent_title: 'Binciken kwanan nan', recent_clear: 'Share' },
  ml: { recent_title: 'സമീപകാല തിരയലുകൾ', recent_clear: 'മായ്ക്കുക' },
  sw: { recent_title: 'Utafutaji wa hivi karibuni', recent_clear: 'Futa' },
  ps: { recent_title: 'وروستي لټونونه', recent_clear: 'پاکول' },
  so: { recent_title: 'Raadintii u dambeysay', recent_clear: 'Tirtir' },
  ta: { recent_title: 'சமீபத்திய தேடல்கள்', recent_clear: 'அழி' },
  hi: { recent_title: 'हाल की खोजें', recent_clear: 'मिटाएँ' },
  bs: { recent_title: 'Nedavne pretrage', recent_clear: 'Obriši' },
  de: { recent_title: 'Letzte Suchen', recent_clear: 'Löschen' },
  zh: { recent_title: '最近搜索', recent_clear: '清除' },
  am: { recent_title: 'የቅርብ ጊዜ ፍለጋዎች', recent_clear: 'አጽዳ' },
  ku: { recent_title: 'Lêgerînên dawî', recent_clear: 'Paqij bike' },
  az: { recent_title: 'Son axtarışlar', recent_clear: 'Təmizlə' },
  th: { recent_title: 'การค้นหาล่าสุด', recent_clear: 'ล้าง' },
  es: { recent_title: 'Búsquedas recientes', recent_clear: 'Borrar' },
};

/**
 * The prayer on the Prophet ﷺ in the stories: Arabic in every language (the meaning is translated
 * beside it, key st_pray_meaning), word for word as in the live app's ui/stories.ts.
 */
export const SALAWAT_AR = 'اللهم صل وسلم على نبينا محمد';
