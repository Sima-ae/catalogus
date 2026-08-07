import type { Locale } from '@/lib/i18n-locale-registry'

export type FeaturedCatalogCtaMessageKey =
  | 'shop.featuredCatalog.needAllTitle'
  | 'shop.featuredCatalog.body'
  | 'shop.featuredCatalog.whatsapp'
  | 'shop.featuredCatalog.close'
  | 'shop.featuredCatalog.whatsappPrefill'
  | 'shop.badge.new'

type FeaturedCatalogCtaMessages = Record<FeaturedCatalogCtaMessageKey, string>

/**
 * Source wording (NL):
 * Title: Wil je alle {total} producten zien?
 * Body: Deze shop pagina toont slechts een aantal producten. Voor toegang tot de volledige catalogus stuur ons een bericht via:
 * Prefill: Hoi! Ik wil graag de volledige Super Clones-catalogus zien ({total} producten).
 */
const EN: FeaturedCatalogCtaMessages = {
  'shop.featuredCatalog.needAllTitle': 'Want to see all {total} products?',
  'shop.featuredCatalog.body':
    'This shop page only shows a selection of products. For access to the full catalog, send us a message via:',
  'shop.featuredCatalog.whatsapp': 'WhatsApp',
  'shop.featuredCatalog.close': 'Close',
  'shop.featuredCatalog.whatsappPrefill':
    "Hi! I'd like to see the full Super Clones catalog ({total} products).",
  'shop.badge.new': 'NEW',
}

