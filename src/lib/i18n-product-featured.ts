import type { Locale } from '@/lib/i18n-locale-registry'

export type ProductFeaturedMessageKey =
  | 'product.featured.setAria'
  | 'product.featured.setTitle'
  | 'product.featured.clearAria'
  | 'product.featured.clearTitle'
  | 'product.featured.error'

type ProductFeaturedMessages = Record<ProductFeaturedMessageKey, string>

const EN: ProductFeaturedMessages = {
  'product.featured.setAria': 'Set as featured on 1-1.club',
  'product.featured.setTitle': 'Set as featured (1-1.club)',
  'product.featured.clearAria': 'Remove featured status',
  'product.featured.clearTitle': 'Remove featured (1-1.club)',
  'product.featured.error': 'Could not update featured status',
}

const BY_LOCALE: Partial<Record<Locale, ProductFeaturedMessages>> = {
  en: EN,
  nl: {
    'product.featured.setAria': 'Zet Uitgelicht op 1-1.club',
    'product.featured.setTitle': 'Zet Uitgelicht (1-1.club)',
    'product.featured.clearAria': 'Uitgelicht status verwijderen',
    'product.featured.clearTitle': 'Uitgelicht wissen (1-1.club)',
    'product.featured.error': 'Uitgelicht status kon niet worden bijgewerkt',
  },
  de: {
    'product.featured.setAria': 'Als Empfohlen auf 1-1.club setzen',
    'product.featured.setTitle': 'Als Empfohlen setzen (1-1.club)',
    'product.featured.clearAria': 'Empfohlen-Status entfernen',
    'product.featured.clearTitle': 'Empfohlen entfernen (1-1.club)',
    'product.featured.error': 'Empfohlen-Status konnte nicht aktualisiert werden',
  },
  fr: {
    'product.featured.setAria': 'Mettre en vedette sur 1-1.club',
    'product.featured.setTitle': 'Mettre en vedette (1-1.club)',
    'product.featured.clearAria': 'Retirer le statut vedette',
    'product.featured.clearTitle': 'Retirer la vedette (1-1.club)',
    'product.featured.error': 'Impossible de mettre à jour le statut vedette',
  },
  es: {
    'product.featured.setAria': 'Marcar como destacado en 1-1.club',
    'product.featured.setTitle': 'Marcar como destacado (1-1.club)',
    'product.featured.clearAria': 'Quitar estado destacado',
    'product.featured.clearTitle': 'Quitar destacado (1-1.club)',
    'product.featured.error': 'No se pudo actualizar el estado destacado',
  },
  it: {
    'product.featured.setAria': 'Imposta come in evidenza su 1-1.club',
    'product.featured.setTitle': 'Imposta in evidenza (1-1.club)',
    'product.featured.clearAria': 'Rimuovi stato in evidenza',
    'product.featured.clearTitle': 'Rimuovi in evidenza (1-1.club)',
    'product.featured.error': 'Impossibile aggiornare lo stato in evidenza',
  },
  pt: {
    'product.featured.setAria': 'Definir como destaque em 1-1.club',
    'product.featured.setTitle': 'Definir como destaque (1-1.club)',
    'product.featured.clearAria': 'Remover status de destaque',
    'product.featured.clearTitle': 'Remover destaque (1-1.club)',
    'product.featured.error': 'Não foi possível atualizar o status de destaque',
  },
  gr: {
    'product.featured.setAria': 'Ορισμός ως προτεινόμενο στο 1-1.club',
    'product.featured.setTitle': 'Ορισμός ως προτεινόμενο (1-1.club)',
    'product.featured.clearAria': 'Αφαίρεση κατάστασης προτεινόμενου',
    'product.featured.clearTitle': 'Αφαίρεση προτεινόμενου (1-1.club)',
    'product.featured.error': 'Δεν ήταν δυνατή η ενημέρωση της κατάστασης',
  },
  pl: {
    'product.featured.setAria': 'Ustaw jako wyróżnione na 1-1.club',
    'product.featured.setTitle': 'Ustaw jako wyróżnione (1-1.club)',
    'product.featured.clearAria': 'Usuń status wyróżnienia',
    'product.featured.clearTitle': 'Usuń wyróżnienie (1-1.club)',
    'product.featured.error': 'Nie udało się zaktualizować statusu wyróżnienia',
  },
  cz: {
    'product.featured.setAria': 'Nastavit jako doporučené na 1-1.club',
    'product.featured.setTitle': 'Nastavit jako doporučené (1-1.club)',
    'product.featured.clearAria': 'Odebrat doporučení',
    'product.featured.clearTitle': 'Odebrat doporučení (1-1.club)',
    'product.featured.error': 'Stav doporučení se nepodařilo aktualizovat',
  },
  sk: {
    'product.featured.setAria': 'Nastaviť ako odporúčané na 1-1.club',
    'product.featured.setTitle': 'Nastaviť ako odporúčané (1-1.club)',
    'product.featured.clearAria': 'Odstrániť odporúčanie',
    'product.featured.clearTitle': 'Odstrániť odporúčanie (1-1.club)',
    'product.featured.error': 'Stav odporúčania sa nepodarilo aktualizovať',
  },
  hu: {
    'product.featured.setAria': 'Kiemelés beállítása a 1-1.club-on',
    'product.featured.setTitle': 'Kiemelés beállítása (1-1.club)',
    'product.featured.clearAria': 'Kiemelés eltávolítása',
    'product.featured.clearTitle': 'Kiemelés eltávolítása (1-1.club)',
    'product.featured.error': 'A kiemelés frissítése nem sikerült',
  },
  ro: {
    'product.featured.setAria': 'Setează ca evidențiat pe 1-1.club',
    'product.featured.setTitle': 'Setează ca evidențiat (1-1.club)',
    'product.featured.clearAria': 'Elimină statusul evidențiat',
    'product.featured.clearTitle': 'Elimină evidențiat (1-1.club)',
    'product.featured.error': 'Statusul evidențiat nu a putut fi actualizat',
  },
  bg: {
    'product.featured.setAria': 'Задай като представено в 1-1.club',
    'product.featured.setTitle': 'Задай като представено (1-1.club)',
    'product.featured.clearAria': 'Премахни представено',
    'product.featured.clearTitle': 'Премахни представено (1-1.club)',
    'product.featured.error': 'Статусът „представено“ не можа да се обнови',
  },
  hr: {
    'product.featured.setAria': 'Postavi kao istaknuto na 1-1.club',
    'product.featured.setTitle': 'Postavi kao istaknuto (1-1.club)',
    'product.featured.clearAria': 'Ukloni istaknuto',
    'product.featured.clearTitle': 'Ukloni istaknuto (1-1.club)',
    'product.featured.error': 'Nije moguće ažurirati istaknuti status',
  },
  sr: {
    'product.featured.setAria': 'Постави као истакнуто на 1-1.club',
    'product.featured.setTitle': 'Постави као истакнуто (1-1.club)',
    'product.featured.clearAria': 'Уклони истакнуто',
    'product.featured.clearTitle': 'Уклони истакнуто (1-1.club)',
    'product.featured.error': 'Није могуће ажурирати статус истакнутог',
  },
  ba: {
    'product.featured.setAria': 'Postavi kao istaknuto na 1-1.club',
    'product.featured.setTitle': 'Postavi kao istaknuto (1-1.club)',
    'product.featured.clearAria': 'Ukloni istaknuto',
    'product.featured.clearTitle': 'Ukloni istaknuto (1-1.club)',
    'product.featured.error': 'Nije moguće ažurirati istaknuti status',
  },
  me: {
    'product.featured.setAria': 'Postavi kao istaknuto na 1-1.club',
    'product.featured.setTitle': 'Postavi kao istaknuto (1-1.club)',
    'product.featured.clearAria': 'Ukloni istaknuto',
    'product.featured.clearTitle': 'Ukloni istaknuto (1-1.club)',
    'product.featured.error': 'Nije moguće ažurirati istaknuti status',
  },
  sq: {
    'product.featured.setAria': 'Vendos si të veçantë në 1-1.club',
    'product.featured.setTitle': 'Vendos si të veçantë (1-1.club)',
    'product.featured.clearAria': 'Hiq statusin e veçantë',
    'product.featured.clearTitle': 'Hiq të veçantën (1-1.club)',
    'product.featured.error': 'Nuk u përditësua statusi i veçantë',
  },
  mk: {
    'product.featured.setAria': 'Постави како истакнато на 1-1.club',
    'product.featured.setTitle': 'Постави како истакнато (1-1.club)',
    'product.featured.clearAria': 'Отстрани истакнато',
    'product.featured.clearTitle': 'Отстрани истакнато (1-1.club)',
    'product.featured.error': 'Статусот не можеше да се ажурира',
  },
  lt: {
    'product.featured.setAria': 'Pažymėti kaip išskirtinį 1-1.club',
    'product.featured.setTitle': 'Pažymėti kaip išskirtinį (1-1.club)',
    'product.featured.clearAria': 'Pašalinti išskirtinį statusą',
    'product.featured.clearTitle': 'Pašalinti išskirtinį (1-1.club)',
    'product.featured.error': 'Nepavyko atnaujinti išskirtinio statuso',
  },
  da: {
    'product.featured.setAria': 'Sæt som fremhævet på 1-1.club',
    'product.featured.setTitle': 'Sæt som fremhævet (1-1.club)',
    'product.featured.clearAria': 'Fjern fremhævet status',
    'product.featured.clearTitle': 'Fjern fremhævet (1-1.club)',
    'product.featured.error': 'Kunne ikke opdatere fremhævet status',
  },
  sv: {
    'product.featured.setAria': 'Markera som utvald på 1-1.club',
    'product.featured.setTitle': 'Markera som utvald (1-1.club)',
    'product.featured.clearAria': 'Ta bort utvald status',
    'product.featured.clearTitle': 'Ta bort utvald (1-1.club)',
    'product.featured.error': 'Kunde inte uppdatera utvald status',
  },
  nb: {
    'product.featured.setAria': 'Sett som utvalgt på 1-1.club',
    'product.featured.setTitle': 'Sett som utvalgt (1-1.club)',
    'product.featured.clearAria': 'Fjern utvalgt status',
    'product.featured.clearTitle': 'Fjern utvalgt (1-1.club)',
    'product.featured.error': 'Kunne ikke oppdatere utvalgt status',
  },
  fi: {
    'product.featured.setAria': 'Aseta esille 1-1.clubissa',
    'product.featured.setTitle': 'Aseta esille (1-1.club)',
    'product.featured.clearAria': 'Poista esillepano',
    'product.featured.clearTitle': 'Poista esillepano (1-1.club)',
    'product.featured.error': 'Esillepanon päivitys epäonnistui',
  },
  uk: {
    'product.featured.setAria': 'Зробити рекомендованим на 1-1.club',
    'product.featured.setTitle': 'Зробити рекомендованим (1-1.club)',
    'product.featured.clearAria': 'Прибрати рекомендоване',
    'product.featured.clearTitle': 'Прибрати рекомендоване (1-1.club)',
    'product.featured.error': 'Не вдалося оновити статус рекомендованого',
  },
  ru: {
    'product.featured.setAria': 'Сделать избранным на 1-1.club',
    'product.featured.setTitle': 'Сделать избранным (1-1.club)',
    'product.featured.clearAria': 'Убрать статус избранного',
    'product.featured.clearTitle': 'Убрать избранное (1-1.club)',
    'product.featured.error': 'Не удалось обновить статус избранного',
  },
  tr: {
    'product.featured.setAria': '1-1.club’da öne çıkar',
    'product.featured.setTitle': 'Öne çıkar (1-1.club)',
    'product.featured.clearAria': 'Öne çıkarma durumunu kaldır',
    'product.featured.clearTitle': 'Öne çıkarmayı kaldır (1-1.club)',
    'product.featured.error': 'Öne çıkarma durumu güncellenemedi',
  },
  he: {
    'product.featured.setAria': 'הגדר כמומלץ ב-1-1.club',
    'product.featured.setTitle': 'הגדר כמומלץ (1-1.club)',
    'product.featured.clearAria': 'הסר סטטוס מומלץ',
    'product.featured.clearTitle': 'הסר מומלץ (1-1.club)',
    'product.featured.error': 'לא ניתן לעדכן את סטטוס המומלץ',
  },
  eg: {
    'product.featured.setAria': 'تعيين كمميز على 1-1.club',
    'product.featured.setTitle': 'تعيين كمميز (1-1.club)',
    'product.featured.clearAria': 'إزالة حالة التمييز',
    'product.featured.clearTitle': 'إزالة التمييز (1-1.club)',
    'product.featured.error': 'تعذر تحديث حالة التمييز',
  },
  at: {
    'product.featured.setAria': 'تعيين كمميز على 1-1.club',
    'product.featured.setTitle': 'تعيين كمميز (1-1.club)',
    'product.featured.clearAria': 'إزالة حالة التمييز',
    'product.featured.clearTitle': 'إزالة التمييز (1-1.club)',
    'product.featured.error': 'تعذر تحديث حالة التمييز',
  },
  ps: {
    'product.featured.setAria': 'تعيين كمميز على 1-1.club',
    'product.featured.setTitle': 'تعيين كمميز (1-1.club)',
    'product.featured.clearAria': 'إزالة حالة التمييز',
    'product.featured.clearTitle': 'إزالة التمييز (1-1.club)',
    'product.featured.error': 'تعذر تحديث حالة التمييز',
  },
  ma: {
    'product.featured.setAria': 'تعيين كمميز على 1-1.club',
    'product.featured.setTitle': 'تعيين كمميز (1-1.club)',
    'product.featured.clearAria': 'إزالة حالة التمييز',
    'product.featured.clearTitle': 'إزالة التمييز (1-1.club)',
    'product.featured.error': 'تعذر تحديث حالة التمييز',
  },
  dz: {
    'product.featured.setAria': 'تعيين كمميز على 1-1.club',
    'product.featured.setTitle': 'تعيين كمميز (1-1.club)',
    'product.featured.clearAria': 'إزالة حالة التمييز',
    'product.featured.clearTitle': 'إزالة التمييز (1-1.club)',
    'product.featured.error': 'تعذر تحديث حالة التمييز',
  },
  ka: {
    'product.featured.setAria': 'მონიშნე რჩეულად 1-1.club-ზე',
    'product.featured.setTitle': 'მონიშნე რჩეულად (1-1.club)',
    'product.featured.clearAria': 'რჩეულის მოხსნა',
    'product.featured.clearTitle': 'რჩეულის მოხსნა (1-1.club)',
    'product.featured.error': 'რჩეულის სტატუსი ვერ განახლდა',
  },
  hy: {
    'product.featured.setAria': 'Նշել որպես ընտրված 1-1.club-ում',
    'product.featured.setTitle': 'Նշել որպես ընտրված (1-1.club)',
    'product.featured.clearAria': 'Հանել ընտրված կարգավիճակը',
    'product.featured.clearTitle': 'Հանել ընտրվածը (1-1.club)',
    'product.featured.error': 'Չհաջողվեց թարմացնել ընտրված կարգավիճակը',
  },
  az: {
    'product.featured.setAria': '1-1.club-da seçilmiş et',
    'product.featured.setTitle': 'Seçilmiş et (1-1.club)',
    'product.featured.clearAria': 'Seçilmiş statusunu sil',
    'product.featured.clearTitle': 'Seçilmişi sil (1-1.club)',
    'product.featured.error': 'Seçilmiş status yenilənə bilmədi',
  },
  ja: {
    'product.featured.setAria': '1-1.clubでおすすめに設定',
    'product.featured.setTitle': 'おすすめに設定 (1-1.club)',
    'product.featured.clearAria': 'おすすめを解除',
    'product.featured.clearTitle': 'おすすめを解除 (1-1.club)',
    'product.featured.error': 'おすすめ状態を更新できませんでした',
  },
  zh: {
    'product.featured.setAria': '在 1-1.club 设为精选',
    'product.featured.setTitle': '设为精选 (1-1.club)',
    'product.featured.clearAria': '取消精选状态',
    'product.featured.clearTitle': '取消精选 (1-1.club)',
    'product.featured.error': '无法更新精选状态',
  },
}

export function getProductFeaturedMessages(locale: Locale): ProductFeaturedMessages {
  return BY_LOCALE[locale] ?? EN
}
