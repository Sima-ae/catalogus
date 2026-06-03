import type { Locale } from '@/lib/i18n-locale-registry'

/** Site-access + pricelist gate copy (merged last in getMessages). */
export type AccessOverlayKey =
  | 'siteAccess.intro'
  | 'siteAccess.passwordLabel'
  | 'siteAccess.passwordPlaceholder'
  | 'siteAccess.passwordRequired'
  | 'siteAccess.incorrectPassword'
  | 'pricelist.access.hintPlatform'
  | 'pricelist.access.hintOwner'

type AccessOverlay = Record<AccessOverlayKey, string>

const EN: AccessOverlay = {
  'siteAccess.intro': 'Enter your personal access code to continue.',
  'siteAccess.passwordLabel': 'Personal access code',
  'siteAccess.passwordPlaceholder': 'e.g. 0005',
  'siteAccess.passwordRequired': 'Access code is required',
  'siteAccess.incorrectPassword': 'Incorrect access code',
  'pricelist.access.hintPlatform':
    'Enter the pricelist password (not your site or account password).',
  'pricelist.access.hintOwner':
    'Enter the list owner’s pricelist password (not your site or account password).',
}

const OVERLAY_BY_LOCALE: Partial<Record<Locale, AccessOverlay>> = {
  en: EN,
  nl: {
    'siteAccess.intro': 'Vul uw persoonlijke toegangscode in om door te gaan.',
    'siteAccess.passwordLabel': 'Persoonlijke toegangscode',
    'siteAccess.passwordPlaceholder': 'bijv. 0005',
    'siteAccess.passwordRequired': 'Toegangscode is verplicht',
    'siteAccess.incorrectPassword': 'Onjuiste toegangscode',
    'pricelist.access.hintPlatform':
      'Vul het prijslijst-wachtwoord in (niet uw site- of accountwachtwoord).',
    'pricelist.access.hintOwner':
      'Vul het prijslijst-wachtwoord van de eigenaar in (niet uw site- of accountwachtwoord).',
  },
  de: {
    'siteAccess.intro': 'Geben Sie Ihren persönlichen Zugangscode ein, um fortzufahren.',
    'siteAccess.passwordLabel': 'Persönlicher Zugangscode',
    'siteAccess.passwordPlaceholder': 'z. B. 0005',
    'siteAccess.passwordRequired': 'Zugangscode ist erforderlich',
    'siteAccess.incorrectPassword': 'Falscher Zugangscode',
    'pricelist.access.hintPlatform':
      'Geben Sie das Preislisten-Passwort ein (nicht Ihr Website- oder Kontopasswort).',
    'pricelist.access.hintOwner':
      'Geben Sie das Preislisten-Passwort des Listeninhabers ein (nicht Ihr Website- oder Kontopasswort).',
  },
  fr: {
    'siteAccess.intro': 'Saisissez votre code d’accès personnel pour continuer.',
    'siteAccess.passwordLabel': 'Code d’accès personnel',
    'siteAccess.passwordPlaceholder': 'ex. 0005',
    'siteAccess.passwordRequired': 'Le code d’accès est obligatoire',
    'siteAccess.incorrectPassword': 'Code d’accès incorrect',
    'pricelist.access.hintPlatform':
      'Saisissez le mot de passe de la liste de prix (pas votre mot de passe de site ou de compte).',
    'pricelist.access.hintOwner':
      'Saisissez le mot de passe de la liste du propriétaire (pas votre mot de passe de site ou de compte).',
  },
  es: {
    'siteAccess.intro': 'Introduce tu código de acceso personal para continuar.',
    'siteAccess.passwordLabel': 'Código de acceso personal',
    'siteAccess.passwordPlaceholder': 'ej. 0005',
    'siteAccess.passwordRequired': 'El código de acceso es obligatorio',
    'siteAccess.incorrectPassword': 'Código de acceso incorrecto',
    'pricelist.access.hintPlatform':
      'Introduce la contraseña de la lista de precios (no la de tu sitio ni de tu cuenta).',
    'pricelist.access.hintOwner':
      'Introduce la contraseña de la lista del propietario (no la de tu sitio ni de tu cuenta).',
  },
  it: {
    'siteAccess.intro': 'Inserisci il tuo codice di accesso personale per continuare.',
    'siteAccess.passwordLabel': 'Codice di accesso personale',
    'siteAccess.passwordPlaceholder': 'es. 0005',
    'siteAccess.passwordRequired': 'Il codice di accesso è obbligatorio',
    'siteAccess.incorrectPassword': 'Codice di accesso errato',
    'pricelist.access.hintPlatform':
      'Inserisci la password del listino (non la password del sito o dell’account).',
    'pricelist.access.hintOwner':
      'Inserisci la password del listino del proprietario (non la password del sito o dell’account).',
  },
  pt: {
    'siteAccess.intro': 'Introduza o seu código de acesso pessoal para continuar.',
    'siteAccess.passwordLabel': 'Código de acesso pessoal',
    'siteAccess.passwordPlaceholder': 'ex. 0005',
    'siteAccess.passwordRequired': 'O código de acesso é obrigatório',
    'siteAccess.incorrectPassword': 'Código de acesso incorreto',
    'pricelist.access.hintPlatform':
      'Introduza a palavra-passe da lista de preços (não a do site nem da conta).',
    'pricelist.access.hintOwner':
      'Introduza a palavra-passe da lista do proprietário (não a do site nem da conta).',
  },
  gr: {
    'siteAccess.intro': 'Εισαγάγετε τον προσωπικό κωδικό πρόσβασης για να συνεχίσετε.',
    'siteAccess.passwordLabel': 'Προσωπικός κωδικός πρόσβασης',
    'siteAccess.passwordPlaceholder': 'π.χ. 0005',
    'siteAccess.passwordRequired': 'Ο κωδικός πρόσβασης είναι υποχρεωτικός',
    'siteAccess.incorrectPassword': 'Λανθασμένος κωδικός πρόσβασης',
    'pricelist.access.hintPlatform':
      'Εισαγάγετε τον κωδικό του τιμοκαταλόγου (όχι κωδικό ιστότοπου ή λογαριασμού).',
    'pricelist.access.hintOwner':
      'Εισαγάγετε τον κωδικό του τιμοκαταλόγου του κατόχου (όχι κωδικό ιστότοπου ή λογαριασμού).',
  },
  pl: {
    'siteAccess.intro': 'Wprowadź osobisty kod dostępu, aby kontynuować.',
    'siteAccess.passwordLabel': 'Osobisty kod dostępu',
    'siteAccess.passwordPlaceholder': 'np. 0005',
    'siteAccess.passwordRequired': 'Kod dostępu jest wymagany',
    'siteAccess.incorrectPassword': 'Nieprawidłowy kod dostępu',
    'pricelist.access.hintPlatform':
      'Wprowadź hasło cennika (nie hasło do strony ani konta).',
    'pricelist.access.hintOwner':
      'Wprowadź hasło cennika właściciela listy (nie hasło do strony ani konta).',
  },
  cz: {
    'siteAccess.intro': 'Pro pokračování zadejte osobní přístupový kód.',
    'siteAccess.passwordLabel': 'Osobní přístupový kód',
    'siteAccess.passwordPlaceholder': 'např. 0005',
    'siteAccess.passwordRequired': 'Přístupový kód je povinný',
    'siteAccess.incorrectPassword': 'Nesprávný přístupový kód',
    'pricelist.access.hintPlatform':
      'Zadejte heslo ceníku (ne heslo k webu ani k účtu).',
    'pricelist.access.hintOwner':
      'Zadejte heslo ceníku vlastníka seznamu (ne heslo k webu ani k účtu).',
  },
  sk: {
    'siteAccess.intro': 'Na pokračovanie zadajte osobný prístupový kód.',
    'siteAccess.passwordLabel': 'Osobný prístupový kód',
    'siteAccess.passwordPlaceholder': 'napr. 0005',
    'siteAccess.passwordRequired': 'Prístupový kód je povinný',
    'siteAccess.incorrectPassword': 'Nesprávny prístupový kód',
    'pricelist.access.hintPlatform':
      'Zadajte heslo cenníka (nie heslo k webu ani k účtu).',
    'pricelist.access.hintOwner':
      'Zadajte heslo cenníka vlastníka zoznamu (nie heslo k webu ani k účtu).',
  },
  hu: {
    'siteAccess.intro': 'A folytatáshoz adja meg személyes hozzáférési kódját.',
    'siteAccess.passwordLabel': 'Személyes hozzáférési kód',
    'siteAccess.passwordPlaceholder': 'pl. 0005',
    'siteAccess.passwordRequired': 'A hozzáférési kód kötelező',
    'siteAccess.incorrectPassword': 'Helytelen hozzáférési kód',
    'pricelist.access.hintPlatform':
      'Adja meg az árlista jelszavát (nem a webhely vagy fiók jelszavát).',
    'pricelist.access.hintOwner':
      'Adja meg a lista tulajdonosának árlista-jelszavát (nem a webhely vagy fiók jelszavát).',
  },
  ro: {
    'siteAccess.intro': 'Introduceți codul personal de acces pentru a continua.',
    'siteAccess.passwordLabel': 'Cod personal de acces',
    'siteAccess.passwordPlaceholder': 'ex. 0005',
    'siteAccess.passwordRequired': 'Codul de acces este obligatoriu',
    'siteAccess.incorrectPassword': 'Cod de acces incorect',
    'pricelist.access.hintPlatform':
      'Introduceți parola listei de prețuri (nu parola site-ului sau a contului).',
    'pricelist.access.hintOwner':
      'Introduceți parola listei proprietarului (nu parola site-ului sau a contului).',
  },
  bg: {
    'siteAccess.intro': 'Въведете личния си код за достъп, за да продължите.',
    'siteAccess.passwordLabel': 'Личен код за достъп',
    'siteAccess.passwordPlaceholder': 'напр. 0005',
    'siteAccess.passwordRequired': 'Кодът за достъп е задължителен',
    'siteAccess.incorrectPassword': 'Неверен код за достъп',
    'pricelist.access.hintPlatform':
      'Въведете паролата на ценовата листа (не паролата на сайта или акаунта).',
    'pricelist.access.hintOwner':
      'Въведете паролата на ценовата листа на собственика (не паролата на сайта или акаунта).',
  },
  hr: {
    'siteAccess.intro': 'Unesite svoj osobni pristupni kod za nastavak.',
    'siteAccess.passwordLabel': 'Osobni pristupni kod',
    'siteAccess.passwordPlaceholder': 'npr. 0005',
    'siteAccess.passwordRequired': 'Pristupni kod je obavezan',
    'siteAccess.incorrectPassword': 'Netočan pristupni kod',
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenika (ne lozinku stranice ili računa).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenika vlasnika liste (ne lozinku stranice ili računa).',
  },
  sr: {
    'siteAccess.intro': 'Унесите свој лични приступни код да бисте наставили.',
    'siteAccess.passwordLabel': 'Лични приступни код',
    'siteAccess.passwordPlaceholder': 'нпр. 0005',
    'siteAccess.passwordRequired': 'Приступни код је обавезан',
    'siteAccess.incorrectPassword': 'Нетачан приступни код',
    'pricelist.access.hintPlatform':
      'Унесите лозинку ценовника (не лозинку сајта или налога).',
    'pricelist.access.hintOwner':
      'Унесите лозинку ценовника власника листе (не лозинку сајта или налога).',
  },
  ba: {
    'siteAccess.intro': 'Unesite svoj lični pristupni kod da nastavite.',
    'siteAccess.passwordLabel': 'Lični pristupni kod',
    'siteAccess.passwordPlaceholder': 'npr. 0005',
    'siteAccess.passwordRequired': 'Pristupni kod je obavezan',
    'siteAccess.incorrectPassword': 'Pogrešan pristupni kod',
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenovnika (ne lozinku stranice ili računa).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenovnika vlasnika liste (ne lozinku stranice ili računa).',
  },
  me: {
    'siteAccess.intro': 'Unesite svoj lični pristupni kod da nastavite.',
    'siteAccess.passwordLabel': 'Lični pristupni kod',
    'siteAccess.passwordPlaceholder': 'npr. 0005',
    'siteAccess.passwordRequired': 'Pristupni kod je obavezan',
    'siteAccess.incorrectPassword': 'Pogrešan pristupni kod',
    'pricelist.access.hintPlatform':
      'Unesite lozinku cjenovnika (ne lozinku sajta ili naloga).',
    'pricelist.access.hintOwner':
      'Unesite lozinku cjenovnika vlasnika liste (ne lozinku sajta ili naloga).',
  },
  sq: {
    'siteAccess.intro': 'Vendosni kodin tuaj personal të aksesit për të vazhduar.',
    'siteAccess.passwordLabel': 'Kod personal aksesi',
    'siteAccess.passwordPlaceholder': 'p.sh. 0005',
    'siteAccess.passwordRequired': 'Kodi i aksesit është i detyrueshëm',
    'siteAccess.incorrectPassword': 'Kod aksesi i pasaktë',
    'pricelist.access.hintPlatform':
      'Vendosni fjalëkalimin e listës së çmimeve (jo të sajtit ose llogarisë).',
    'pricelist.access.hintOwner':
      'Vendosni fjalëkalimin e listës së pronarit (jo të sajtit ose llogarisë).',
  },
  mk: {
    'siteAccess.intro': 'Внесете го вашиот личен пристапен код за да продолжите.',
    'siteAccess.passwordLabel': 'Личен пристапен код',
    'siteAccess.passwordPlaceholder': 'на пр. 0005',
    'siteAccess.passwordRequired': 'Пристапниот код е задолжителен',
    'siteAccess.incorrectPassword': 'Неточен пристапен код',
    'pricelist.access.hintPlatform':
      'Внесете ја лозинката на ценовникот (не лозинка на сајт или сметка).',
    'pricelist.access.hintOwner':
      'Внесете ја лозинката на ценовникот на сопственикот (не лозинка на сајт или сметка).',
  },
  lt: {
    'siteAccess.intro': 'Įveskite asmeninį prieigos kodą, kad tęstumėte.',
    'siteAccess.passwordLabel': 'Asmeninis prieigos kodas',
    'siteAccess.passwordPlaceholder': 'pvz. 0005',
    'siteAccess.passwordRequired': 'Prieigos kodas privalomas',
    'siteAccess.incorrectPassword': 'Neteisingas prieigos kodas',
    'pricelist.access.hintPlatform':
      'Įveskite kainyno slaptažodį (ne svetainės ar paskyros slaptažodį).',
    'pricelist.access.hintOwner':
      'Įveskite sąrašo savininko kainyno slaptažodį (ne svetainės ar paskyros slaptažodį).',
  },
  da: {
    'siteAccess.intro': 'Indtast din personlige adgangskode for at fortsætte.',
    'siteAccess.passwordLabel': 'Personlig adgangskode',
    'siteAccess.passwordPlaceholder': 'f.eks. 0005',
    'siteAccess.passwordRequired': 'Adgangskode er påkrævet',
    'siteAccess.incorrectPassword': 'Forkert adgangskode',
    'pricelist.access.hintPlatform':
      'Indtast prislistens adgangskode (ikke din websteds- eller konto-adgangskode).',
    'pricelist.access.hintOwner':
      'Indtast liste-ejerens prisliste-adgangskode (ikke din websteds- eller konto-adgangskode).',
  },
  sv: {
    'siteAccess.intro': 'Ange din personliga åtkomstkod för att fortsätta.',
    'siteAccess.passwordLabel': 'Personlig åtkomstkod',
    'siteAccess.passwordPlaceholder': 't.ex. 0005',
    'siteAccess.passwordRequired': 'Åtkomstkod krävs',
    'siteAccess.incorrectPassword': 'Fel åtkomstkod',
    'pricelist.access.hintPlatform':
      'Ange prislistans lösenord (inte ditt webbplats- eller kontolösenord).',
    'pricelist.access.hintOwner':
      'Ange listägarens prisliste-lösenord (inte ditt webbplats- eller kontolösenord).',
  },
  nb: {
    'siteAccess.intro': 'Skriv inn din personlige tilgangskode for å fortsette.',
    'siteAccess.passwordLabel': 'Personlig tilgangskode',
    'siteAccess.passwordPlaceholder': 'f.eks. 0005',
    'siteAccess.passwordRequired': 'Tilgangskode er påkrevd',
    'siteAccess.incorrectPassword': 'Feil tilgangskode',
    'pricelist.access.hintPlatform':
      'Skriv inn prislistepassordet (ikke nettsted- eller kontopassord).',
    'pricelist.access.hintOwner':
      'Skriv inn listeierens prislistepassord (ikke nettsted- eller kontopassord).',
  },
  fi: {
    'siteAccess.intro': 'Syötä henkilökohtainen pääsykoodisi jatkaaksesi.',
    'siteAccess.passwordLabel': 'Henkilökohtainen pääsykoodi',
    'siteAccess.passwordPlaceholder': 'esim. 0005',
    'siteAccess.passwordRequired': 'Pääsykoodi vaaditaan',
    'siteAccess.incorrectPassword': 'Virheellinen pääsykoodi',
    'pricelist.access.hintPlatform':
      'Syötä hinnaston salasana (ei sivuston tai tilin salasanaa).',
    'pricelist.access.hintOwner':
      'Syötä listan omistajan hinnaston salasana (ei sivuston tai tilin salasanaa).',
  },
  uk: {
    'siteAccess.intro': 'Введіть особистий код доступу, щоб продовжити.',
    'siteAccess.passwordLabel': 'Особистий код доступу',
    'siteAccess.passwordPlaceholder': 'напр. 0005',
    'siteAccess.passwordRequired': 'Код доступу обов’язковий',
    'siteAccess.incorrectPassword': 'Невірний код доступу',
    'pricelist.access.hintPlatform':
      'Введіть пароль прайс-листа (не пароль сайту чи облікового запису).',
    'pricelist.access.hintOwner':
      'Введіть пароль прайс-листа власника списку (не пароль сайту чи облікового запису).',
  },
  ru: {
    'siteAccess.intro': 'Введите персональный код доступа, чтобы продолжить.',
    'siteAccess.passwordLabel': 'Персональный код доступа',
    'siteAccess.passwordPlaceholder': 'напр. 0005',
    'siteAccess.passwordRequired': 'Код доступа обязателен',
    'siteAccess.incorrectPassword': 'Неверный код доступа',
    'pricelist.access.hintPlatform':
      'Введите пароль прайс-листа (не пароль сайта или учётной записи).',
    'pricelist.access.hintOwner':
      'Введите пароль прайс-листа владельца списка (не пароль сайта или учётной записи).',
  },
  tr: {
    'siteAccess.intro': 'Devam etmek için kişisel erişim kodunuzu girin.',
    'siteAccess.passwordLabel': 'Kişisel erişim kodu',
    'siteAccess.passwordPlaceholder': 'örn. 0005',
    'siteAccess.passwordRequired': 'Erişim kodu gerekli',
    'siteAccess.incorrectPassword': 'Hatalı erişim kodu',
    'pricelist.access.hintPlatform':
      'Fiyat listesi şifresini girin (site veya hesap şifreniz değil).',
    'pricelist.access.hintOwner':
      'Liste sahibinin fiyat listesi şifresini girin (site veya hesap şifreniz değil).',
  },
  he: {
    'siteAccess.intro': 'הזינו את קוד הגישה האישי שלכם כדי להמשיך.',
    'siteAccess.passwordLabel': 'קוד גישה אישי',
    'siteAccess.passwordPlaceholder': 'למשל 0005',
    'siteAccess.passwordRequired': 'קוד גישה נדרש',
    'siteAccess.incorrectPassword': 'קוד גישה שגוי',
    'pricelist.access.hintPlatform':
      'הזינו את סיסמת מחירון (לא סיסמת האתר או החשבון).',
    'pricelist.access.hintOwner':
      'הזינו את סיסמת מחירון של בעל הרשימה (לא סיסמת האתר או החשבון).',
  },
  ja: {
    'siteAccess.intro': '続行するには個人用アクセスコードを入力してください。',
    'siteAccess.passwordLabel': '個人用アクセスコード',
    'siteAccess.passwordPlaceholder': '例: 0005',
    'siteAccess.passwordRequired': 'アクセスコードは必須です',
    'siteAccess.incorrectPassword': 'アクセスコードが正しくありません',
    'pricelist.access.hintPlatform':
      '価格表のパスワードを入力してください（サイトやアカウントのパスワードではありません）。',
    'pricelist.access.hintOwner':
      'リスト所有者の価格表パスワードを入力してください（サイトやアカウントのパスワードではありません）。',
  },
  zh: {
    'siteAccess.intro': '请输入您的个人访问代码以继续。',
    'siteAccess.passwordLabel': '个人访问代码',
    'siteAccess.passwordPlaceholder': '例如 0005',
    'siteAccess.passwordRequired': '访问代码为必填项',
    'siteAccess.incorrectPassword': '访问代码不正确',
    'pricelist.access.hintPlatform':
      '请输入价格表密码（不是网站或账户密码）。',
    'pricelist.access.hintOwner':
      '请输入列表所有者的价格表密码（不是网站或账户密码）。',
  },
  ka: {
    'siteAccess.intro': 'გასაგრძელებლად შეიყვანეთ პირადი წვდომის კოდი.',
    'siteAccess.passwordLabel': 'პირადი წვდომის კოდი',
    'siteAccess.passwordPlaceholder': 'მაგ. 0005',
    'siteAccess.passwordRequired': 'წვდომის კოდი სავალდებულოა',
    'siteAccess.incorrectPassword': 'არასწორი წვდომის კოდი',
    'pricelist.access.hintPlatform':
      'შეიყვანეთ ფასების სიის პაროლი (არა საიტის ან ანგარიშის პაროლი).',
    'pricelist.access.hintOwner':
      'შეიყვანეთ სიის მფლობელის ფასების სიის პაროლი (არა საიტის ან ანგარიშის პაროლი).',
  },
  hy: {
    'siteAccess.intro': 'Շարունակելու համար մուտքագրեք ձեր անձնական մուտքի կոդը։',
    'siteAccess.passwordLabel': 'Անձնական մուտքի կոդ',
    'siteAccess.passwordPlaceholder': 'օր. 0005',
    'siteAccess.passwordRequired': 'Մուտքի կոդը պարտադիր է',
    'siteAccess.incorrectPassword': 'Սխալ մուտքի կոդ',
    'pricelist.access.hintPlatform':
      'Մուտքագրեք գնացուցակի գաղտնաբառը (ոչ կայքի կամ հաշվի գաղտնաբառը)։',
    'pricelist.access.hintOwner':
      'Մուտքագրեք ցանկի սեփականատիրոջ գնացուցակի գաղտնաբառը (ոչ կայքի կամ հաշվի գաղտնաբառը)։',
  },
  az: {
    'siteAccess.intro': 'Davam etmək üçün şəxsi giriş kodunuzu daxil edin.',
    'siteAccess.passwordLabel': 'Şəxsi giriş kodu',
    'siteAccess.passwordPlaceholder': 'məs. 0005',
    'siteAccess.passwordRequired': 'Giriş kodu tələb olunur',
    'siteAccess.incorrectPassword': 'Yanlış giriş kodu',
    'pricelist.access.hintPlatform':
      'Qiymət siyahısı şifrəsini daxil edin (sayt və ya hesab şifrəsi deyil).',
    'pricelist.access.hintOwner':
      'Siyahı sahibinin qiymət siyahısı şifrəsini daxil edin (sayt və ya hesab şifrəsi deyil).',
  },
}

const AR: AccessOverlay = {
  'siteAccess.intro': 'أدخل رمز الوصول الشخصي للمتابعة.',
  'siteAccess.passwordLabel': 'رمز الوصول الشخصي',
  'siteAccess.passwordPlaceholder': 'مثال 0005',
  'siteAccess.passwordRequired': 'رمز الوصول مطلوب',
  'siteAccess.incorrectPassword': 'رمز وصول غير صحيح',
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
