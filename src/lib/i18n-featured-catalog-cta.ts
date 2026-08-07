import type { Locale } from '@/lib/i18n-locale-registry'

export type FeaturedCatalogCtaMessageKey =
  | 'shop.featuredCatalog.needAllTitle'
  | 'shop.featuredCatalog.body'
  | 'shop.featuredCatalog.whatsapp'
  | 'shop.featuredCatalog.close'
  | 'shop.featuredCatalog.whatsappPrefill'
  | 'shop.badge.new'

type FeaturedCatalogCtaMessages = Record<FeaturedCatalogCtaMessageKey, string>

const EN: FeaturedCatalogCtaMessages = {
  'shop.featuredCatalog.needAllTitle': 'Need to see all {total} products?',
  'shop.featuredCatalog.body':
    'This page only shows a few products. For access to the full catalog, send us a message on WhatsApp.',
  'shop.featuredCatalog.whatsapp': 'WhatsApp',
  'shop.featuredCatalog.close': 'Close',
  'shop.featuredCatalog.whatsappPrefill':
    "Hi! I'd like to see the full Super Clones catalog ({total} products).",
  'shop.badge.new': 'NEW',
}

const BY_LOCALE: Partial<Record<Locale, FeaturedCatalogCtaMessages>> = {
  en: EN,
  nl: {
    'shop.featuredCatalog.needAllTitle': 'Alle {total} producten bekijken?',
    'shop.featuredCatalog.body':
      'Deze pagina toont slechts een paar producten. Voor toegang tot de volledige catalogus stuur ons een bericht op WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Sluiten',
    'shop.featuredCatalog.whatsappPrefill':
      'Hoi! Ik wil graag de volledige Super Clones catalogus zien ({total} producten).',
    'shop.badge.new': 'NIEUW',
  },
  de: {
    'shop.featuredCatalog.needAllTitle': 'Alle {total} Produkte sehen?',
    'shop.featuredCatalog.body':
      'Diese Seite zeigt nur wenige Produkte. Für Zugang zum vollständigen Katalog senden Sie uns eine WhatsApp-Nachricht.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Schließen',
    'shop.featuredCatalog.whatsappPrefill':
      'Hallo! Ich möchte den vollständigen Super Clones Katalog sehen ({total} Produkte).',
    'shop.badge.new': 'NEU',
  },
  fr: {
    'shop.featuredCatalog.needAllTitle': 'Voir les {total} produits ?',
    'shop.featuredCatalog.body':
      'Cette page n’affiche que quelques produits. Pour accéder au catalogue complet, envoyez-nous un message sur WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Fermer',
    'shop.featuredCatalog.whatsappPrefill':
      'Bonjour ! Je souhaite voir le catalogue complet Super Clones ({total} produits).',
    'shop.badge.new': 'NOUVEAU',
  },
  es: {
    'shop.featuredCatalog.needAllTitle': '¿Ver los {total} productos?',
    'shop.featuredCatalog.body':
      'Esta página solo muestra algunos productos. Para acceder al catálogo completo, envíanos un mensaje por WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Cerrar',
    'shop.featuredCatalog.whatsappPrefill':
      '¡Hola! Me gustaría ver el catálogo completo de Super Clones ({total} productos).',
    'shop.badge.new': 'NUEVO',
  },
  pt: {
    'shop.featuredCatalog.needAllTitle': 'Ver todos os {total} produtos?',
    'shop.featuredCatalog.body':
      'Esta página mostra apenas alguns produtos. Para aceder ao catálogo completo, envie-nos uma mensagem no WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Fechar',
    'shop.featuredCatalog.whatsappPrefill':
      'Olá! Gostaria de ver o catálogo completo Super Clones ({total} produtos).',
    'shop.badge.new': 'NOVO',
  },
  it: {
    'shop.featuredCatalog.needAllTitle': 'Vuoi vedere tutti i {total} prodotti?',
    'shop.featuredCatalog.body':
      'Questa pagina mostra solo alcuni prodotti. Per accedere al catalogo completo, inviaci un messaggio su WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Chiudi',
    'shop.featuredCatalog.whatsappPrefill':
      'Ciao! Vorrei vedere il catalogo completo Super Clones ({total} prodotti).',
    'shop.badge.new': 'NUOVO',
  },
  gr: {
    'shop.featuredCatalog.needAllTitle': 'Θέλετε να δείτε και τα {total} προϊόντα;',
    'shop.featuredCatalog.body':
      'Αυτή η σελίδα εμφανίζει μόνο λίγα προϊόντα. Για πρόσβαση στον πλήρη κατάλογο, στείλτε μας μήνυμα στο WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Κλείσιμο',
    'shop.featuredCatalog.whatsappPrefill':
      'Γεια! Θα ήθελα να δω τον πλήρη κατάλογο Super Clones ({total} προϊόντα).',
    'shop.badge.new': 'ΝΕΟ',
  },
  pl: {
    'shop.featuredCatalog.needAllTitle': 'Chcesz zobaczyć wszystkie {total} produktów?',
    'shop.featuredCatalog.body':
      'Ta strona pokazuje tylko kilka produktów. Aby uzyskać dostęp do pełnego katalogu, napisz do nas na WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zamknij',
    'shop.featuredCatalog.whatsappPrefill':
      'Cześć! Chciałbym zobaczyć pełny katalog Super Clones ({total} produktów).',
    'shop.badge.new': 'NOWOŚĆ',
  },
  cz: {
    'shop.featuredCatalog.needAllTitle': 'Chcete vidět všech {total} produktů?',
    'shop.featuredCatalog.body':
      'Tato stránka zobrazuje jen několik produktů. Pro přístup k celému katalogu nám napište na WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zavřít',
    'shop.featuredCatalog.whatsappPrefill':
      'Ahoj! Chtěl bych vidět celý katalog Super Clones ({total} produktů).',
    'shop.badge.new': 'NOVÉ',
  },
  sk: {
    'shop.featuredCatalog.needAllTitle': 'Chcete vidieť všetkých {total} produktov?',
    'shop.featuredCatalog.body':
      'Táto stránka zobrazuje len niekoľko produktov. Pre prístup k celému katalógu nám napíšte na WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zavrieť',
    'shop.featuredCatalog.whatsappPrefill':
      'Ahoj! Chcel by som vidieť celý katalóg Super Clones ({total} produktov).',
    'shop.badge.new': 'NOVÉ',
  },
  hu: {
    'shop.featuredCatalog.needAllTitle': 'Megnéznéd mind a {total} terméket?',
    'shop.featuredCatalog.body':
      'Ez az oldal csak néhány terméket mutat. A teljes katalógushoz írj nekünk WhatsApp-on.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Bezárás',
    'shop.featuredCatalog.whatsappPrefill':
      'Szia! Szeretném megnézni a teljes Super Clones katalógust ({total} termék).',
    'shop.badge.new': 'ÚJ',
  },
  ro: {
    'shop.featuredCatalog.needAllTitle': 'Vrei să vezi toate cele {total} de produse?',
    'shop.featuredCatalog.body':
      'Această pagină arată doar câteva produse. Pentru acces la catalogul complet, trimite-ne un mesaj pe WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Închide',
    'shop.featuredCatalog.whatsappPrefill':
      'Bună! Aș dori să văd catalogul complet Super Clones ({total} produse).',
    'shop.badge.new': 'NOU',
  },
  bg: {
    'shop.featuredCatalog.needAllTitle': 'Искате да видите всички {total} продукта?',
    'shop.featuredCatalog.body':
      'Тази страница показва само няколко продукта. За достъп до пълния каталог ни пишете в WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Затвори',
    'shop.featuredCatalog.whatsappPrefill':
      'Здравейте! Искам да видя пълния каталог на Super Clones ({total} продукта).',
    'shop.badge.new': 'НОВО',
  },
  hr: {
    'shop.featuredCatalog.needAllTitle': 'Želite vidjeti svih {total} proizvoda?',
    'shop.featuredCatalog.body':
      'Ova stranica prikazuje samo nekoliko proizvoda. Za pristup cijelom katalogu pošaljite nam poruku na WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zatvori',
    'shop.featuredCatalog.whatsappPrefill':
      'Bok! Želio bih vidjeti cijeli Super Clones katalog ({total} proizvoda).',
    'shop.badge.new': 'NOVO',
  },
  sr: {
    'shop.featuredCatalog.needAllTitle': 'Желите да видите свих {total} производа?',
    'shop.featuredCatalog.body':
      'Ова страница приказује само неколико производа. За приступ целом каталогу пошаљите нам поруку на WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Затвори',
    'shop.featuredCatalog.whatsappPrefill':
      'Здраво! Желео бих да видим цео Super Clones каталог ({total} производа).',
    'shop.badge.new': 'НОВО',
  },
  ba: {
    'shop.featuredCatalog.needAllTitle': 'Želite vidjeti svih {total} proizvoda?',
    'shop.featuredCatalog.body':
      'Ova stranica prikazuje samo nekoliko proizvoda. Za pristup cijelom katalogu pošaljite nam poruku na WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zatvori',
    'shop.featuredCatalog.whatsappPrefill':
      'Zdravo! Želio bih vidjeti cijeli Super Clones katalog ({total} proizvoda).',
    'shop.badge.new': 'NOVO',
  },
  me: {
    'shop.featuredCatalog.needAllTitle': 'Želite vidjeti svih {total} proizvoda?',
    'shop.featuredCatalog.body':
      'Ova stranica prikazuje samo nekoliko proizvoda. Za pristup cijelom katalogu pošaljite nam poruku na WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zatvori',
    'shop.featuredCatalog.whatsappPrefill':
      'Zdravo! Želio bih vidjeti cijeli Super Clones katalog ({total} proizvoda).',
    'shop.badge.new': 'NOVO',
  },
  sq: {
    'shop.featuredCatalog.needAllTitle': 'Doni të shihni të gjitha {total} produktet?',
    'shop.featuredCatalog.body':
      'Kjo faqe tregon vetëm disa produkte. Për qasje në katalogun e plotë, na dërgoni një mesazh në WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Mbyll',
    'shop.featuredCatalog.whatsappPrefill':
      'Përshëndetje! Do të doja të shihja katalogun e plotë Super Clones ({total} produkte).',
    'shop.badge.new': 'E RE',
  },
  mk: {
    'shop.featuredCatalog.needAllTitle': 'Сакате да ги видите сите {total} производи?',
    'shop.featuredCatalog.body':
      'Оваа страница прикажува само неколку производи. За пристап до целиот каталог, испратете ни порака на WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Затвори',
    'shop.featuredCatalog.whatsappPrefill':
      'Здраво! Сакам да го видам целиот каталог на Super Clones ({total} производи).',
    'shop.badge.new': 'НОВО',
  },
  lt: {
    'shop.featuredCatalog.needAllTitle': 'Norite matyti visus {total} produktus?',
    'shop.featuredCatalog.body':
      'Šiame puslapyje rodomi tik keli produktai. Norėdami gauti visą katalogą, parašykite mums WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Uždaryti',
    'shop.featuredCatalog.whatsappPrefill':
      'Sveiki! Norėčiau pamatyti visą Super Clones katalogą ({total} produktai).',
    'shop.badge.new': 'NAUJA',
  },
  da: {
    'shop.featuredCatalog.needAllTitle': 'Vil du se alle {total} produkter?',
    'shop.featuredCatalog.body':
      'Denne side viser kun få produkter. For adgang til hele kataloget, send os en besked på WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Luk',
    'shop.featuredCatalog.whatsappPrefill':
      'Hej! Jeg vil gerne se hele Super Clones kataloget ({total} produkter).',
    'shop.badge.new': 'NY',
  },
  sv: {
    'shop.featuredCatalog.needAllTitle': 'Vill du se alla {total} produkter?',
    'shop.featuredCatalog.body':
      'Den här sidan visar bara några produkter. För tillgång till hela katalogen, skicka oss ett meddelande på WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Stäng',
    'shop.featuredCatalog.whatsappPrefill':
      'Hej! Jag vill gärna se hela Super Clones-katalogen ({total} produkter).',
    'shop.badge.new': 'NY',
  },
  nb: {
    'shop.featuredCatalog.needAllTitle': 'Vil du se alle {total} produktene?',
    'shop.featuredCatalog.body':
      'Denne siden viser bare noen få produkter. For tilgang til hele katalogen, send oss en melding på WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Lukk',
    'shop.featuredCatalog.whatsappPrefill':
      'Hei! Jeg ønsker å se hele Super Clones-katalogen ({total} produkter).',
    'shop.badge.new': 'NY',
  },
  fi: {
    'shop.featuredCatalog.needAllTitle': 'Haluatko nähdä kaikki {total} tuotetta?',
    'shop.featuredCatalog.body':
      'Tämä sivu näyttää vain muutaman tuotteen. Saadaksesi koko katalogin, lähetä meille viesti WhatsAppissa.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Sulje',
    'shop.featuredCatalog.whatsappPrefill':
      'Hei! Haluaisin nähdä koko Super Clones -katalogin ({total} tuotetta).',
    'shop.badge.new': 'UUSI',
  },
  uk: {
    'shop.featuredCatalog.needAllTitle': 'Хочете побачити всі {total} товарів?',
    'shop.featuredCatalog.body':
      'На цій сторінці показано лише кілька товарів. Для доступу до повного каталогу напишіть нам у WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Закрити',
    'shop.featuredCatalog.whatsappPrefill':
      'Привіт! Я хотів би побачити повний каталог Super Clones ({total} товарів).',
    'shop.badge.new': 'НОВЕ',
  },
  ru: {
    'shop.featuredCatalog.needAllTitle': 'Хотите увидеть все {total} товаров?',
    'shop.featuredCatalog.body':
      'На этой странице показаны только несколько товаров. Для доступа к полному каталогу напишите нам в WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Закрыть',
    'shop.featuredCatalog.whatsappPrefill':
      'Здравствуйте! Я хотел бы увидеть полный каталог Super Clones ({total} товаров).',
    'shop.badge.new': 'НОВОЕ',
  },
  tr: {
    'shop.featuredCatalog.needAllTitle': 'Tüm {total} ürünü görmek ister misiniz?',
    'shop.featuredCatalog.body':
      'Bu sayfada yalnızca birkaç ürün gösterilir. Tam kataloga erişmek için bize WhatsApp’tan mesaj gönderin.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Kapat',
    'shop.featuredCatalog.whatsappPrefill':
      'Merhaba! Tam Super Clones kataloğunu görmek istiyorum ({total} ürün).',
    'shop.badge.new': 'YENİ',
  },
  he: {
    'shop.featuredCatalog.needAllTitle': 'רוצה לראות את כל {total} המוצרים?',
    'shop.featuredCatalog.body':
      'העמוד הזה מציג רק כמה מוצרים. לגישה לקטלוג המלא, שלחו לנו הודעה ב-WhatsApp.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'סגור',
    'shop.featuredCatalog.whatsappPrefill':
      'שלום! אשמח לראות את קטלוג Super Clones המלא ({total} מוצרים).',
    'shop.badge.new': 'חדש',
  },
  eg: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض هذه الصفحة بضعة منتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة على واتساب.',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  at: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض هذه الصفحة بضعة منتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة على واتساب.',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  ps: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض هذه الصفحة بضعة منتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة على واتساب.',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  ma: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض هذه الصفحة بضعة منتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة على واتساب.',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  dz: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض هذه الصفحة بضعة منتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة على واتساب.',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  ka: {
    'shop.featuredCatalog.needAllTitle': 'გსურთ ყველა {total} პროდუქტის ნახვა?',
    'shop.featuredCatalog.body':
      'ეს გვერდი მხოლოდ რამდენიმე პროდუქტს აჩვენებს. სრულ კატალოგზე წვდომისთვის გამოგვიგზავნეთ შეტყობინება WhatsApp-ზე.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'დახურვა',
    'shop.featuredCatalog.whatsappPrefill':
      'გამარჯობა! მინდა ვნახო Super Clones-ის სრული კატალოგი ({total} პროდუქტი).',
    'shop.badge.new': 'ახალი',
  },
  hy: {
    'shop.featuredCatalog.needAllTitle': 'Ցանկանո՞ւմ եք տեսնել բոլոր {total} ապրանքները։',
    'shop.featuredCatalog.body':
      'Այս էջը ցույց է տալիս միայն մի քանի ապրանք։ Ամբողջ կատալոգին մուտք գործելու համար գրեք մեզ WhatsApp-ով։',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Փակել',
    'shop.featuredCatalog.whatsappPrefill':
      'Բարև։ Կցանկանայի տեսնել Super Clones-ի ամբողջական կատալոգը ({total} ապրանք)։',
    'shop.badge.new': 'ՆՈՐ',
  },
  az: {
    'shop.featuredCatalog.needAllTitle': 'Bütün {total} məhsula baxmaq istəyirsiniz?',
    'shop.featuredCatalog.body':
      'Bu səhifədə yalnız bir neçə məhsul göstərilir. Tam kataloqa giriş üçün bizə WhatsApp-dan mesaj göndərin.',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Bağla',
    'shop.featuredCatalog.whatsappPrefill':
      'Salam! Tam Super Clones kataloquna baxmaq istəyirəm ({total} məhsul).',
    'shop.badge.new': 'YENİ',
  },
  ja: {
    'shop.featuredCatalog.needAllTitle': '全{total}点の商品を見ますか？',
    'shop.featuredCatalog.body':
      'このページには一部の商品のみ表示されています。完全なカタログをご覧になるには、WhatsAppでメッセージを送ってください。',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': '閉じる',
    'shop.featuredCatalog.whatsappPrefill':
      'こんにちは！Super Clonesの全カタログ（{total}点）を見たいです。',
    'shop.badge.new': '新着',
  },
  zh: {
    'shop.featuredCatalog.needAllTitle': '想查看全部 {total} 件商品吗？',
    'shop.featuredCatalog.body':
      '本页仅展示部分商品。如需访问完整目录，请通过 WhatsApp 联系我们。',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': '关闭',
    'shop.featuredCatalog.whatsappPrefill':
      '你好！我想查看完整的 Super Clones 目录（共 {total} 件商品）。',
    'shop.badge.new': '新品',
  },
}

export function getFeaturedCatalogCtaMessages(locale: Locale): FeaturedCatalogCtaMessages {
  return BY_LOCALE[locale] ?? EN
}
