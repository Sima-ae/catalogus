import type { Locale } from '@/lib/i18n-locale-registry'

export type ProductTrashMessageKey =
  | 'product.trash.confirmTitle'
  | 'product.trash.confirmMessage'
  | 'product.trash.confirmButton'
  | 'product.trash.cancel'
  | 'product.trash.busy'
  | 'product.trash.ariaLabel'
  | 'product.trash.buttonTitle'
  | 'product.trash.error'
  | 'product.trash.errorRetry'
  | 'product.trash.defaultName'
  | 'confirm.closeDialog'

type ProductTrashMessages = Record<ProductTrashMessageKey, string>

const EN: ProductTrashMessages = {
  'product.trash.confirmTitle': 'Move to trash?',
  'product.trash.confirmMessage':
    'Move "{name}" to the trash bin? It will be hidden from the shop but can be restored from Admin → Products.',
  'product.trash.confirmButton': 'Move to trash',
  'product.trash.cancel': 'Cancel',
  'product.trash.busy': 'Please wait…',
  'product.trash.ariaLabel': 'Move product to trash',
  'product.trash.buttonTitle': 'Move to trash',
  'product.trash.error': 'Could not move product to trash',
  'product.trash.errorRetry': '{error} Try again, or cancel.',
  'product.trash.defaultName': 'this product',
  'confirm.closeDialog': 'Close dialog',
}

const NL: ProductTrashMessages = {
  'product.trash.confirmTitle': 'Naar prullenbak verplaatsen?',
  'product.trash.confirmMessage':
    '"{name}" naar de prullenbak verplaatsen? Het product verdwijnt uit de shop, maar kan worden hersteld via Admin → Producten.',
  'product.trash.confirmButton': 'Naar prullenbak',
  'product.trash.cancel': 'Annuleren',
  'product.trash.busy': 'Even geduld…',
  'product.trash.ariaLabel': 'Product naar prullenbak verplaatsen',
  'product.trash.buttonTitle': 'Naar prullenbak',
  'product.trash.error': 'Product kon niet naar de prullenbak worden verplaatst',
  'product.trash.errorRetry': '{error} Probeer opnieuw of annuleer.',
  'product.trash.defaultName': 'dit product',
  'confirm.closeDialog': 'Dialoog sluiten',
}

