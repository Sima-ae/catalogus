import type { Locale } from '@/lib/i18n-locale-registry'

export type ActivityOrderMessageKey = 'activity.orderedJustNow' | 'activity.orderedWithTime'

type ActivityOrderMessages = Record<ActivityOrderMessageKey, string>

const EN: ActivityOrderMessages = {
  'activity.orderedJustNow': '{buyer} ordered:',
  'activity.orderedWithTime': '{buyer} ordered {time}:',
}

const BY_LOCALE: Partial<Record<Locale, ActivityOrderMessages>> = {
  en: EN,
  nl: {
    'activity.orderedJustNow': '{buyer} heeft besteld:',
    'activity.orderedWithTime': '{buyer} heeft {time} besteld:',
  },
  de: {
    'activity.orderedJustNow': '{buyer} hat bestellt:',
    'activity.orderedWithTime': '{buyer} hat {time} bestellt:',
  },
  fr: {
    'activity.orderedJustNow': '{buyer} a commandé :',
    'activity.orderedWithTime': '{buyer} a commandé {time} :',
  },
  es: {
    'activity.orderedJustNow': '{buyer} ha pedido:',
    'activity.orderedWithTime': '{buyer} ha pedido {time}:',
  },
  pt: {
    'activity.orderedJustNow': '{buyer} pediu:',
    'activity.orderedWithTime': '{buyer} pediu {time}:',
  },
  it: {
    'activity.orderedJustNow': '{buyer} ha ordinato:',
    'activity.orderedWithTime': '{buyer} ha ordinato {time}:',
  },
  gr: {
    'activity.orderedJustNow': 'Ο/Η {buyer} παρήγγειλε:',
    'activity.orderedWithTime': 'Ο/Η {buyer} παρήγγειλε {time}:',
  },
  pl: {
    'activity.orderedJustNow': '{buyer} zamówił(a):',
    'activity.orderedWithTime': '{buyer} zamówił(a) {time}:',
  },
  cz: {
    'activity.orderedJustNow': '{buyer} objednal(a):',
    'activity.orderedWithTime': '{buyer} objednal(a) {time}:',
  },
  sk: {
    'activity.orderedJustNow': '{buyer} objednal(a):',
    'activity.orderedWithTime': '{buyer} objednal(a) {time}:',
  },
  hu: {
    'activity.orderedJustNow': '{buyer} rendelt:',
    'activity.orderedWithTime': '{buyer} rendelt {time}:',
  },
  ro: {
    'activity.orderedJustNow': '{buyer} a comandat:',
    'activity.orderedWithTime': '{buyer} a comandat {time}:',
  },
  bg: {
    'activity.orderedJustNow': '{buyer} поръча:',
    'activity.orderedWithTime': '{buyer} поръча {time}:',
  },
  hr: {
    'activity.orderedJustNow': '{buyer} je naručio/la:',
    'activity.orderedWithTime': '{buyer} je naručio/la {time}:',
  },
  sr: {
    'activity.orderedJustNow': '{buyer} је наручио/ла:',
    'activity.orderedWithTime': '{buyer} је наручио/ла {time}:',
  },
  ba: {
    'activity.orderedJustNow': '{buyer} je naručio/la:',
    'activity.orderedWithTime': '{buyer} je naručio/la {time}:',
  },
  me: {
    'activity.orderedJustNow': '{buyer} je naručio/la:',
    'activity.orderedWithTime': '{buyer} je naručio/la {time}:',
  },
  sq: {
    'activity.orderedJustNow': '{buyer} porositi:',
    'activity.orderedWithTime': '{buyer} porositi {time}:',
  },
  mk: {
    'activity.orderedJustNow': '{buyer} нарача:',
    'activity.orderedWithTime': '{buyer} нарача {time}:',
  },
  lt: {
    'activity.orderedJustNow': '{buyer} užsakė:',
    'activity.orderedWithTime': '{buyer} užsakė {time}:',
  },
  da: {
    'activity.orderedJustNow': '{buyer} har bestilt:',
    'activity.orderedWithTime': '{buyer} har bestilt {time}:',
  },
  sv: {
    'activity.orderedJustNow': '{buyer} beställde:',
    'activity.orderedWithTime': '{buyer} beställde {time}:',
  },
  nb: {
    'activity.orderedJustNow': '{buyer} bestilte:',
    'activity.orderedWithTime': '{buyer} bestilte {time}:',
  },
  fi: {
    'activity.orderedJustNow': '{buyer} tilasi:',
    'activity.orderedWithTime': '{buyer} tilasi {time}:',
  },
  uk: {
    'activity.orderedJustNow': '{buyer} замовив(ла):',
    'activity.orderedWithTime': '{buyer} замовив(ла) {time}:',
  },
  ru: {
    'activity.orderedJustNow': '{buyer} заказал(а):',
    'activity.orderedWithTime': '{buyer} заказал(а) {time}:',
  },
  tr: {
    'activity.orderedJustNow': '{buyer} sipariş verdi:',
    'activity.orderedWithTime': '{buyer} {time} sipariş verdi:',
  },
  he: {
    'activity.orderedJustNow': '{buyer} הזמין/ה:',
    'activity.orderedWithTime': '{buyer} הזמין/ה {time}:',
  },
  az: {
    'activity.orderedJustNow': '{buyer} sipariş verdi:',
    'activity.orderedWithTime': '{buyer} {time} sipariş verdi:',
  },
  ja: {
    'activity.orderedJustNow': '{buyer} が注文しました:',
    'activity.orderedWithTime': '{buyer} が {time} に注文しました:',
  },
  zh: {
    'activity.orderedJustNow': '{buyer} 下单了:',
    'activity.orderedWithTime': '{buyer} {time} 下单了:',
  },
  ka: {
    'activity.orderedJustNow': '{buyer}-მა შეუკვეთა:',
    'activity.orderedWithTime': '{buyer}-მა {time} შეუკვეთა:',
  },
  hy: {
    'activity.orderedJustNow': '{buyer}-ը պատվիրեց:',
    'activity.orderedWithTime': '{buyer}-ը {time} պատվիրեց:',
  },
  eg: {
    'activity.orderedJustNow': '{buyer} طلب:',
    'activity.orderedWithTime': '{buyer} طلب {time}:',
  },
  at: {
    'activity.orderedJustNow': '{buyer} طلب:',
    'activity.orderedWithTime': '{buyer} طلب {time}:',
  },
  ps: {
    'activity.orderedJustNow': '{buyer} طلب:',
    'activity.orderedWithTime': '{buyer} طلب {time}:',
  },
  ma: {
    'activity.orderedJustNow': '{buyer} طلب:',
    'activity.orderedWithTime': '{buyer} طلب {time}:',
  },
  dz: {
    'activity.orderedJustNow': '{buyer} طلب:',
    'activity.orderedWithTime': '{buyer} طلب {time}:',
  },
}

export function getActivityOrderMessages(locale: Locale): ActivityOrderMessages {
  return { ...EN, ...(BY_LOCALE[locale] ?? {}) }
}
