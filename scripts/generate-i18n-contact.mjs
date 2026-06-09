/**
 * Generates src/lib/i18n-contact.ts — run: node scripts/generate-i18n-contact.mjs
 */
import { writeFileSync } from 'fs'

const LOCALES = [
  'nl', 'en', 'fr', 'de', 'es', 'pt', 'it', 'gr', 'pl', 'cz', 'sk', 'hu', 'ro', 'bg',
  'hr', 'sr', 'ba', 'me', 'sq', 'mk', 'lt', 'da', 'sv', 'nb', 'fi', 'uk', 'ru', 'tr',
  'he', 'eg', 'at', 'ps', 'ma', 'ka', 'hy', 'dz', 'az', 'ja', 'zh',
]

const EN = {
  'contact.hero.title': 'Get in touch',
  'contact.hero.subtitle': 'Reach the {siteName} team for support, partnerships, or account help.',
  'contact.info.email': 'E-mail',
  'contact.info.hours': 'Daily opening hours',
  'contact.info.hoursValue': '08:00 – 20:00 CET',
  'contact.info.secure': 'Secure',
  'contact.info.secureValue': 'Encrypted orders and payments',
  'contact.form.title': 'Send a message',
  'contact.form.name': 'Name',
  'contact.form.email': 'Email',
  'contact.form.subject': 'Subject',
  'contact.form.subjectPlaceholder': 'Order help, seller inquiry, …',
  'contact.form.message': 'Message',
  'contact.form.submitEmail': 'Open in email',
  'contact.form.submit': 'Submit',
  'contact.form.noEmailNote':
    'Your message was noted. Support email is not configured yet — an administrator can add it under Admin → Settings.',
  'contact.form.openEmailNote': 'Your email client should open with your message ready to send.',
  'contact.faq.title': 'Frequently asked questions',
  'contact.faq.q1': 'How and when do I receive a product after purchase?',
  'contact.faq.a1':
    'After you have placed your order we will send you a payment link. After you have made the payment you will receive your product(s) within the mentioned standard delivery time.',
  'contact.faq.q2': 'Can I exchange or return a product?',
  'contact.faq.a2': 'No, that is not possible.',
  'contact.faq.q3': 'Can I get a refund?',
  'contact.faq.a3':
    'Products are generally non-refundable once purchased. Contact our sales support team with your order number if something is wrong with your purchase.',
  'contact.faq.q4': 'What payment methods do you accept?',
  'contact.faq.a4':
    'We support online checkout for common european payment methods and we also accept BitCoin.',
  'contact.faq.q5': 'How do I become a seller?',
  'contact.faq.a5':
    'Use “Become a Seller” in the sidebar to register. Once approved, you can list your products for sale.',
  'contact.mailto.subject': 'Contact — {siteName}',
}

