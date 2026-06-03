import type { Locale } from '@/lib/i18n-locale-registry'

/** Site-access + pricelist gate copy (merged last in getMessages). */
export type AccessOverlayKey =
  | 'siteAccess.passwordPlaceholder'
  | 'pricelist.access.hintPlatform'
  | 'pricelist.access.hintOwner'

type PricelistHintsOverlay = Pick<
  AccessOverlay,
  'pricelist.access.hintPlatform' | 'pricelist.access.hintOwner'
>

type AccessOverlay = Record<AccessOverlayKey, string>

const EN: PricelistHintsOverlay = {
  'pricelist.access.hintPlatform':
    'Enter the pricelist password (not your site or account password).',
  'pricelist.access.hintOwner':
    'Enter the list owner’s pricelist password (not your site or account password).',
}

const OVERLAY_BY_LOCALE: Partial<Record<Locale, PricelistHintsOverlay>> = {
  en: EN,  nl: {
    'pricelist.access.hintPlatform':
      'Vul het prijslijst-wachtwoord in (niet uw site- of accountwachtwoord).',
    'pricelist.access.hintOwner':
      'Vul het prijslijst-wachtwoord van de eigenaar in (niet uw site- of accountwachtwoord).',
  },
  de: {
    'pricelist.access.hintPlatform':
      'Geben Sie das Preislisten-Passwort ein (nicht Ihr Website- oder Kontopasswort).',
    'pricelist.access.hintOwner':
      'Geben Sie das Preislisten-Passwort des Listeninhabers ein (nicht Ihr Website- oder Kontopasswort).',
  },
  fr: {
    'pricelist.access.hintPlatform':
      'Saisissez le mot de passe de la liste de prix (pas votre mot de passe de site ou de compte).',
    'pricelist.access.hintOwner':
      'Saisissez le mot de passe de la liste du propriétaire (pas votre mot de passe de site ou de compte).',
  },
  es: {
    'pricelist.access.hintPlatform':
      'Introduce la contraseña de la lista de precios (no la de tu sitio ni de tu cuenta).',
    'pricelist.access.hintOwner':
      'Introduce la contraseña de la lista del propietario (no la de tu sitio ni de tu cuenta).',
  },
  it: {
    'pricelist.access.hintPlatform':
      'Inserisci la password del listino (non la password del sito o dell’account).',
    'pricelist.access.hintOwner':
      'Inserisci la password del listino del proprietario (non la password del sito o dell’account).',
  },
  pt: {
    'pricelist.access.hintPlatform':
      'Introduza a palavra-passe da lista de preços (não a do site nem da conta).',
    'pricelist.access.hintOwner':
      'Introduza a palavra-passe da lista do proprietário (não a do site nem da conta).',
  },
  gr: {
    'pricelist.access.hintPlatform':
      'Εισαγάγετε τον κωδικό του τιμοκαταλόγου (όχι κωδικό ιστότοπου ή λογαριασμού).',
    'pricelist.access.hintOwner':
      'Εισαγάγετε τον κωδικό του τιμοκαταλόγου του κατόχου (όχι κωδικό ιστότοπου ή λογαριασμού).',
  },
  pl: {
    'pricelist.access.hintPlatform':
      'Wprowadź hasło cennika (nie hasło do strony ani konta).',
    'pricelist.access.hintOwner':
      'Wprowadź hasło cennika właściciela listy (nie hasło do strony ani konta).',
  },
  cz: {
    'pricelist.access.hintPlatform':
      'Zadejte heslo ceníku (ne heslo k webu ani k účtu).',
    'pricelist.access.hintOwner':
      'Zadejte heslo ceníku vlastníka seznamu (ne heslo k webu ani k účtu).',
  },
  sk: {
    'pricelist.access.hintPlatform':
      'Zadajte heslo cenníka (nie heslo k webu ani k účtu).',
    'pricelist.access.hintOwner':
      'Zadajte heslo cenníka vlastníka zoznamu (nie heslo k webu ani k účtu).',
  },
  hu: {
    'pricelist.access.hintPlatform':
      'Adja meg az árlista jelszavát (nem a webhely vagy fiók jelszavát).',
    'pricelist.access.hintOwner':
      'Adja meg a lista tulajdonosának árlista-jelszavát (nem a webhely vagy fiók jelszavát).',
  },
  ro: {
    'pricelist.access.hintPlatform':
      'Introduceți parola listei de prețuri (nu parola site-ului sau a contului).',
    'pricelist.access.hintOwner':
      'Introduceți parola listei proprietarului (nu parola site-ului sau a contului).',
  },
  bg: {
    'pricelist.access.hintPlatform':
      'Въведете паролата на ценовата листа (не паролата на сайта или акаунта).',
    'pricelist.access.hintOwner':
      'Въведете паролата на ценовата листа на собственика (не паролата на сайта или акаунта).',
  },
  hr: {
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenika (ne lozinku stranice ili računa).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenika vlasnika liste (ne lozinku stranice ili računa).',
  },
  sr: {
    'pricelist.access.hintPlatform':
      'Унесите лозинку ценовника (не лозинку сајта или налога).',
    'pricelist.access.hintOwner':
      'Унесите лозинку ценовника власника листе (не лозинку сајта или налога).',
  },
  ba: {
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenovnika (ne lozinku stranice ili računa).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenovnika vlasnika liste (ne lozinku stranice ili računa).',
  },
  me: {
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenovnika (ne lozinku sajta ili naloga).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenovnika vlasnika liste (ne lozinku sajta ili naloga).',
  },
  sq: {
    'pricelist.access.hintPlatform':
      'Vendosni fjalëkalimin e listës së çmimeve (jo të sajtit ose llogarisë).',
    'pricelist.access.hintOwner':
      'Vendosni fjalëkalimin e listës së pronarit (jo të sajtit ose llogarisë).',
  },
  mk: {
    'pricelist.access.hintPlatform':
      'Внесете ја лозинката на ценовникот (не лозинка на сајт или сметка).',
    'pricelist.access.hintOwner':
      'Внесете ја лозинката на ценовникот на сопственикот (не лозинка на сајт или сметка).',
  },
  lt: {
    'pricelist.access.hintPlatform':
      'Įveskite kainyno slaptažodį (ne svetainės ar paskyros slaptažodį).',
    'pricelist.access.hintOwner':
      'Įveskite sąrašo savininko kainyno slaptažodį (ne svetainės ar paskyros slaptažodį).',
  },
  da: {
    'pricelist.access.hintPlatform':
      'Indtast prislistens adgangskode (ikke din websteds- eller konto-adgangskode).',
    'pricelist.access.hintOwner':
      'Indtast liste-ejerens prisliste-adgangskode (ikke din websteds- eller konto-adgangskode).',
  },
  sv: {
    'pricelist.access.hintPlatform':
      'Ange prislistans lösenord (inte ditt webbplats- eller kontolösenord).',
    'pricelist.access.hintOwner':
      'Ange listägarens prisliste-lösenord (inte ditt webbplats- eller kontolösenord).',
  },
  nb: {
    'pricelist.access.hintPlatform':
      'Skriv inn prislistepassordet (ikke nettsted- eller kontopassord).',
    'pricelist.access.hintOwner':
      'Skriv inn listeierens prislistepassord (ikke nettsted- eller kontopassord).',
  },
  fi: {
    'pricelist.access.hintPlatform':
      'Syötä hinnaston salasana (ei sivuston tai tilin salasanaa).',
    'pricelist.access.hintOwner':
      'Syötä listan omistajan hinnaston salasana (ei sivuston tai tilin salasanaa).',
  },
  uk: {
    'pricelist.access.hintPlatform':
      'Введіть пароль прайс-листа (не пароль сайту чи облікового запису).',
    'pricelist.access.hintOwner':
      'Введіть пароль прайс-листа власника списку (не пароль сайту чи облікового запису).',
  },
  ru: {
    'pricelist.access.hintPlatform':
      'Введите пароль прайс-листа (не пароль сайта или учётной записи).',
    'pricelist.access.hintOwner':
      'Введите пароль прайс-листа владельца списка (не пароль сайта или учётной записи).',
  },
  tr: {
    'pricelist.access.hintPlatform':
      'Fiyat listesi şifresini girin (site veya hesap şifreniz değil).',
    'pricelist.access.hintOwner':
      'Liste sahibinin fiyat listesi şifresini girin (site veya hesap şifreniz değil).',
  },
  he: {
    'pricelist.access.hintPlatform':
      'הזינו את סיסמת מחירון (לא סיסמת האתר או החשבון).',
    'pricelist.access.hintOwner':
      'הזינו את סיסמת מחירון של בעל הרשימה (לא סיסמת האתר או החשבון).',
  },
  ja: {
    'pricelist.access.hintPlatform':
      '価格表のパスワードを入力してください（サイトやアカウントのパスワードではありません）。',
    'pricelist.access.hintOwner':
      'リスト所有者の価格表パスワードを入力してください（サイトやアカウントのパスワードではありません）。',
  },
  zh: {
    'pricelist.access.hintPlatform':
      '请输入价格表密码（不是网站或账户密码）。',
    'pricelist.access.hintOwner':
      '请输入列表所有者的价格表密码（不是网站或账户密码）。',
  },
  ka: {
    'pricelist.access.hintPlatform':
      'შეიყვანეთ ფასების სიის პაროლი (არა საიტის ან ანგარიშის პაროლი).',
    'pricelist.access.hintOwner':
      'შეიყვანეთ სიის მფლობელის ფასების სიის პაროლი (არა საიტის ან ანგარიშის პაროლი).',
  },
  hy: {
    'pricelist.access.hintPlatform':
      'Մուտքագրեք գնացուցակի գաղտնաբառը (ոչ կայքի կամ հաշվի գաղտնաբառը)։',
    'pricelist.access.hintOwner':
      'Մուտքագրեք ցանկի սեփականատիրոջ գնացուցակի գաղտնաբառը (ոչ կայքի կամ հաշվի գաղտնաբառը)։',
  },
  az: {
    'pricelist.access.hintPlatform':
      'Qiymət siyahısı şifrəsini daxil edin (sayt və ya hesab şifrəsi deyil).',
    'pricelist.access.hintOwner':
      'Siyahı sahibinin qiymət siyahısı şifrəsini daxil edin (sayt və ya hesab şifrəsi deyil).',
  },
}

const AR: PricelistHintsOverlay = {
  'pricelist.access.hintPlatform':
    'أدخل كلمة مرور قائمة الأسعار (وليس كلمة مرور الموقع أو الحساب).',
  'pricelist.access.hintOwner':
    'أدخل كلمة مرور قائمة الأسعار الخاصة بالمالك (وليس كلمة مرور الموقع أو الحساب).',
}

for (const code of ['eg', 'at', 'ps', 'ma', 'dz'] as Locale[]) {
  OVERLAY_BY_LOCALE[code] = AR
}

export function getAccessOverlay(locale: Locale): Record<string, string> {
  const overlay = OVERLAY_BY_LOCALE[locale] ?? OVERLAY_BY_LOCALE.en ?? EN
  return { ...overlay, 'siteAccess.passwordPlaceholder': '0000' }
}
