import type { LangCode } from '../data/types';
import { getLang, t } from '../i18n';

/**
 * Interface texts added by «next» (the ported src/i18n stays byte for byte as the live app's).
 * Every key in every one of the 26 languages — tests/unit/ui-strings.test.ts enforces it.
 * Translations accepted as they are by the owner (2026-10-16): no native speaker's review needed.
 */
export const NEXT_UI: Record<LangCode, Record<string, string>> = {
  ar: { recent_title: 'عمليات البحث الأخيرة', recent_clear: 'مسح', map_fail: 'تعذّر عرض الخريطة على هذا الجهاز', retry: 'إعادة المحاولة', route_none: 'لم نجد طريقاً إلى هذا المكان من موقعك', contrast_more: 'وضع الشمس: تباين أعلى', admin_pass: 'كلمة السر', admin_enter: 'دخول', admin_wrong: 'كلمة السر غير صحيحة' },
  en: { recent_title: 'Recent searches', recent_clear: 'Clear', map_fail: 'The map could not be shown on this device', retry: 'Try again', route_none: 'No route found to this place from where you are', contrast_more: 'Sun mode: higher contrast', admin_pass: 'Password', admin_enter: 'Enter', admin_wrong: 'Wrong password' },
  tr: { recent_title: 'Son aramalar', recent_clear: 'Temizle', map_fail: 'Harita bu cihazda gösterilemedi', retry: 'Tekrar dene', route_none: 'Bulunduğunuz yerden buraya bir yol bulunamadı', contrast_more: 'Güneş modu: yüksek kontrast', admin_pass: 'Şifre', admin_enter: 'Giriş', admin_wrong: 'Yanlış şifre' },
  ur: { recent_title: 'حالیہ تلاشیں', recent_clear: 'صاف کریں', map_fail: 'اس آلے پر نقشہ نہیں دکھایا جا سکا', retry: 'دوبارہ کوشش کریں', route_none: 'آپ کے مقام سے اس جگہ تک کوئی راستہ نہیں ملا', contrast_more: 'دھوپ موڈ: زیادہ کنٹراسٹ', admin_pass: 'پاس ورڈ', admin_enter: 'داخل ہوں', admin_wrong: 'غلط پاس ورڈ' },
  id: { recent_title: 'Pencarian terakhir', recent_clear: 'Hapus', map_fail: 'Peta tidak dapat ditampilkan di perangkat ini', retry: 'Coba lagi', route_none: 'Tidak ada rute ke tempat ini dari lokasi Anda', contrast_more: 'Mode matahari: kontras tinggi', admin_pass: 'Kata sandi', admin_enter: 'Masuk', admin_wrong: 'Kata sandi salah' },
  uz: { recent_title: 'Soʻnggi qidiruvlar', recent_clear: 'Tozalash', map_fail: 'Xaritani bu qurilmada koʻrsatib boʻlmadi', retry: 'Qayta urinish', route_none: 'Joylashuvingizdan bu yerga yoʻl topilmadi', contrast_more: 'Quyosh rejimi: yuqori kontrast', admin_pass: 'Parol', admin_enter: 'Kirish', admin_wrong: 'Parol notoʻgʻri' },
  bn: { recent_title: 'সাম্প্রতিক অনুসন্ধান', recent_clear: 'মুছুন', map_fail: 'এই ডিভাইসে মানচিত্র দেখানো যায়নি', retry: 'আবার চেষ্টা করুন', route_none: 'আপনার অবস্থান থেকে এখানে কোনো পথ পাওয়া যায়নি', contrast_more: 'রোদ মোড: বেশি কনট্রাস্ট', admin_pass: 'পাসওয়ার্ড', admin_enter: 'প্রবেশ', admin_wrong: 'ভুল পাসওয়ার্ড' },
  fr: { recent_title: 'Recherches récentes', recent_clear: 'Effacer', map_fail: 'La carte n’a pas pu s’afficher sur cet appareil', retry: 'Réessayer', route_none: 'Aucun itinéraire trouvé vers ce lieu depuis votre position', contrast_more: 'Mode soleil : contraste élevé', admin_pass: 'Mot de passe', admin_enter: 'Entrer', admin_wrong: 'Mot de passe incorrect' },
  fa: { recent_title: 'جستجوهای اخیر', recent_clear: 'پاک کردن', map_fail: 'نقشه در این دستگاه نمایش داده نشد', retry: 'تلاش دوباره', route_none: 'از موقعیت شما راهی به این مکان پیدا نشد', contrast_more: 'حالت آفتاب: کنتراست بیشتر', admin_pass: 'رمز عبور', admin_enter: 'ورود', admin_wrong: 'رمز عبور نادرست است' },
  ru: { recent_title: 'Недавние запросы', recent_clear: 'Очистить', map_fail: 'Не удалось показать карту на этом устройстве', retry: 'Повторить', route_none: 'Маршрут от вашего местоположения не найден', contrast_more: 'Режим солнца: высокая контрастность', admin_pass: 'Пароль', admin_enter: 'Войти', admin_wrong: 'Неверный пароль' },
  ms: { recent_title: 'Carian terkini', recent_clear: 'Kosongkan', map_fail: 'Peta tidak dapat dipaparkan pada peranti ini', retry: 'Cuba lagi', route_none: 'Tiada laluan ke tempat ini dari lokasi anda', contrast_more: 'Mod matahari: kontras tinggi', admin_pass: 'Kata laluan', admin_enter: 'Masuk', admin_wrong: 'Kata laluan salah' },
  ha: { recent_title: 'Binciken kwanan nan', recent_clear: 'Share', map_fail: 'Ba a iya nuna taswira a wannan na’ura ba', retry: 'Sake gwadawa', route_none: 'Ba a sami hanya zuwa wannan wuri daga inda kake ba', contrast_more: 'Yanayin rana: bambanci mai ƙarfi', admin_pass: 'Kalmar sirri', admin_enter: 'Shiga', admin_wrong: 'Kalmar sirri ba daidai ba ce' },
  ml: { recent_title: 'സമീപകാല തിരയലുകൾ', recent_clear: 'മായ്ക്കുക', map_fail: 'ഈ ഉപകരണത്തിൽ മാപ്പ് കാണിക്കാനായില്ല', retry: 'വീണ്ടും ശ്രമിക്കുക', route_none: 'നിങ്ങളുടെ സ്ഥാനത്തുനിന്ന് ഇവിടേക്ക് വഴി കണ്ടെത്തിയില്ല', contrast_more: 'സൂര്യപ്രകാശ മോഡ്: ഉയർന്ന കോൺട്രാസ്റ്റ്', admin_pass: 'പാസ്‌വേഡ്', admin_enter: 'പ്രവേശിക്കുക', admin_wrong: 'തെറ്റായ പാസ്‌വേഡ്' },
  sw: { recent_title: 'Utafutaji wa hivi karibuni', recent_clear: 'Futa', map_fail: 'Ramani haikuweza kuonyeshwa kwenye kifaa hiki', retry: 'Jaribu tena', route_none: 'Hakuna njia iliyopatikana kwenda mahali hapa kutoka ulipo', contrast_more: 'Hali ya jua: utofautishaji wa juu', admin_pass: 'Nenosiri', admin_enter: 'Ingia', admin_wrong: 'Nenosiri si sahihi' },
  ps: { recent_title: 'وروستي لټونونه', recent_clear: 'پاکول', map_fail: 'نقشه په دې وسیله کې ونه ښودل شوه', retry: 'بیا هڅه وکړئ', route_none: 'ستاسو له ځای څخه دې ځای ته لاره ونه موندل شوه', contrast_more: 'د لمر حالت: لوړ توپیر', admin_pass: 'پټنوم', admin_enter: 'ننوتل', admin_wrong: 'پټنوم سم نه دی' },
  so: { recent_title: 'Raadintii u dambeysay', recent_clear: 'Tirtir', map_fail: 'Khariidadda lagama muujin karin qalabkan', retry: 'Isku day mar kale', route_none: 'Waddo looma helin meeshan laga bilaabo halka aad joogto', contrast_more: 'Habka qorraxda: kala-soocid sare', admin_pass: 'Furaha sirta', admin_enter: 'Gal', admin_wrong: 'Furaha sirta waa khalad' },
  ta: { recent_title: 'சமீபத்திய தேடல்கள்', recent_clear: 'அழி', map_fail: 'இந்தச் சாதனத்தில் வரைபடத்தைக் காட்ட முடியவில்லை', retry: 'மீண்டும் முயலவும்', route_none: 'உங்கள் இடத்திலிருந்து இங்கு வழி கிடைக்கவில்லை', contrast_more: 'சூரிய ஒளி பயன்முறை: அதிக மாறுபாடு', admin_pass: 'கடவுச்சொல்', admin_enter: 'நுழை', admin_wrong: 'தவறான கடவுச்சொல்' },
  hi: { recent_title: 'हाल की खोजें', recent_clear: 'मिटाएँ', map_fail: 'इस डिवाइस पर नक्शा नहीं दिखाया जा सका', retry: 'फिर से कोशिश करें', route_none: 'आपकी जगह से यहाँ तक कोई रास्ता नहीं मिला', contrast_more: 'धूप मोड: अधिक कंट्रास्ट', admin_pass: 'पासवर्ड', admin_enter: 'प्रवेश करें', admin_wrong: 'गलत पासवर्ड' },
  bs: { recent_title: 'Nedavne pretrage', recent_clear: 'Obriši', map_fail: 'Mapa se nije mogla prikazati na ovom uređaju', retry: 'Pokušaj ponovo', route_none: 'Nije pronađen put do ovog mjesta s vaše lokacije', contrast_more: 'Sunčani način: jači kontrast', admin_pass: 'Lozinka', admin_enter: 'Uđi', admin_wrong: 'Pogrešna lozinka' },
  de: { recent_title: 'Letzte Suchen', recent_clear: 'Löschen', map_fail: 'Die Karte konnte auf diesem Gerät nicht angezeigt werden', retry: 'Erneut versuchen', route_none: 'Kein Weg von Ihrem Standort zu diesem Ort gefunden', contrast_more: 'Sonnenmodus: hoher Kontrast', admin_pass: 'Passwort', admin_enter: 'Anmelden', admin_wrong: 'Falsches Passwort' },
  zh: { recent_title: '最近搜索', recent_clear: '清除', map_fail: '无法在此设备上显示地图', retry: '重试', route_none: '未找到从您所在位置到此处的路线', contrast_more: '阳光模式：高对比度', admin_pass: '密码', admin_enter: '进入', admin_wrong: '密码错误' },
  am: { recent_title: 'የቅርብ ጊዜ ፍለጋዎች', recent_clear: 'አጽዳ', map_fail: 'ካርታው በዚህ መሣሪያ ላይ ሊታይ አልቻለም', retry: 'እንደገና ሞክር', route_none: 'ከአሉበት ቦታ ወደዚህ መንገድ አልተገኘም', contrast_more: 'የፀሐይ ሁነታ፡ ከፍተኛ ንፅፅር', admin_pass: 'የይለፍ ቃል', admin_enter: 'ግባ', admin_wrong: 'የተሳሳተ የይለፍ ቃል' },
  ku: { recent_title: 'Lêgerînên dawî', recent_clear: 'Paqij bike', map_fail: 'Nexşe li ser vê amûrê nehat nîşandan', retry: 'Dîsa biceribîne', route_none: 'Ji cihê te heta vir rê nehat dîtin', contrast_more: 'Moda rojê: kontrasta bilind', admin_pass: 'Şîfre', admin_enter: 'Têkeve', admin_wrong: 'Şîfre şaş e' },
  az: { recent_title: 'Son axtarışlar', recent_clear: 'Təmizlə', map_fail: 'Xəritə bu cihazda göstərilə bilmədi', retry: 'Yenidən cəhd et', route_none: 'Olduğunuz yerdən buraya yol tapılmadı', contrast_more: 'Günəş rejimi: yüksək kontrast', admin_pass: 'Parol', admin_enter: 'Daxil ol', admin_wrong: 'Parol səhvdir' },
  th: { recent_title: 'การค้นหาล่าสุด', recent_clear: 'ล้าง', map_fail: 'ไม่สามารถแสดงแผนที่บนอุปกรณ์นี้ได้', retry: 'ลองอีกครั้ง', route_none: 'ไม่พบเส้นทางจากตำแหน่งของคุณมายังที่นี่', contrast_more: 'โหมดแดดจ้า: คอนทราสต์สูง', admin_pass: 'รหัสผ่าน', admin_enter: 'เข้าสู่ระบบ', admin_wrong: 'รหัสผ่านไม่ถูกต้อง' },
  es: { recent_title: 'Búsquedas recientes', recent_clear: 'Borrar', map_fail: 'No se pudo mostrar el mapa en este dispositivo', retry: 'Reintentar', route_none: 'No se encontró una ruta hasta aquí desde tu ubicación', contrast_more: 'Modo sol: contraste alto', admin_pass: 'Contraseña', admin_enter: 'Entrar', admin_wrong: 'Contraseña incorrecta' },
};

/**
 * The prayer on the Prophet ﷺ in the stories: Arabic in every language (the meaning is translated
 * beside it, key st_pray_meaning), word for word as in the live app's ui/stories.ts.
 */
export const SALAWAT_AR = 'اللهم صل وسلم على نبينا محمد';

/** A text from «next» in the current language (or the live app's, for its own keys): for code outside components. */
export function tNext(key: string, vars?: Record<string, string | number>): string {
  const v = NEXT_UI[getLang()]?.[key] ?? NEXT_UI.en[key];
  if (v === undefined) return t(key, vars);
  return vars ? v.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : v;
}