/** FAQ #2 — exchange/return policy (all locales). */
const EXCHANGE_FAQ = {
  en: { q: 'Can I exchange or return a product?', a: 'No, that is not possible.' },
  nl: { q: 'Kan ik een product ruilen of retourneren?', a: 'Nee, dat is niet mogelijk.' },
  fr: { q: 'Puis-je échanger ou retourner un produit ?', a: 'Non, ce n’est pas possible.' },
  de: { q: 'Kann ich ein Produkt umtauschen oder zurückgeben?', a: 'Nein, das ist nicht möglich.' },
  es: { q: '¿Puedo cambiar o devolver un producto?', a: 'No, no es posible.' },
  pt: { q: 'Posso trocar ou devolver um produto?', a: 'Não, isso não é possível.' },
  it: { q: 'Posso cambiare o restituire un prodotto?', a: 'No, non è possibile.' },
  gr: { q: 'Μπορώ να ανταλλάξω ή να επιστρέψω ένα προϊόν;', a: 'Όχι, αυτό δεν είναι δυνατό.' },
  pl: { q: 'Czy mogę wymienić lub zwrócić produkt?', a: 'Nie, nie jest to możliwe.' },
  cz: { q: 'Mohu vyměnit nebo vrátit produkt?', a: 'Ne, není to možné.' },
  sk: { q: 'Môžem vymeniť alebo vrátiť produkt?', a: 'Nie, nie je to možné.' },
  hu: { q: 'Cserélhetek vagy visszaküldhetek egy terméket?', a: 'Nem, ez nem lehetséges.' },
  ro: { q: 'Pot schimba sau returna un produs?', a: 'Nu, acest lucru nu este posibil.' },
  bg: { q: 'Мога ли да заменя или върна продукт?', a: 'Не, това не е възможно.' },
  hr: { q: 'Mogu li zamijeniti ili vratiti proizvod?', a: 'Ne, to nije moguće.' },
  sr: { q: 'Da li mogu da zamenim ili vratim proizvod?', a: 'Ne, to nije moguće.' },
  ba: { q: 'Mogu li zamijeniti ili vratiti proizvod?', a: 'Ne, to nije moguće.' },
  me: { q: 'Mogu li zamijeniti ili vratiti proizvod?', a: 'Ne, to nije moguće.' },
  sq: { q: 'A mund të ndërroj ose të kthej një produkt?', a: 'Jo, kjo nuk është e mundur.' },
  mk: { q: 'Дали можам да заменам или да вратам производ?', a: 'Не, тоа не е можно.' },
  lt: { q: 'Ar galiu keisti arba grąžinti prekę?', a: 'Ne, tai negalima.' },
  da: { q: 'Kan jeg bytte eller returnere et produkt?', a: 'Nej, det er ikke muligt.' },
  sv: { q: 'Kan jag byta eller returnera en produkt?', a: 'Nej, det är inte möjligt.' },
  nb: { q: 'Kan jeg bytte eller returnere et produkt?', a: 'Nei, det er ikke mulig.' },
  fi: { q: 'Voinko vaihtaa tai palauttaa tuotteen?', a: 'Ei, se ei ole mahdollista.' },
  uk: { q: 'Чи можу я обміняти або повернути товар?', a: 'Ні, це неможливо.' },
  ru: { q: 'Могу ли я обменять или вернуть товар?', a: 'Нет, это невозможно.' },
  tr: { q: 'Bir ürünü değiştirebilir veya iade edebilir miyim?', a: 'Hayır, bu mümkün değildir.' },
  he: { q: 'האם ניתן להחליף או להחזיר מוצר?', a: 'לא, זה אינו אפשרי.' },
  eg: { q: 'هل يمكنني استبدال منتج أو إرجاعه؟', a: 'لا، ذلك غير ممكن.' },
  at: { q: 'هل يمكنني استبدال منتج أو إرجاعه؟', a: 'لا، ذلك غير ممكن.' },
  ps: { q: 'هل يمكنني استبدال منتج أو إرجاعه؟', a: 'لا، ذلك غير ممكن.' },
  ma: { q: 'هل يمكنني استبدال منتج أو إرجاعه؟', a: 'لا، ذلك غير ممكن.' },
  dz: { q: 'هل يمكنني استبدال منتج أو إرجاعه؟', a: 'لا، ذلك غير ممكن.' },
  ka: { q: 'შემიძლია პროდუქტის გაცვლა ან დაბრუნება?', a: 'არა, ეს არ არის შესაძლებელი.' },
  hy: { q: 'Կարո՞ղ եմ փոխանակել կամ վերադարձնել ապրանքը', a: 'Ոչ, դա հնարավոր չէ։' },
  az: { q: 'Məhsulu dəyişdirə və ya geri qaytara bilərəmmi?', a: 'Xeyr, bu mümkün deyil.' },
  ja: { q: '商品の交換や返品はできますか？', a: 'いいえ、できません。' },
  zh: { q: '我可以换货或退货吗？', a: '不可以。' },
}

