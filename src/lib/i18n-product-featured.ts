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

const NL: ProductFeaturedMessages = {
  'product.featured.setAria': 'Zet Uitgelicht op 1-1.club',
  'product.featured.setTitle': 'Zet Uitgelicht (1-1.club)',
  'product.featured.clearAria': 'Uitgelicht status verwijderen',
  'product.featured.clearTitle': 'Uitgelicht wissen (1-1.club)',
  'product.featured.error': 'Uitgelicht status kon niet worden bijgewerkt',
}

const BY_LOCALE: Partial<Record<Locale, ProductFeaturedMessages>> = {
  en: EN,
  nl: NL,
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
}

export function getProductFeaturedMessages(locale: Locale): ProductFeaturedMessages {
  return BY_LOCALE[locale] ?? EN
}
