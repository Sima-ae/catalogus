import type { Locale } from '@/lib/i18n-locale-registry'

/** Site-access + pricelist gate copy (merged last in getMessages). */
export type AccessOverlayKey =
  | 'siteAccess.intro'
  | 'siteAccess.passwordLabel'
  | 'siteAccess.passwordPlaceholder'
  | 'pricelist.access.hintPlatform'
  | 'pricelist.access.hintOwner'

type AccessOverlay = Record<AccessOverlayKey, string>

const EN: AccessOverlay = {
  'siteAccess.intro': 'Enter the password to continue.',
  'siteAccess.passwordLabel': 'Password for site access',
  'siteAccess.passwordPlaceholder': 'Password',
  'pricelist.access.hintPlatform':
    'Enter the pricelist password (not your site or account password).',
  'pricelist.access.hintOwner':
    'Enter the list owner’s pricelist password (not your site or account password).',
}

const OVERLAY_BY_LOCALE: Partial<Record<Locale, AccessOverlay>> = {
  en: EN,
  nl: {
    'siteAccess.intro': 'Vul het wachtwoord in om door te gaan.',
    'siteAccess.passwordLabel': 'Wachtwoord voor toegang tot de site',
    'siteAccess.passwordPlaceholder': 'Wachtwoord',
    'pricelist.access.hintPlatform':
      'Vul het prijslijst-wachtwoord in (niet uw site- of accountwachtwoord).',
    'pricelist.access.hintOwner':
      'Vul het prijslijst-wachtwoord van de eigenaar in (niet uw site- of accountwachtwoord).',
  },
  de: {
    'siteAccess.intro': 'Geben Sie das Passwort ein, um fortzufahren.',
    'siteAccess.passwordLabel': 'Passwort für den Zugang zur Website',
    'siteAccess.passwordPlaceholder': 'Passwort',
    'pricelist.access.hintPlatform':
      'Geben Sie das Preislisten-Passwort ein (nicht Ihr Website- oder Kontopasswort).',
    'pricelist.access.hintOwner':
      'Geben Sie das Preislisten-Passwort des Listeninhabers ein (nicht Ihr Website- oder Kontopasswort).',
  },
  fr: {
    'siteAccess.intro': 'Saisissez le mot de passe pour continuer.',
    'siteAccess.passwordLabel': 'Mot de passe d’accès au site',
    'siteAccess.passwordPlaceholder': 'Mot de passe',
    'pricelist.access.hintPlatform':
      'Saisissez le mot de passe de la liste de prix (pas votre mot de passe de site ou de compte).',
    'pricelist.access.hintOwner':
      'Saisissez le mot de passe de la liste du propriétaire (pas votre mot de passe de site ou de compte).',
  },
  es: {
    'siteAccess.intro': 'Introduce la contraseña para continuar.',
    'siteAccess.passwordLabel': 'Contraseña de acceso al sitio',
    'siteAccess.passwordPlaceholder': 'Contraseña',
    'pricelist.access.hintPlatform':
      'Introduce la contraseña de la lista de precios (no la de tu sitio ni de tu cuenta).',
    'pricelist.access.hintOwner':
      'Introduce la contraseña de la lista del propietario (no la de tu sitio ni de tu cuenta).',
  },
  it: {
    'siteAccess.intro': 'Inserisci la password per continuare.',
    'siteAccess.passwordLabel': 'Password di accesso al sito',
    'siteAccess.passwordPlaceholder': 'Password',
    'pricelist.access.hintPlatform':
      'Inserisci la password del listino (non la password del sito o dell’account).',
    'pricelist.access.hintOwner':
      'Inserisci la password del listino del proprietario (non la password del sito o dell’account).',
  },
  pt: {
    'siteAccess.intro': 'Introduza a palavra-passe para continuar.',
    'siteAccess.passwordLabel': 'Palavra-passe de acesso ao site',
    'siteAccess.passwordPlaceholder': 'Palavra-passe',
    'pricelist.access.hintPlatform':
      'Introduza a palavra-passe da lista de preços (não a do site nem da conta).',
    'pricelist.access.hintOwner':
      'Introduza a palavra-passe da lista do proprietário (não a do site nem da conta).',
  },
  gr: {
    'siteAccess.intro': 'Εισαγάγετε τον κωδικό για να συνεχίσετε.',
    'siteAccess.passwordLabel': 'Κωδικός πρόσβασης στον ιστότοπο',
    'siteAccess.passwordPlaceholder': 'Κωδικός',
    'pricelist.access.hintPlatform':
      'Εισαγάγετε τον κωδικό του τιμοκαταλόγου (όχι κωδικό ιστότοπου ή λογαριασμού).',
    'pricelist.access.hintOwner':
      'Εισαγάγετε τον κωδικό του τιμοκαταλόγου του κατόχου (όχι κωδικό ιστότοπου ή λογαριασμού).',
  },
  pl: {
    'siteAccess.intro': 'Wprowadź hasło, aby kontynuować.',
    'siteAccess.passwordLabel': 'Hasło dostępu do witryny',
    'siteAccess.passwordPlaceholder': 'Hasło',
    'pricelist.access.hintPlatform':
      'Wprowadź hasło cennika (nie hasło do strony ani konta).',
    'pricelist.access.hintOwner':
      'Wprowadź hasło cennika właściciela listy (nie hasło do strony ani konta).',
  },
  cz: {
    'siteAccess.intro': 'Pro pokračování zadejte heslo.',
    'siteAccess.passwordLabel': 'Heslo pro přístup k webu',
    'siteAccess.passwordPlaceholder': 'Heslo',
    'pricelist.access.hintPlatform':
      'Zadejte heslo ceníku (ne heslo k webu ani k účtu).',
    'pricelist.access.hintOwner':
      'Zadejte heslo ceníku vlastníka seznamu (ne heslo k webu ani k účtu).',
  },
  sk: {
    'siteAccess.intro': 'Na pokračovanie zadajte heslo.',
    'siteAccess.passwordLabel': 'Heslo pre prístup k webu',
    'siteAccess.passwordPlaceholder': 'Heslo',
    'pricelist.access.hintPlatform':
      'Zadajte heslo cenníka (nie heslo k webu ani k účtu).',
    'pricelist.access.hintOwner':
      'Zadajte heslo cenníka vlastníka zoznamu (nie heslo k webu ani k účtu).',
  },
  hu: {
    'siteAccess.intro': 'A folytatáshoz adja meg a jelszót.',
    'siteAccess.passwordLabel': 'Jelszó a webhelyhez való hozzáféréshez',
    'siteAccess.passwordPlaceholder': 'Jelszó',
    'pricelist.access.hintPlatform':
      'Adja meg az árlista jelszavát (nem a webhely vagy fiók jelszavát).',
    'pricelist.access.hintOwner':
      'Adja meg a lista tulajdonosának árlista-jelszavát (nem a webhely vagy fiók jelszavát).',
  },
  ro: {
    'siteAccess.intro': 'Introduceți parola pentru a continua.',
    'siteAccess.passwordLabel': 'Parolă de acces la site',
    'siteAccess.passwordPlaceholder': 'Parolă',
    'pricelist.access.hintPlatform':
      'Introduceți parola listei de prețuri (nu parola site-ului sau a contului).',
    'pricelist.access.hintOwner':
      'Introduceți parola listei proprietarului (nu parola site-ului sau a contului).',
  },
  bg: {
    'siteAccess.intro': 'Въведете паролата, за да продължите.',
    'siteAccess.passwordLabel': 'Парола за достъп до сайта',
    'siteAccess.passwordPlaceholder': 'Парола',
    'pricelist.access.hintPlatform':
      'Въведете паролата на ценовата листа (не паролата на сайта или акаунта).',
    'pricelist.access.hintOwner':
      'Въведете паролата на ценовата листа на собственика (не паролата на сайта или акаунта).',
  },
  hr: {
    'siteAccess.intro': 'Unesite lozinku za nastavak.',
    'siteAccess.passwordLabel': 'Lozinka za pristup stranici',
    'siteAccess.passwordPlaceholder': 'Lozinka',
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenika (ne lozinku stranice ili računa).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenika vlasnika liste (ne lozinku stranice ili računa).',
  },
  sr: {
    'siteAccess.intro': 'Унесите лозинку да бисте наставили.',
    'siteAccess.passwordLabel': 'Лозинка за приступ сајту',
    'siteAccess.passwordPlaceholder': 'Лозинка',
    'pricelist.access.hintPlatform':
      'Унесите лозинку ценовника (не лозинку сајта или налога).',
    'pricelist.access.hintOwner':
      'Унесите лозинку ценовника власника листе (не лозинку сајта или налога).',
  },
  ba: {
    'siteAccess.intro': 'Unesite lozinku za nastavak.',
    'siteAccess.passwordLabel': 'Lozinka za pristup stranici',
    'siteAccess.passwordPlaceholder': 'Lozinka',
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenovnika (ne lozinku stranice ili računa).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenovnika vlasnika liste (ne lozinku stranice ili računa).',
  },
  me: {
    'siteAccess.intro': 'Unesite lozinku za nastavak.',
    'siteAccess.passwordLabel': 'Lozinka za pristup sajtu',
    'siteAccess.passwordPlaceholder': 'Lozinka',
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenovnika (ne lozinku sajta ili naloga).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenovnika vlasnika liste (ne lozinku sajta ili naloga).',
  },
  sq: {
    'siteAccess.intro': 'Vendosni fjalëkalimin për të vazhduar.',
    'siteAccess.passwordLabel': 'Fjalëkalimi i aksesit në sajt',
    'siteAccess.passwordPlaceholder': 'Fjalëkalimi',
    'pricelist.access.hintPlatform':
      'Vendosni fjalëkalimin e listës së çmimeve (jo të sajtit ose llogarisë).',
    'pricelist.access.hintOwner':
      'Vendosni fjalëkalimin e listës së pronarit (jo të sajtit ose llogarisë).',
  },
  mk: {
    'siteAccess.intro': 'Внесете ја лозинката за да продолжите.',
    'siteAccess.passwordLabel': 'Лозинка за пристап на сајтот',
    'siteAccess.passwordPlaceholder': 'Лозинка',
    'pricelist.access.hintPlatform':
      'Внесете ја лозинката на ценовникот (не лозинка на сајт или сметка).',
    'pricelist.access.hintOwner':
      'Внесете ја лозинката на ценовникот на сопственикот (не лозинка на сајт или сметка).',
  },
  lt: {
    'siteAccess.intro': 'Įveskite slaptažodį, norėdami tęsti.',
    'siteAccess.passwordLabel': 'Slaptažodis prieigai prie svetainės',
    'siteAccess.passwordPlaceholder': 'Slaptažodis',
    'pricelist.access.hintPlatform':
      'Įveskite kainyno slaptažodį (ne svetainės ar paskyros slaptažodį).',
    'pricelist.access.hintOwner':
      'Įveskite sąrašo savininko kainyno slaptažodį (ne svetainės ar paskyros slaptažodį).',
  },
  da: {
    'siteAccess.intro': 'Indtast adgangskoden for at fortsætte.',
    'siteAccess.passwordLabel': 'Adgangskode til webstedet',
    'siteAccess.passwordPlaceholder': 'Adgangskode',
    'pricelist.access.hintPlatform':
      'Indtast prislistens adgangskode (ikke din websteds- eller konto-adgangskode).',
    'pricelist.access.hintOwner':
      'Indtast liste-ejerens prisliste-adgangskode (ikke din websteds- eller konto-adgangskode).',
  },
  sv: {
    'siteAccess.intro': 'Ange lösenordet för att fortsätta.',
    'siteAccess.passwordLabel': 'Lösenord för åtkomst till webbplatsen',
    'siteAccess.passwordPlaceholder': 'Lösenord',
    'pricelist.access.hintPlatform':
      'Ange prislistans lösenord (inte ditt webbplats- eller kontolösenord).',
    'pricelist.access.hintOwner':
      'Ange listägarens prisliste-lösenord (inte ditt webbplats- eller kontolösenord).',
  },
  nb: {
    'siteAccess.intro': 'Skriv inn passordet for å fortsette.',
    'siteAccess.passwordLabel': 'Passord for tilgang til nettstedet',
    'siteAccess.passwordPlaceholder': 'Passord',
    'pricelist.access.hintPlatform':
      'Skriv inn prislistepassordet (ikke nettsted- eller kontopassord).',
    'pricelist.access.hintOwner':
      'Skriv inn listeierens prislistepassord (ikke nettsted- eller kontopassord).',
  },
  fi: {
    'siteAccess.intro': 'Syötä salasana jatkaaksesi.',
    'siteAccess.passwordLabel': 'Salasana sivuston käyttöön',
    'siteAccess.passwordPlaceholder': 'Salasana',
    'pricelist.access.hintPlatform':
      'Syötä hinnaston salasana (ei sivuston tai tilin salasanaa).',
    'pricelist.access.hintOwner':
      'Syötä listan omistajan hinnaston salasana (ei sivuston tai tilin salasanaa).',
  },
  uk: {
    'siteAccess.intro': 'Введіть пароль, щоб продовжити.',
    'siteAccess.passwordLabel': 'Пароль доступу до сайту',
    'siteAccess.passwordPlaceholder': 'Пароль',
    'pricelist.access.hintPlatform':
      'Введіть пароль прайс-листа (не пароль сайту чи облікового запису).',
    'pricelist.access.hintOwner':
      'Введіть пароль прайс-листа власника списку (не пароль сайту чи облікового запису).',
  },
  ru: {
    'siteAccess.intro': 'Введите пароль, чтобы продолжить.',
    'siteAccess.passwordLabel': 'Пароль доступа к сайту',
    'siteAccess.passwordPlaceholder': 'Пароль',
    'pricelist.access.hintPlatform':
      'Введите пароль прайс-листа (не пароль сайта или учётной записи).',
    'pricelist.access.hintOwner':
      'Введите пароль прайс-листа владельца списка (не пароль сайта или учётной записи).',
  },
  tr: {
    'siteAccess.intro': 'Devam etmek için şifreyi girin.',
    'siteAccess.passwordLabel': 'Site erişim şifresi',
    'siteAccess.passwordPlaceholder': 'Şifre',
    'pricelist.access.hintPlatform':
      'Fiyat listesi şifresini girin (site veya hesap şifreniz değil).',
    'pricelist.access.hintOwner':
      'Liste sahibinin fiyat listesi şifresini girin (site veya hesap şifreniz değil).',
  },
  he: {
    'siteAccess.intro': 'הזינו את הסיסמה כדי להמשיך.',
    'siteAccess.passwordLabel': 'סיסמה לגישה לאתר',
    'siteAccess.passwordPlaceholder': 'סיסמה',
    'pricelist.access.hintPlatform':
      'הזינו את סיסמת מחירון (לא סיסמת האתר או החשבון).',
    'pricelist.access.hintOwner':
      'הזינו את סיסמת מחירון של בעל הרשימה (לא סיסמת האתר או החשבון).',
  },
  ja: {
    'siteAccess.intro': '続行するにはパスワードを入力してください。',
    'siteAccess.passwordLabel': 'サイトアクセス用パスワード',
    'siteAccess.passwordPlaceholder': 'パスワード',
    'pricelist.access.hintPlatform':
      '価格表のパスワードを入力してください（サイトやアカウントのパスワードではありません）。',
    'pricelist.access.hintOwner':
      'リスト所有者の価格表パスワードを入力してください（サイトやアカウントのパスワードではありません）。',
  },
  zh: {
    'siteAccess.intro': '请输入密码以继续。',
    'siteAccess.passwordLabel': '网站访问密码',
    'siteAccess.passwordPlaceholder': '密码',
    'pricelist.access.hintPlatform':
      '请输入价格表密码（不是网站或账户密码）。',
    'pricelist.access.hintOwner':
      '请输入列表所有者的价格表密码（不是网站或账户密码）。',
  },
  ka: {
    'siteAccess.intro': 'გასაგრძელებლად შეიყვანეთ პაროლი.',
    'siteAccess.passwordLabel': 'პაროლი საიტზე წვდომისთვის',
    'siteAccess.passwordPlaceholder': 'პაროლი',
    'pricelist.access.hintPlatform':
      'შეიყვანეთ ფასების სიის პაროლი (არა საიტის ან ანგარიშის პაროლი).',
    'pricelist.access.hintOwner':
      'შეიყვანეთ სიის მფლობელის ფასების სიის პაროლი (არა საიტის ან ანგარიშის პაროლი).',
  },
  hy: {
    'siteAccess.intro': 'Շարունակելու համար մուտքագրեք գաղտնաբառը։',
    'siteAccess.passwordLabel': 'Կայք մուտքի գաղտնաբառ',
    'siteAccess.passwordPlaceholder': 'Գաղտնաբառ',
    'pricelist.access.hintPlatform':
      'Մուտքագրեք գնացուցակի գաղտնաբառը (ոչ կայքի կամ հաշվի գաղտնաբառը)։',
    'pricelist.access.hintOwner':
      'Մուտքագրեք ցանկի սեփականատիրոջ գնացուցակի գաղտնաբառը (ոչ կայքի կամ հաշվի գաղտնաբառը)։',
  },
  az: {
    'siteAccess.intro': 'Davam etmək üçün şifrəni daxil edin.',
    'siteAccess.passwordLabel': 'Sayta giriş şifrəsi',
    'siteAccess.passwordPlaceholder': 'Şifrə',
    'pricelist.access.hintPlatform':
      'Qiymət siyahısı şifrəsini daxil edin (sayt və ya hesab şifrəsi deyil).',
    'pricelist.access.hintOwner':
      'Siyahı sahibinin qiymət siyahısı şifrəsini daxil edin (sayt və ya hesab şifrəsi deyil).',
  },
}

const AR: AccessOverlay = {
  'siteAccess.intro': 'أدخل كلمة المرور للمتابعة.',
  'siteAccess.passwordLabel': 'كلمة مرور الوصول إلى الموقع',
  'siteAccess.passwordPlaceholder': 'كلمة المرور',
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
  return overlay
}