const PACKS = {
  en: EN,
  nl: {
    'contact.hero.title': 'Neem contact op',
    'contact.hero.subtitle':
      'Neem contact op met het {siteName}-team voor support, partnerships of account-hulp.',
    'contact.info.email': 'E-mail',
    'contact.info.hours': 'Dagelijkse openingstijden',
    'contact.info.hoursValue': '08:00 – 20:00 CET',
    'contact.info.secure': 'Veilig',
    'contact.info.secureValue': 'Versleutelde bestellingen en betalingen',
    'contact.form.title': 'Stuur een bericht',
    'contact.form.name': 'Naam',
    'contact.form.email': 'E-mail',
    'contact.form.subject': 'Onderwerp',
    'contact.form.subjectPlaceholder': 'Hulp bij bestelling, verkopersvraag, …',
    'contact.form.message': 'Bericht',
    'contact.form.submitEmail': 'Openen in e-mail',
    'contact.form.submit': 'Versturen',
    'contact.form.noEmailNote':
      'Je bericht is genoteerd. Support-e-mail is nog niet ingesteld — een beheerder kan dit toevoegen onder Admin → Instellingen.',
    'contact.form.openEmailNote': 'Je e-mailprogramma zou moeten openen met je bericht klaar om te versturen.',
    'contact.faq.title': 'Veelgestelde vragen',
    'contact.faq.q1': 'Hoe en wanneer ontvang ik een product na aankoop?',
    'contact.faq.a1':
      'Na je bestelling sturen we je een betaallink. Na betaling ontvang je jouw product(en) binnen de genoemde standaard levertijd.',
    'contact.faq.q2': EXCHANGE_FAQ.nl.q,
    'contact.faq.a2': EXCHANGE_FAQ.nl.a,
    'contact.faq.q3': 'Kan ik een terugbetaling krijgen?',
    'contact.faq.a3':
      'Producten zijn over het algemeen niet restitueerbaar na aankoop. Neem contact op met ons verkoopteam met je bestelnummer als er iets mis is.',
    'contact.faq.q4': 'Welke betaalmethoden accepteren jullie?',
    'contact.faq.a4':
      'We ondersteunen online afrekenen met gangbare Europese betaalmethoden en accepteren ook BitCoin.',
    'contact.faq.q5': 'Hoe word ik verkoper?',
    'contact.faq.a5':
      'Gebruik “Verkopen?” in het zijmenu om je te registreren. Na goedkeuring kun je producten te koop aanbieden.',
    'contact.mailto.subject': 'Contact — {siteName}',
  },
  de: {
    'contact.hero.title': 'Kontakt aufnehmen',
    'contact.hero.subtitle':
      'Erreichen Sie das {siteName}-Team für Support, Partnerschaften oder Konto-Hilfe.',
    'contact.info.hours': 'Tägliche Öffnungszeiten',
    'contact.info.secure': 'Sicher',
    'contact.info.secureValue': 'Verschlüsselte Bestellungen und Zahlungen',
    'contact.form.title': 'Nachricht senden',
    'contact.form.name': 'Name',
    'contact.form.email': 'E-Mail',
    'contact.form.subject': 'Betreff',
    'contact.form.subjectPlaceholder': 'Bestellhilfe, Verkäuferanfrage, …',
    'contact.form.message': 'Nachricht',
    'contact.form.submitEmail': 'In E-Mail öffnen',
    'contact.form.submit': 'Absenden',
    'contact.faq.title': 'Häufig gestellte Fragen',
    'contact.faq.q1': 'Wie und wann erhalte ich ein Produkt nach dem Kauf?',
    'contact.faq.q2': EXCHANGE_FAQ.de.q,
    'contact.faq.a2': EXCHANGE_FAQ.de.a,
    'contact.faq.q3': 'Kann ich eine Rückerstattung erhalten?',
    'contact.faq.q4': 'Welche Zahlungsmethoden akzeptieren Sie?',
    'contact.faq.q5': 'Wie werde ich Verkäufer?',
    'contact.mailto.subject': 'Kontakt — {siteName}',
  },
  fr: {
    'contact.hero.title': 'Nous contacter',
    'contact.hero.subtitle':
      "Contactez l'équipe {siteName} pour le support, les partenariats ou l'aide au compte.",
    'contact.info.hours': "Heures d'ouverture",
    'contact.form.title': 'Envoyer un message',
    'contact.faq.title': 'Questions fréquentes',
    'contact.mailto.subject': 'Contact — {siteName}',
  },
  es: {
    'contact.hero.title': 'Ponte en contacto',
    'contact.form.title': 'Enviar un mensaje',
    'contact.faq.title': 'Preguntas frecuentes',
    'contact.mailto.subject': 'Contacto — {siteName}',
  },
  pt: {
    'contact.hero.title': 'Entre em contacto',
    'contact.form.title': 'Enviar mensagem',
    'contact.faq.title': 'Perguntas frequentes',
  },
  it: {
    'contact.hero.title': 'Contattaci',
    'contact.form.title': 'Invia un messaggio',
    'contact.faq.title': 'Domande frequenti',
  },
  ar: {
    'contact.hero.title': 'تواصل معنا',
    'contact.form.title': 'إرسال رسالة',
    'contact.faq.title': 'الأسئلة الشائعة',
  },
  ru: {
    'contact.hero.title': 'Связаться с нами',
    'contact.form.title': 'Отправить сообщение',
    'contact.faq.title': 'Часто задаваемые вопросы',
  },
  ja: {
    'contact.hero.title': 'お問い合わせ',
    'contact.form.title': 'メッセージを送る',
    'contact.faq.title': 'よくある質問',
  },
  zh: {
    'contact.hero.title': '联系我们',
    'contact.form.title': '发送消息',
    'contact.faq.title': '常见问题',
  },
  tr: {
    'contact.hero.title': 'İletişime geçin',
    'contact.form.title': 'Mesaj gönder',
    'contact.faq.title': 'Sık sorulan sorular',
  },
  pl: {
    'contact.hero.title': 'Skontaktuj się',
    'contact.form.title': 'Wyślij wiadomość',
    'contact.faq.title': 'Często zadawane pytania',
  },
  gr: {
    'contact.hero.title': 'Επικοινωνήστε μαζί μας',
    'contact.form.title': 'Στείλτε μήνυμα',
    'contact.faq.title': 'Συχνές ερωτήσεις',
  },
}