const BY_LOCALE: Partial<Record<Locale, ProductTrashMessages>> = {
  en: EN,
  nl: NL,
  de: {
    'product.trash.confirmTitle': 'In den Papierkorb verschieben?',
    'product.trash.confirmMessage':
      '"{name}" in den Papierkorb verschieben? Es wird im Shop ausgeblendet, kann aber unter Admin → Produkte wiederhergestellt werden.',
    'product.trash.confirmButton': 'In Papierkorb',
    'product.trash.cancel': 'Abbrechen',
    'product.trash.busy': 'Bitte warten…',
    'product.trash.ariaLabel': 'Produkt in den Papierkorb verschieben',
    'product.trash.buttonTitle': 'In Papierkorb',
    'product.trash.error': 'Produkt konnte nicht in den Papierkorb verschoben werden',
    'product.trash.errorRetry': '{error} Erneut versuchen oder abbrechen.',
    'product.trash.defaultName': 'dieses Produkt',
    'confirm.closeDialog': 'Dialog schließen',
  },
  fr: {
    'product.trash.confirmTitle': 'Mettre à la corbeille ?',
    'product.trash.confirmMessage':
      'Mettre « {name} » à la corbeille ? Il sera masqué dans la boutique mais pourra être restauré depuis Admin → Produits.',
    'product.trash.confirmButton': 'Mettre à la corbeille',
    'product.trash.cancel': 'Annuler',
    'product.trash.busy': 'Veuillez patienter…',
    'product.trash.ariaLabel': 'Mettre le produit à la corbeille',
    'product.trash.buttonTitle': 'Corbeille',
    'product.trash.error': 'Impossible de mettre le produit à la corbeille',
    'product.trash.errorRetry': '{error} Réessayez ou annulez.',
    'product.trash.defaultName': 'ce produit',
    'confirm.closeDialog': 'Fermer la fenêtre',
  },
  es: {
    'product.trash.confirmTitle': '¿Mover a la papelera?',
    'product.trash.confirmMessage':
      '¿Mover «{name}» a la papelera? Se ocultará en la tienda, pero podrá restaurarse desde Admin → Productos.',
    'product.trash.confirmButton': 'Mover a la papelera',
    'product.trash.cancel': 'Cancelar',
    'product.trash.busy': 'Espere…',
    'product.trash.ariaLabel': 'Mover producto a la papelera',
    'product.trash.buttonTitle': 'Papelera',
    'product.trash.error': 'No se pudo mover el producto a la papelera',
    'product.trash.errorRetry': '{error} Inténtelo de nuevo o cancele.',
    'product.trash.defaultName': 'este producto',
    'confirm.closeDialog': 'Cerrar diálogo',
  },
  pt: {
    'product.trash.confirmTitle': 'Mover para o lixo?',
    'product.trash.confirmMessage':
      'Mover «{name}» para o lixo? Ficará oculto na loja, mas pode ser restaurado em Admin → Produtos.',
    'product.trash.confirmButton': 'Mover para o lixo',
    'product.trash.cancel': 'Cancelar',
    'product.trash.busy': 'Aguarde…',
    'product.trash.ariaLabel': 'Mover produto para o lixo',
    'product.trash.buttonTitle': 'Lixo',
    'product.trash.error': 'Não foi possível mover o produto para o lixo',
    'product.trash.errorRetry': '{error} Tente novamente ou cancele.',
    'product.trash.defaultName': 'este produto',
    'confirm.closeDialog': 'Fechar diálogo',
  },
  it: {
    'product.trash.confirmTitle': 'Spostare nel cestino?',
    'product.trash.confirmMessage':
      'Spostare «{name}» nel cestino? Sarà nascosto nel negozio ma potrà essere ripristinato da Admin → Prodotti.',
    'product.trash.confirmButton': 'Sposta nel cestino',
    'product.trash.cancel': 'Annulla',
    'product.trash.busy': 'Attendere…',
    'product.trash.ariaLabel': 'Sposta prodotto nel cestino',
    'product.trash.buttonTitle': 'Cestino',
    'product.trash.error': 'Impossibile spostare il prodotto nel cestino',
    'product.trash.errorRetry': '{error} Riprova o annulla.',
    'product.trash.defaultName': 'questo prodotto',
    'confirm.closeDialog': 'Chiudi finestra',
  },
  gr: {
    'product.trash.confirmTitle': 'Μετακίνηση στα απορρίμματα;',
    'product.trash.confirmMessage':
      'Μετακίνηση του «{name}» στα απορρίμματα; Θα κρυφτεί από το κατάστημα, αλλά μπορεί να επαναφερθεί από Admin → Προϊόντα.',
    'product.trash.confirmButton': 'Μετακίνηση στα απορρίμματα',
    'product.trash.cancel': 'Ακύρωση',
    'product.trash.busy': 'Περιμένετε…',
    'product.trash.ariaLabel': 'Μετακίνηση προϊόντος στα απορρίμματα',
    'product.trash.buttonTitle': 'Απορρίμματα',
    'product.trash.error': 'Δεν ήταν δυνατή η μετακίνηση του προϊόντος στα απορρίμματα',
    'product.trash.errorRetry': '{error} Δοκιμάστε ξανά ή ακυρώστε.',
    'product.trash.defaultName': 'αυτό το προϊόν',
    'confirm.closeDialog': 'Κλείσιμο διαλόγου',
  },
  pl: {
    'product.trash.confirmTitle': 'Przenieść do kosza?',
    'product.trash.confirmMessage':
      'Przenieść «{name}» do kosza? Zniknie ze sklepu, ale można go przywrócić w Admin → Produkty.',
    'product.trash.confirmButton': 'Przenieś do kosza',
    'product.trash.cancel': 'Anuluj',
    'product.trash.busy': 'Proszę czekać…',
    'product.trash.ariaLabel': 'Przenieś produkt do kosza',
    'product.trash.buttonTitle': 'Kosz',
    'product.trash.error': 'Nie udało się przenieść produktu do kosza',
    'product.trash.errorRetry': '{error} Spróbuj ponownie lub anuluj.',
    'product.trash.defaultName': 'ten produkt',
    'confirm.closeDialog': 'Zamknij okno',
  },
  cz: {
    'product.trash.confirmTitle': 'Přesunout do koše?',
    'product.trash.confirmMessage':
      'Přesunout «{name}» do koše? V obchodě bude skrytý, ale lze obnovit v Admin → Produkty.',
    'product.trash.confirmButton': 'Přesunout do koše',
    'product.trash.cancel': 'Zrušit',
    'product.trash.busy': 'Čekejte…',
    'product.trash.ariaLabel': 'Přesunout produkt do koše',
    'product.trash.buttonTitle': 'Koš',
    'product.trash.error': 'Produkt se nepodařilo přesunout do koše',
    'product.trash.errorRetry': '{error} Zkuste to znovu nebo zrušte.',
    'product.trash.defaultName': 'tento produkt',
    'confirm.closeDialog': 'Zavřít dialog',
  },
  sk: {
    'product.trash.confirmTitle': 'Presunúť do koša?',
    'product.trash.confirmMessage':
      'Presunúť «{name}» do koša? V obchode bude skrytý, ale dá sa obnoviť v Admin → Produkty.',
    'product.trash.confirmButton': 'Presunúť do koša',
    'product.trash.cancel': 'Zrušiť',
    'product.trash.busy': 'Čakajte…',
    'product.trash.ariaLabel': 'Presunúť produkt do koša',
    'product.trash.buttonTitle': 'Kôš',
    'product.trash.error': 'Produkt sa nepodarilo presunúť do koša',
    'product.trash.errorRetry': '{error} Skúste znova alebo zrušte.',
    'product.trash.defaultName': 'tento produkt',
    'confirm.closeDialog': 'Zavrieť dialóg',
  },
  hu: {
    'product.trash.confirmTitle': 'Áthelyezés a kukába?',
    'product.trash.confirmMessage':
      'Áthelyezi «{name}» a kukába? Elrejtődik a boltban, de visszaállítható az Admin → Termékek menüben.',
    'product.trash.confirmButton': 'Kukába',
    'product.trash.cancel': 'Mégse',
    'product.trash.busy': 'Kis türelmet…',
    'product.trash.ariaLabel': 'Termék áthelyezése a kukába',
    'product.trash.buttonTitle': 'Kuka',
    'product.trash.error': 'A termék nem helyezhető át a kukába',
    'product.trash.errorRetry': '{error} Próbálja újra, vagy vonja vissza.',
    'product.trash.defaultName': 'ez a termék',
    'confirm.closeDialog': 'Ablak bezárása',
  },
  ro: {
    'product.trash.confirmTitle': 'Mutare la coș?',
    'product.trash.confirmMessage':
      'Mutați «{name}» la coș? Va fi ascuns din magazin, dar poate fi restaurat din Admin → Produse.',
    'product.trash.confirmButton': 'Mută la coș',
    'product.trash.cancel': 'Anulează',
    'product.trash.busy': 'Așteptați…',
    'product.trash.ariaLabel': 'Mută produsul la coș',
    'product.trash.buttonTitle': 'Coș',
    'product.trash.error': 'Produsul nu a putut fi mutat la coș',
    'product.trash.errorRetry': '{error} Încercați din nou sau anulați.',
    'product.trash.defaultName': 'acest produs',
    'confirm.closeDialog': 'Închide dialogul',
  },
  bg: {
    'product.trash.confirmTitle': 'Преместване в кошчето?',
    'product.trash.confirmMessage':
      'Преместване на «{name}» в кошчето? Ще бъде скрит от магазина, но може да се възстанови от Admin → Продукти.',
    'product.trash.confirmButton': 'В кошчето',
    'product.trash.cancel': 'Отказ',
    'product.trash.busy': 'Моля, изчакайте…',
    'product.trash.ariaLabel': 'Преместване на продукта в кошчето',
    'product.trash.buttonTitle': 'Кошче',
    'product.trash.error': 'Продуктът не може да бъде преместен в кошчето',
    'product.trash.errorRetry': '{error} Опитайте отново или отказ.',
    'product.trash.defaultName': 'този продукт',
    'confirm.closeDialog': 'Затвори диалога',
  },
  hr: {
    'product.trash.confirmTitle': 'Premjestiti u smeće?',
    'product.trash.confirmMessage':
      'Premjestiti «{name}» u smeće? Bit će skriven u trgovini, ali se može vratiti iz Admin → Proizvodi.',
    'product.trash.confirmButton': 'U smeće',
    'product.trash.cancel': 'Odustani',
    'product.trash.busy': 'Pričekajte…',
    'product.trash.ariaLabel': 'Premjesti proizvod u smeće',
    'product.trash.buttonTitle': 'Smeće',
    'product.trash.error': 'Proizvod nije moguće premjestiti u smeće',
    'product.trash.errorRetry': '{error} Pokušajte ponovno ili odustanite.',
    'product.trash.defaultName': 'ovaj proizvod',
    'confirm.closeDialog': 'Zatvori dijalog',
  },
  sr: {
    'product.trash.confirmTitle': 'Преместити у корпу?',
    'product.trash.confirmMessage':
      'Преместити «{name}» у корпу? Biće sakriven u prodavnici, ali se može vratiti iz Admin → Proizvodi.',
    'product.trash.confirmButton': 'У корпу',
    'product.trash.cancel': 'Откажи',
    'product.trash.busy': 'Сачекајте…',
    'product.trash.ariaLabel': 'Премести производ у корпу',
    'product.trash.buttonTitle': 'Корпа',
    'product.trash.error': 'Производ није могао бити премештен у корпу',
    'product.trash.errorRetry': '{error} Покушајте поново или откажите.',
    'product.trash.defaultName': 'ovaj proizvod',
    'confirm.closeDialog': 'Затвори дијалог',
  },
  ba: {
    'product.trash.confirmTitle': 'Premjestiti u smeće?',
    'product.trash.confirmMessage':
      'Premjestiti «{name}» u smeće? Bit će skriven u trgovini, ali se može vratiti iz Admin → Proizvodi.',
    'product.trash.confirmButton': 'U smeće',
    'product.trash.cancel': 'Odustani',
    'product.trash.busy': 'Pričekajte…',
    'product.trash.ariaLabel': 'Premjesti proizvod u smeće',
    'product.trash.buttonTitle': 'Smeće',
    'product.trash.error': 'Proizvod nije moguće premjestiti u smeće',
    'product.trash.errorRetry': '{error} Pokušajte ponovo ili odustanite.',
    'product.trash.defaultName': 'ovaj proizvod',
    'confirm.closeDialog': 'Zatvori dijalog',
  },
  me: {
    'product.trash.confirmTitle': 'Premjestiti u smeće?',
    'product.trash.confirmMessage':
      'Premjestiti «{name}» u smeće? Biće skriven u prodavnici, ali se može vratiti iz Admin → Proizvodi.',
    'product.trash.confirmButton': 'U smeće',
    'product.trash.cancel': 'Odustani',
    'product.trash.busy': 'Sačekajte…',
    'product.trash.ariaLabel': 'Premjesti proizvod u smeće',
    'product.trash.buttonTitle': 'Smeće',
    'product.trash.error': 'Proizvod nije moguće premjestiti u smeće',
    'product.trash.errorRetry': '{error} Pokušajte ponovo ili odustanite.',
    'product.trash.defaultName': 'ovaj proizvod',
    'confirm.closeDialog': 'Zatvori dijalog',
  },
  sq: {
    'product.trash.confirmTitle': 'Të shfaqet në kosh?',
    'product.trash.confirmMessage':
      'Të zhvendoset «{name}» në kosh? Do të fshihet nga dyqani, por mund të rikthehet nga Admin → Produktet.',
    'product.trash.confirmButton': 'Në kosh',
    'product.trash.cancel': 'Anulo',
    'product.trash.busy': 'Ju lutemi prisni…',
    'product.trash.ariaLabel': 'Zhvendos produktin në kosh',
    'product.trash.buttonTitle': 'Kosh',
    'product.trash.error': 'Produkti nuk mund të zhvendoset në kosh',
    'product.trash.errorRetry': '{error} Provoni përsëri ose anuloni.',
    'product.trash.defaultName': 'ky produkt',
    'confirm.closeDialog': 'Mbyll dialogun',
  },
  mk: {
    'product.trash.confirmTitle': 'Премести во корпа?',
    'product.trash.confirmMessage':
      'Да се премести «{name}» во корпа? Ќе биде скриен од продавницата, но може да се врати од Admin → Производи.',
    'product.trash.confirmButton': 'Во корпа',
    'product.trash.cancel': 'Откажи',
    'product.trash.busy': 'Почекајте…',
    'product.trash.ariaLabel': 'Премести производ во корпа',
    'product.trash.buttonTitle': 'Корпа',
    'product.trash.error': 'Производот не можеше да се премести во корпа',
    'product.trash.errorRetry': '{error} Обидете се повторно или откажете.',
    'product.trash.defaultName': 'овој производ',
    'confirm.closeDialog': 'Затвори дијалог',
  },
  lt: {
    'product.trash.confirmTitle': 'Perkelti į šiukšlinę?',
    'product.trash.confirmMessage':
      'Perkelti «{name}» į šiukšlinę? Jis bus paslėptas parduotuvėje, bet galima atkurti skiltyje Admin → Produktai.',
    'product.trash.confirmButton': 'Į šiukšlinę',
    'product.trash.cancel': 'Atšaukti',
    'product.trash.busy': 'Palaukite…',
    'product.trash.ariaLabel': 'Perkelti produktą į šiukšlinę',
    'product.trash.buttonTitle': 'Šiukšlinė',
    'product.trash.error': 'Nepavyko perkelti produkto į šiukšlinę',
    'product.trash.errorRetry': '{error} Bandykite dar kartą arba atšaukite.',
    'product.trash.defaultName': 'šį produktą',
    'confirm.closeDialog': 'Uždaryti dialogą',
  },
  da: {
    'product.trash.confirmTitle': 'Flyt til papirkurv?',
    'product.trash.confirmMessage':
      'Flyt «{name}» til papirkurven? Det skjules i butikken, men kan gendannes fra Admin → Produkter.',
    'product.trash.confirmButton': 'Flyt til papirkurv',
    'product.trash.cancel': 'Annuller',
    'product.trash.busy': 'Vent…',
    'product.trash.ariaLabel': 'Flyt produkt til papirkurv',
    'product.trash.buttonTitle': 'Papirkurv',
    'product.trash.error': 'Produktet kunne ikke flyttes til papirkurven',
    'product.trash.errorRetry': '{error} Prøv igen eller annuller.',
    'product.trash.defaultName': 'dette produkt',
    'confirm.closeDialog': 'Luk dialog',
  },
  sv: {
    'product.trash.confirmTitle': 'Flytta till papperskorgen?',
    'product.trash.confirmMessage':
      'Flytta «{name}» till papperskorgen? Den döljs i butiken men kan återställas från Admin → Produkter.',
    'product.trash.confirmButton': 'Flytta till papperskorg',
    'product.trash.cancel': 'Avbryt',
    'product.trash.busy': 'Vänta…',
    'product.trash.ariaLabel': 'Flytta produkt till papperskorgen',
    'product.trash.buttonTitle': 'Papperskorg',
    'product.trash.error': 'Produkten kunde inte flyttas till papperskorgen',
    'product.trash.errorRetry': '{error} Försök igen eller avbryt.',
    'product.trash.defaultName': 'den här produkten',
    'confirm.closeDialog': 'Stäng dialog',
  },
  nb: {
    'product.trash.confirmTitle': 'Flytt til papirkurv?',
    'product.trash.confirmMessage':
      'Flytt «{name}» til papirkurven? Den skjules i butikken, men kan gjenopprettes fra Admin → Produkter.',
    'product.trash.confirmButton': 'Flytt til papirkurv',
    'product.trash.cancel': 'Avbryt',
    'product.trash.busy': 'Vent…',
    'product.trash.ariaLabel': 'Flytt produkt til papirkurv',
    'product.trash.buttonTitle': 'Papirkurv',
    'product.trash.error': 'Produktet kunne ikke flyttes til papirkurven',
    'product.trash.errorRetry': '{error} Prøv igjen eller avbryt.',
    'product.trash.defaultName': 'dette produktet',
    'confirm.closeDialog': 'Lukk dialog',
  },
  fi: {
    'product.trash.confirmTitle': 'Siirrä roskakoriin?',
    'product.trash.confirmMessage':
      'Siirrä «{name}» roskakoriin? Se piilotetaan kaupasta, mutta voidaan palauttaa kohdasta Admin → Tuotteet.',
    'product.trash.confirmButton': 'Siirrä roskakoriin',
    'product.trash.cancel': 'Peruuta',
    'product.trash.busy': 'Odota…',
    'product.trash.ariaLabel': 'Siirrä tuote roskakoriin',
    'product.trash.buttonTitle': 'Roskakori',
    'product.trash.error': 'Tuotetta ei voitu siirtää roskakoriin',
    'product.trash.errorRetry': '{error} Yritä uudelleen tai peruuta.',
    'product.trash.defaultName': 'tämä tuote',
    'confirm.closeDialog': 'Sulje valintaikkuna',
  },
  uk: {
    'product.trash.confirmTitle': 'Перемістити в кошик?',
    'product.trash.confirmMessage':
      'Перемістити «{name}» у кошик? Товар буде приховано в магазині, але його можна відновити в Admin → Продукти.',
    'product.trash.confirmButton': 'У кошик',
    'product.trash.cancel': 'Скасувати',
    'product.trash.busy': 'Зачекайте…',
    'product.trash.ariaLabel': 'Перемістити товар у кошик',
    'product.trash.buttonTitle': 'Кошик',
    'product.trash.error': 'Не вдалося перемістити товар у кошик',
    'product.trash.errorRetry': '{error} Спробуйте знову або скасуйте.',
    'product.trash.defaultName': 'цей товар',
    'confirm.closeDialog': 'Закрити діалог',
  },
  ru: {
    'product.trash.confirmTitle': 'Переместить в корзину?',
    'product.trash.confirmMessage':
      'Переместить «{name}» в корзину? Товар будет скрыт в магазине, но его можно восстановить в Admin → Продукты.',
    'product.trash.confirmButton': 'В корзину',
    'product.trash.cancel': 'Отмена',
    'product.trash.busy': 'Подождите…',
    'product.trash.ariaLabel': 'Переместить товар в корзину',
    'product.trash.buttonTitle': 'Корзина',
    'product.trash.error': 'Не удалось переместить товар в корзину',
    'product.trash.errorRetry': '{error} Повторите попытку или отмените.',
    'product.trash.defaultName': 'этот товар',
    'confirm.closeDialog': 'Закрыть окно',
  },
  tr: {
    'product.trash.confirmTitle': 'Çöpe taşınsın mı?',
    'product.trash.confirmMessage':
      '«{name}» çöpe taşınsın mı? Mağazada gizlenir ancak Admin → Ürünler bölümünden geri yüklenebilir.',
    'product.trash.confirmButton': 'Çöpe taşı',
    'product.trash.cancel': 'İptal',
    'product.trash.busy': 'Lütfen bekleyin…',
    'product.trash.ariaLabel': 'Ürünü çöpe taşı',
    'product.trash.buttonTitle': 'Çöp',
    'product.trash.error': 'Ürün çöpe taşınamadı',
    'product.trash.errorRetry': '{error} Tekrar deneyin veya iptal edin.',
    'product.trash.defaultName': 'bu ürün',
    'confirm.closeDialog': 'Pencereyi kapat',
  },
  he: {
    'product.trash.confirmTitle': 'להעביר לפח האשפה?',
    'product.trash.confirmMessage':
      'להעביר את «{name}» לפח האשפה? המוצר יוסתר מהחנות, אך ניתן לשחזר מ-Admin → מוצרים.',
    'product.trash.confirmButton': 'העבר לפח',
    'product.trash.cancel': 'ביטול',
    'product.trash.busy': 'המתן…',
    'product.trash.ariaLabel': 'העבר מוצר לפח האשפה',
    'product.trash.buttonTitle': 'פח אשפה',
    'product.trash.error': 'לא ניתן להעביר את המוצר לפח האשפה',
    'product.trash.errorRetry': '{error} נסה שוב או בטל.',
    'product.trash.defaultName': 'מוצר זה',
    'confirm.closeDialog': 'סגור חלון',
  },
  ja: {
    'product.trash.confirmTitle': 'ゴミ箱に移動しますか？',
    'product.trash.confirmMessage':
      '「{name}」をゴミ箱に移動しますか？ショップから非表示になりますが、Admin → 商品から復元できます。',
    'product.trash.confirmButton': 'ゴミ箱へ移動',
    'product.trash.cancel': 'キャンセル',
    'product.trash.busy': 'お待ちください…',
    'product.trash.ariaLabel': '商品をゴミ箱に移動',
    'product.trash.buttonTitle': 'ゴミ箱',
    'product.trash.error': '商品をゴミ箱に移動できませんでした',
    'product.trash.errorRetry': '{error} 再試行するかキャンセルしてください。',
    'product.trash.defaultName': 'この商品',
    'confirm.closeDialog': 'ダイアログを閉じる',
  },
  zh: {
    'product.trash.confirmTitle': '移到回收站？',
    'product.trash.confirmMessage':
      '将「{name}」移到回收站？它将从商店隐藏，但可在 Admin → 产品 中恢复。',
    'product.trash.confirmButton': '移到回收站',
    'product.trash.cancel': '取消',
    'product.trash.busy': '请稍候…',
    'product.trash.ariaLabel': '将产品移到回收站',
    'product.trash.buttonTitle': '回收站',
    'product.trash.error': '无法将产品移到回收站',
    'product.trash.errorRetry': '{error} 请重试或取消。',
    'product.trash.defaultName': '此产品',
    'confirm.closeDialog': '关闭对话框',
  },
  ka: {
    'product.trash.confirmTitle': 'წავშალოთ ნაგვის ყუთში?',
    'product.trash.confirmMessage':
      'გადავიტანოთ «{name}» ნაგვის ყუთში? ის დამალული იქნება მაღაზიაში, მაგრამ აღდგება Admin → პროდუქტები-დან.',
    'product.trash.confirmButton': 'ნაგვის ყუთში',
    'product.trash.cancel': 'გაუქმება',
    'product.trash.busy': 'გთხოვთ დაელოდოთ…',
    'product.trash.ariaLabel': 'პროდუქტის ნაგვის ყუთში გადატანა',
    'product.trash.buttonTitle': 'ნაგვის ყუთი',
    'product.trash.error': 'პროდუქტი ვერ გადავიდა ნაგვის ყუთში',
    'product.trash.errorRetry': '{error} სცადეთ ხელახლა ან გააუქმეთ.',
    'product.trash.defaultName': 'ეს პროდუქტი',
    'confirm.closeDialog': 'დიალოგის დახურვა',
  },
  hy: {
    'product.trash.confirmTitle': 'Տեղափոխե՞լ աղբարկղ:',
    'product.trash.confirmMessage':
      'Տեղափոխե՞լ «{name}» աղբարկղ: Այն կթաքցվի խանութից, բայց կարելի է վերականգնել Admin → Ապրանքներ բաժնից:',
    'product.trash.confirmButton': 'Աղբարկղ',
    'product.trash.cancel': 'Չեղարկել',
    'product.trash.busy': 'Խնդրում ենք սպասել…',
    'product.trash.ariaLabel': 'Ապրանքը աղբարկղ տեղափոխել',
    'product.trash.buttonTitle': 'Աղբարկղ',
    'product.trash.error': 'Հնարավոր չեղավ ապրանքը աղբարկղ տեղափոխել',
    'product.trash.errorRetry': '{error} Կրկին փորձեք կամ չեղարկեք:',
    'product.trash.defaultName': 'այս ապրանքը',
    'confirm.closeDialog': 'Փակել պատուհանը',
  },
  az: {
    'product.trash.confirmTitle': 'Zibil qutusuna köçürülsün?',
    'product.trash.confirmMessage':
      '«{name}» zibil qutusuna köçürülsün? Mağazada gizlənəcək, lakin Admin → Məhsullar bölməsindən bərpa oluna bilər.',
    'product.trash.confirmButton': 'Zibil qutusuna',
    'product.trash.cancel': 'Ləğv et',
    'product.trash.busy': 'Gözləyin…',
    'product.trash.ariaLabel': 'Məhsulu zibil qutusuna köçür',
    'product.trash.buttonTitle': 'Zibil qutusu',
    'product.trash.error': 'Məhsul zibil qutusuna köçürülə bilmədi',
    'product.trash.errorRetry': '{error} Yenidən cəhd edin və ya ləğv edin.',
    'product.trash.defaultName': 'bu məhsul',
    'confirm.closeDialog': 'Pəncərəni bağla',
  },
}