const BY_LOCALE: Partial<Record<Locale, FeaturedCatalogCtaMessages>> = {
  en: EN,
  nl: {
    'shop.featuredCatalog.needAllTitle': 'Wil je alle {total} producten zien?',
    'shop.featuredCatalog.body':
      'Deze webpagina toont slechts een aantal producten. Voor toegang tot de volledige catalogus stuur ons een bericht via:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Sluiten',
    'shop.featuredCatalog.whatsappPrefill':
      'Hoi! Ik wil graag de volledige Super Clones-catalogus zien ({total} producten).',
    'shop.badge.new': 'NIEUW',
  },
  de: {
    'shop.featuredCatalog.needAllTitle': 'Möchtest du alle {total} Produkte sehen?',
    'shop.featuredCatalog.body':
      'Diese Shop-Seite zeigt nur eine Auswahl an Produkten. Für den Zugang zum vollständigen Katalog sende uns eine Nachricht über:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Schließen',
    'shop.featuredCatalog.whatsappPrefill':
      'Hallo! Ich möchte gerne den vollständigen Super Clones-Katalog sehen ({total} Produkte).',
    'shop.badge.new': 'NEU',
  },
  fr: {
    'shop.featuredCatalog.needAllTitle': 'Tu veux voir les {total} produits ?',
    'shop.featuredCatalog.body':
      'Cette page boutique n’affiche qu’une sélection de produits. Pour accéder au catalogue complet, envoie-nous un message via :',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Fermer',
    'shop.featuredCatalog.whatsappPrefill':
      'Bonjour ! Je voudrais voir le catalogue complet Super Clones ({total} produits).',
    'shop.badge.new': 'NOUVEAU',
  },
  es: {
    'shop.featuredCatalog.needAllTitle': '¿Quieres ver todos los {total} productos?',
    'shop.featuredCatalog.body':
      'Esta página de la tienda solo muestra una selección de productos. Para acceder al catálogo completo, envíanos un mensaje a través de:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Cerrar',
    'shop.featuredCatalog.whatsappPrefill':
      '¡Hola! Me gustaría ver el catálogo completo de Super Clones ({total} productos).',
    'shop.badge.new': 'NUEVO',
  },
  pt: {
    'shop.featuredCatalog.needAllTitle': 'Queres ver todos os {total} produtos?',
    'shop.featuredCatalog.body':
      'Esta página da loja mostra apenas uma seleção de produtos. Para aceder ao catálogo completo, envia-nos uma mensagem via:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Fechar',
    'shop.featuredCatalog.whatsappPrefill':
      'Olá! Gostaria de ver o catálogo completo Super Clones ({total} produtos).',
    'shop.badge.new': 'NOVO',
  },
  it: {
    'shop.featuredCatalog.needAllTitle': 'Vuoi vedere tutti i {total} prodotti?',
    'shop.featuredCatalog.body':
      'Questa pagina del negozio mostra solo una selezione di prodotti. Per accedere al catalogo completo, inviaci un messaggio tramite:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Chiudi',
    'shop.featuredCatalog.whatsappPrefill':
      'Ciao! Vorrei vedere il catalogo completo Super Clones ({total} prodotti).',
    'shop.badge.new': 'NUOVO',
  },
  gr: {
    'shop.featuredCatalog.needAllTitle': 'Θέλεις να δεις όλα τα {total} προϊόντα;',
    'shop.featuredCatalog.body':
      'Αυτή η σελίδα του καταστήματος εμφανίζει μόνο μια επιλογή προϊόντων. Για πρόσβαση στον πλήρη κατάλογο, στείλε μας μήνυμα μέσω:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Κλείσιμο',
    'shop.featuredCatalog.whatsappPrefill':
      'Γεια! Θα ήθελα να δω τον πλήρη κατάλογο Super Clones ({total} προϊόντα).',
    'shop.badge.new': 'ΝΕΟ',
  },
  pl: {
    'shop.featuredCatalog.needAllTitle': 'Chcesz zobaczyć wszystkie produkty ({total})?',
    'shop.featuredCatalog.body':
      'Ta strona sklepu pokazuje tylko wybrane produkty. Aby uzyskać dostęp do pełnego katalogu, wyślij nam wiadomość przez:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zamknij',
    'shop.featuredCatalog.whatsappPrefill':
      'Cześć! Chciałbym zobaczyć pełny katalog Super Clones ({total} produktów).',
    'shop.badge.new': 'NOWOŚĆ',
  },
  cz: {
    'shop.featuredCatalog.needAllTitle': 'Chceš vidět všech {total} produktů?',
    'shop.featuredCatalog.body':
      'Tato stránka obchodu zobrazuje jen výběr produktů. Pro přístup k celému katalogu nám pošli zprávu přes:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zavřít',
    'shop.featuredCatalog.whatsappPrefill':
      'Ahoj! Chtěl bych vidět celý katalog Super Clones ({total} produktů).',
    'shop.badge.new': 'NOVÉ',
  },
  sk: {
    'shop.featuredCatalog.needAllTitle': 'Chceš vidieť všetky produkty ({total})?',
    'shop.featuredCatalog.body':
      'Táto stránka obchodu zobrazuje len výber produktov. Pre prístup k celému katalógu nám pošli správu cez:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zavrieť',
    'shop.featuredCatalog.whatsappPrefill':
      'Ahoj! Chcel by som vidieť celý katalóg Super Clones ({total} produktov).',
    'shop.badge.new': 'NOVÉ',
  },
  hu: {
    'shop.featuredCatalog.needAllTitle': 'Megnéznéd mind a {total} terméket?',
    'shop.featuredCatalog.body':
      'Ez a shop oldal csak egy válogatást mutat a termékekből. A teljes katalógushoz küldj nekünk üzenetet ezen keresztül:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Bezárás',
    'shop.featuredCatalog.whatsappPrefill':
      'Szia! Szeretném megnézni a teljes Super Clones katalógust ({total} termék).',
    'shop.badge.new': 'ÚJ',
  },
  ro: {
    'shop.featuredCatalog.needAllTitle': 'Vrei să vezi toate cele {total} de produse?',
    'shop.featuredCatalog.body':
      'Această pagină a magazinului arată doar o selecție de produse. Pentru acces la catalogul complet, trimite-ne un mesaj prin:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Închide',
    'shop.featuredCatalog.whatsappPrefill':
      'Bună! Aș dori să văd catalogul complet Super Clones ({total} produse).',
    'shop.badge.new': 'NOU',
  },
  bg: {
    'shop.featuredCatalog.needAllTitle': 'Искаш ли да видиш всички {total} продукта?',
    'shop.featuredCatalog.body':
      'Тази страница на магазина показва само подбрани продукти. За достъп до пълния каталог ни изпрати съобщение чрез:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Затвори',
    'shop.featuredCatalog.whatsappPrefill':
      'Здравей! Искам да видя пълния каталог на Super Clones ({total} продукта).',
    'shop.badge.new': 'НОВО',
  },
  hr: {
    'shop.featuredCatalog.needAllTitle': 'Želiš li vidjeti svih {total} proizvoda?',
    'shop.featuredCatalog.body':
      'Ova stranica trgovine prikazuje samo odabrane proizvode. Za pristup cijelom katalogu pošalji nam poruku putem:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zatvori',
    'shop.featuredCatalog.whatsappPrefill':
      'Bok! Želio bih vidjeti cijeli Super Clones katalog ({total} proizvoda).',
    'shop.badge.new': 'NOVO',
  },
  sr: {
    'shop.featuredCatalog.needAllTitle': 'Желиш ли да видиш свих {total} производа?',
    'shop.featuredCatalog.body':
      'Ова страница продавнице приказује само одабране производе. За приступ целом каталогу пошаљи нам поруку преко:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Затвори',
    'shop.featuredCatalog.whatsappPrefill':
      'Здраво! Желео бих да видим цео Super Clones каталог ({total} производа).',
    'shop.badge.new': 'НОВО',
  },
  ba: {
    'shop.featuredCatalog.needAllTitle': 'Želiš li vidjeti svih {total} proizvoda?',
    'shop.featuredCatalog.body':
      'Ova stranica trgovine prikazuje samo odabrane proizvode. Za pristup cijelom katalogu pošalji nam poruku putem:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zatvori',
    'shop.featuredCatalog.whatsappPrefill':
      'Zdravo! Želio bih vidjeti cijeli Super Clones katalog ({total} proizvoda).',
    'shop.badge.new': 'NOVO',
  },
  me: {
    'shop.featuredCatalog.needAllTitle': 'Želiš li vidjeti svih {total} proizvoda?',
    'shop.featuredCatalog.body':
      'Ova stranica trgovine prikazuje samo odabrane proizvode. Za pristup cijelom katalogu pošalji nam poruku putem:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Zatvori',
    'shop.featuredCatalog.whatsappPrefill':
      'Zdravo! Želio bih vidjeti cijeli Super Clones katalog ({total} proizvoda).',
    'shop.badge.new': 'NOVO',
  },
  sq: {
    'shop.featuredCatalog.needAllTitle': 'Do të shohësh të gjitha {total} produktet?',
    'shop.featuredCatalog.body':
      'Kjo faqe e dyqanit tregon vetëm një përzgjedhje produktesh. Për qasje në katalogun e plotë, na dërgo një mesazh përmes:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Mbyll',
    'shop.featuredCatalog.whatsappPrefill':
      'Përshëndetje! Do të doja të shihja katalogun e plotë Super Clones ({total} produkte).',
    'shop.badge.new': 'E RE',
  },
  mk: {
    'shop.featuredCatalog.needAllTitle': 'Сакаш да ги видиш сите {total} производи?',
    'shop.featuredCatalog.body':
      'Оваа страница на продавницата прикажува само избран дел од производите. За пристап до целиот каталог, испрати ни порака преку:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Затвори',
    'shop.featuredCatalog.whatsappPrefill':
      'Здраво! Сакам да го видам целиот каталог на Super Clones ({total} производи).',
    'shop.badge.new': 'НОВО',
  },
  lt: {
    'shop.featuredCatalog.needAllTitle': 'Nori matyti visus {total} produktus?',
    'shop.featuredCatalog.body':
      'Šiame parduotuvės puslapyje rodoma tik produktų atranka. Norėdamas gauti visą katalogą, parašyk mums žinutę per:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Uždaryti',
    'shop.featuredCatalog.whatsappPrefill':
      'Sveiki! Norėčiau pamatyti visą Super Clones katalogą ({total} produktų).',
    'shop.badge.new': 'NAUJA',
  },
  da: {
    'shop.featuredCatalog.needAllTitle': 'Vil du se alle {total} produkter?',
    'shop.featuredCatalog.body':
      'Denne shop-side viser kun et udvalg af produkter. For adgang til hele kataloget, send os en besked via:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Luk',
    'shop.featuredCatalog.whatsappPrefill':
      'Hej! Jeg vil gerne se hele Super Clones-kataloget ({total} produkter).',
    'shop.badge.new': 'NY',
  },
  sv: {
    'shop.featuredCatalog.needAllTitle': 'Vill du se alla {total} produkter?',
    'shop.featuredCatalog.body':
      'Den här butikssidan visar bara ett urval av produkter. För tillgång till hela katalogen, skicka oss ett meddelande via:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Stäng',
    'shop.featuredCatalog.whatsappPrefill':
      'Hej! Jag vill gärna se hela Super Clones-katalogen ({total} produkter).',
    'shop.badge.new': 'NY',
  },
  nb: {
    'shop.featuredCatalog.needAllTitle': 'Vil du se alle {total} produktene?',
    'shop.featuredCatalog.body':
      'Denne butikksiden viser bare et utvalg av produkter. For tilgang til hele katalogen, send oss en melding via:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Lukk',
    'shop.featuredCatalog.whatsappPrefill':
      'Hei! Jeg ønsker å se hele Super Clones-katalogen ({total} produkter).',
    'shop.badge.new': 'NY',
  },
  fi: {
    'shop.featuredCatalog.needAllTitle': 'Haluatko nähdä kaikki {total} tuotetta?',
    'shop.featuredCatalog.body':
      'Tämä kaupan sivu näyttää vain valikoiman tuotteita. Saadaksesi koko katalogin, lähetä meille viesti seuraavasti:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Sulje',
    'shop.featuredCatalog.whatsappPrefill':
      'Hei! Haluaisin nähdä koko Super Clones -katalogin ({total} tuotetta).',
    'shop.badge.new': 'UUSI',
  },
  uk: {
    'shop.featuredCatalog.needAllTitle': 'Хочеш побачити всі товари ({total})?',
    'shop.featuredCatalog.body':
      'На цій сторінці магазину показано лише добірку товарів. Для доступу до повного каталогу надішли нам повідомлення через:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Закрити',
    'shop.featuredCatalog.whatsappPrefill':
      'Привіт! Я хотів би побачити повний каталог Super Clones ({total} товарів).',
    'shop.badge.new': 'НОВЕ',
  },
  ru: {
    'shop.featuredCatalog.needAllTitle': 'Хочешь увидеть все товары ({total})?',
    'shop.featuredCatalog.body':
      'На этой странице магазина показана только подборка товаров. Для доступа к полному каталогу отправь нам сообщение через:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Закрыть',
    'shop.featuredCatalog.whatsappPrefill':
      'Здравствуйте! Я хотел бы увидеть полный каталог Super Clones ({total} товаров).',
    'shop.badge.new': 'НОВОЕ',
  },
  tr: {
    'shop.featuredCatalog.needAllTitle': 'Tüm {total} ürünü görmek ister misin?',
    'shop.featuredCatalog.body':
      'Bu mağaza sayfası yalnızca bir ürün seçkisi gösterir. Tam kataloga erişmek için bize şu yolla mesaj gönder:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Kapat',
    'shop.featuredCatalog.whatsappPrefill':
      'Merhaba! Tam Super Clones kataloğunu görmek istiyorum ({total} ürün).',
    'shop.badge.new': 'YENİ',
  },
  he: {
    'shop.featuredCatalog.needAllTitle': 'רוצה לראות את כל {total} המוצרים?',
    'shop.featuredCatalog.body':
      'עמוד החנות הזה מציג רק מבחר מוצרים. לגישה לקטלוג המלא, שלחו לנו הודעה דרך:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'סגור',
    'shop.featuredCatalog.whatsappPrefill':
      'שלום! אשמח לראות את קטלוג Super Clones המלא ({total} מוצרים).',
    'shop.badge.new': 'חדש',
  },
  eg: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض صفحة المتجر هذه مجموعة مختارة من المنتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة عبر:',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  at: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض صفحة المتجر هذه مجموعة مختارة من المنتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة عبر:',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  ps: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض صفحة المتجر هذه مجموعة مختارة من المنتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة عبر:',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  ma: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض صفحة المتجر هذه مجموعة مختارة من المنتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة عبر:',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  dz: {
    'shop.featuredCatalog.needAllTitle': 'هل تريد رؤية كل المنتجات البالغ عددها {total}؟',
    'shop.featuredCatalog.body':
      'تعرض صفحة المتجر هذه مجموعة مختارة من المنتجات فقط. للوصول إلى الكتالوج الكامل، أرسل لنا رسالة عبر:',
    'shop.featuredCatalog.whatsapp': 'واتساب',
    'shop.featuredCatalog.close': 'إغلاق',
    'shop.featuredCatalog.whatsappPrefill':
      'مرحبًا! أود رؤية كتالوج Super Clones الكامل ({total} منتجًا).',
    'shop.badge.new': 'جديد',
  },
  ka: {
    'shop.featuredCatalog.needAllTitle': 'გინდა ყველა {total} პროდუქტის ნახვა?',
    'shop.featuredCatalog.body':
      'ეს მაღაზიის გვერდი მხოლოდ პროდუქტების შერჩევას აჩვენებს. სრულ კატალოგზე წვდომისთვის გამოგვიგზავნე შეტყობინება:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'დახურვა',
    'shop.featuredCatalog.whatsappPrefill':
      'გამარჯობა! მინდა ვნახო Super Clones-ის სრული კატალოგი ({total} პროდუქტი).',
    'shop.badge.new': 'ახალი',
  },
  hy: {
    'shop.featuredCatalog.needAllTitle': 'Ցանկանո՞ւմ ես տեսնել բոլոր {total} ապրանքները։',
    'shop.featuredCatalog.body':
      'Այս խանութի էջը ցույց է տալիս միայն ապրանքների ընտրանի։ Ամբողջ կատալոգին մուտք գործելու համար ուղարկիր մեզ հաղորդագրություն՝',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Փակել',
    'shop.featuredCatalog.whatsappPrefill':
      'Բարև։ Կցանկանայի տեսնել Super Clones-ի ամբողջական կատալոգը ({total} ապրանք)։',
    'shop.badge.new': 'ՆՈՐ',
  },
  az: {
    'shop.featuredCatalog.needAllTitle': 'Bütün {total} məhsula baxmaq istəyirsən?',
    'shop.featuredCatalog.body':
      'Bu mağaza səhifəsi yalnız məhsul seçimini göstərir. Tam kataloqa giriş üçün bizə bu yolla mesaj göndər:',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': 'Bağla',
    'shop.featuredCatalog.whatsappPrefill':
      'Salam! Tam Super Clones kataloquna baxmaq istəyirəm ({total} məhsul).',
    'shop.badge.new': 'YENİ',
  },
  ja: {
    'shop.featuredCatalog.needAllTitle': '全{total}点の商品を見ますか？',
    'shop.featuredCatalog.body':
      'このショップページには一部の商品のみ表示されています。完全なカタログをご覧になるには、次経由でメッセージを送ってください：',
    'shop.featuredCatalog.whatsapp': 'WhatsApp',
    'shop.featuredCatalog.close': '閉じる',
    'shop.featuredCatalog.whatsappPrefill':
      'こんにちは！Super Clonesの全カタログ（{total}点）を見たいです。',
    'shop.badge.new': '新着',
  },
  zh: {
    'shop.featuredCatalog.needAllTitle': '想查看全部 {total} 件商品吗？',
    'shop.featuredCatalog.body':
      '本商店页面仅展示部分商品。如需访问完整目录，请通过以下方式给我们发消息：',
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