const LOCALE_FALLBACK = {
  cz: 'de', sk: 'de', hu: 'de', ro: 'de', bg: 'de',
  hr: 'de', sr: 'de', ba: 'de', me: 'de', sq: 'de', mk: 'de', lt: 'de',
  da: 'de', sv: 'de', nb: 'de', fi: 'de',
  uk: 'ru', he: 'en', ka: 'en', hy: 'en',
  eg: 'ar', at: 'ar', ps: 'ar', ma: 'ar', dz: 'ar', az: 'tr',
}

function resolvePack(locale) {
  const exchange = EXCHANGE_FAQ[locale] ?? EXCHANGE_FAQ.en
  const dedicated = PACKS[locale]
  const base = dedicated ? { ...EN, ...dedicated } : null
  if (base) {
    return {
      ...base,
      'contact.faq.q2': exchange.q,
      'contact.faq.a2': exchange.a,
    }
  }
  const fb = LOCALE_FALLBACK[locale]
  if (fb && PACKS[fb]) {
    const merged = { ...EN, ...PACKS[fb] }
    const exchangeFb = EXCHANGE_FAQ[locale] ?? EXCHANGE_FAQ[fb] ?? EXCHANGE_FAQ.en
    return {
      ...merged,
      'contact.faq.q2': exchangeFb.q,
      'contact.faq.a2': exchangeFb.a,
    }
  }
  return {
    ...EN,
    'contact.faq.q2': exchange.q,
    'contact.faq.a2': exchange.a,
  }
}

const keys = Object.keys(EN)
let out = "import type { Locale } from '@/lib/i18n-locale-registry'\n\n"
out += 'export type ContactMessageKey =\n'
keys.forEach((k, i) => {
  out += `  | '${k}'${i < keys.length - 1 ? '\n' : '\n\n'}`
})
out += 'type ContactMessages = Record<ContactMessageKey, string>\n\n'
out += 'const EN: ContactMessages = ' + JSON.stringify(EN, null, 2) + '\n\n'
out += 'const BY_LOCALE: Partial<Record<Locale, ContactMessages>> = {\n  en: EN,\n'
for (const loc of LOCALES) {
  if (loc === 'en') continue
  out += `  ${loc}: ${JSON.stringify(resolvePack(loc))},\n`
}
out += '}\n\nexport function getContactMessages(locale: Locale): ContactMessages {\n  return BY_LOCALE[locale] ?? EN\n}\n'

writeFileSync('src/lib/i18n-contact.ts', out)
console.log(`Generated i18n-contact.ts (${keys.length} keys × ${LOCALES.length} locales)`)