const AR: ProductTrashMessages = {
  'product.trash.confirmTitle': 'نقل إلى سلة المحذوفات؟',
  'product.trash.confirmMessage':
    'نقل «{name}» إلى سلة المحذوفات؟ سيُخفى من المتجر ويمكن استعادته من Admin → المنتجات.',
  'product.trash.confirmButton': 'نقل إلى السلة',
  'product.trash.cancel': 'إلغاء',
  'product.trash.busy': 'يرجى الانتظار…',
  'product.trash.ariaLabel': 'نقل المنتج إلى سلة المحذوفات',
  'product.trash.buttonTitle': 'سلة المحذوفات',
  'product.trash.error': 'تعذّر نقل المنتج إلى سلة المحذوفات',
  'product.trash.errorRetry': '{error} أعد المحاولة أو ألغِ.',
  'product.trash.defaultName': 'هذا المنتج',
  'confirm.closeDialog': 'إغلاق النافذة',
}

for (const code of ['eg', 'at', 'ps', 'ma', 'dz'] as Locale[]) {
  BY_LOCALE[code] = AR
}

export const PRODUCT_TRASH_MESSAGE_OVERLAYS: Partial<Record<Locale, ProductTrashMessages>> =
  BY_LOCALE

export function getProductTrashMessages(locale: Locale): ProductTrashMessages {
  return PRODUCT_TRASH_MESSAGE_OVERLAYS[locale] ?? PRODUCT_TRASH_MESSAGE_OVERLAYS.en ?? EN
}

const TRASH_API_ERRORS: Record<string, ProductTrashMessageKey> = {
  'Could not move product to trash': 'product.trash.error',
  'Failed to delete product': 'product.trash.error',
  'Failed to delete products': 'product.trash.error',
  'Bulk delete failed': 'product.trash.error',
}

/** Map English API error strings to localized trash messages. */
export function translateTrashApiError(
  apiError: string | undefined,
  t: (key: string) => string
): string {
  const raw = (apiError ?? '').trim()
  const key = TRASH_API_ERRORS[raw]
  if (key) return t(key)
  if (!raw) return t('product.trash.error')
  if (/trash|delete/i.test(raw)) return t('product.trash.error')
  return raw
}
