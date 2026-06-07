import type { Locale } from '@/lib/i18n-locale-registry'

export type AdminProductsMessageKey =
  | 'adminProducts.col.product'
  | 'adminProducts.col.sku'
  | 'adminProducts.col.category'
  | 'adminProducts.col.brand'
  | 'adminProducts.col.price'
  | 'adminProducts.col.status'
  | 'adminProducts.col.actions'
  | 'adminProducts.status.published'
  | 'adminProducts.status.draft'
  | 'adminProducts.status.inactive'
  | 'adminProducts.status.trash'
  | 'adminProducts.selectAll'
  | 'adminProducts.selectProduct'
  | 'adminProducts.edit'
  | 'adminProducts.delete'

type AdminProductsMessages = Record<AdminProductsMessageKey, string>

const EN: AdminProductsMessages = {
  'adminProducts.col.product': 'Product',
  'adminProducts.col.sku': 'SKU',
  'adminProducts.col.category': 'Category',
  'adminProducts.col.brand': 'Brand',
  'adminProducts.col.price': 'Price',
  'adminProducts.col.status': 'Status',
  'adminProducts.col.actions': 'Actions',
  'adminProducts.status.published': 'Published',
  'adminProducts.status.draft': 'Draft',
  'adminProducts.status.inactive': 'Inactive',
  'adminProducts.status.trash': 'Trash',
  'adminProducts.selectAll': 'Select all on this page',
  'adminProducts.selectProduct': 'Select {name}',
  'adminProducts.edit': 'Edit',
  'adminProducts.delete': 'Delete',
}

const BY_LOCALE: Partial<Record<Locale, Partial<AdminProductsMessages>>> = {
  nl: {
    'adminProducts.col.product': 'Product',
    'adminProducts.col.sku': 'SKU',
    'adminProducts.col.category': 'Categorie',
    'adminProducts.col.brand': 'Merk',
    'adminProducts.col.price': 'Prijs',
    'adminProducts.col.status': 'Status',
    'adminProducts.col.actions': 'Acties',
    'adminProducts.status.published': 'Gepubliceerd',
    'adminProducts.status.draft': 'Concept',
    'adminProducts.status.inactive': 'Inactief',
    'adminProducts.status.trash': 'Prullenbak',
    'adminProducts.selectAll': 'Alles op deze pagina selecteren',
    'adminProducts.selectProduct': '{name} selecteren',
    'adminProducts.edit': 'Bewerken',
    'adminProducts.delete': 'Verwijderen',
  },
  de: {
    'adminProducts.col.product': 'Produkt',
    'adminProducts.col.sku': 'SKU',
    'adminProducts.col.category': 'Kategorie',
    'adminProducts.col.brand': 'Marke',
    'adminProducts.col.price': 'Preis',
    'adminProducts.col.status': 'Status',
    'adminProducts.col.actions': 'Aktionen',
    'adminProducts.status.published': 'Veröffentlicht',
    'adminProducts.status.draft': 'Entwurf',
    'adminProducts.status.inactive': 'Inaktiv',
    'adminProducts.status.trash': 'Papierkorb',
    'adminProducts.selectAll': 'Alle auf dieser Seite auswählen',
    'adminProducts.selectProduct': '{name} auswählen',
    'adminProducts.edit': 'Bearbeiten',
    'adminProducts.delete': 'Löschen',
  },
  fr: {
    'adminProducts.col.product': 'Produit',
    'adminProducts.col.sku': 'SKU',
    'adminProducts.col.category': 'Catégorie',
    'adminProducts.col.brand': 'Marque',
    'adminProducts.col.price': 'Prix',
    'adminProducts.col.status': 'Statut',
    'adminProducts.col.actions': 'Actions',
    'adminProducts.status.published': 'Publié',
    'adminProducts.status.draft': 'Brouillon',
    'adminProducts.status.inactive': 'Inactif',
    'adminProducts.status.trash': 'Corbeille',
    'adminProducts.selectAll': 'Tout sélectionner sur cette page',
    'adminProducts.selectProduct': 'Sélectionner {name}',
    'adminProducts.edit': 'Modifier',
    'adminProducts.delete': 'Supprimer',
  },
  es: {
    'adminProducts.col.product': 'Producto',
    'adminProducts.col.sku': 'SKU',
    'adminProducts.col.category': 'Categoría',
    'adminProducts.col.brand': 'Marca',
    'adminProducts.col.price': 'Precio',
    'adminProducts.col.status': 'Estado',
    'adminProducts.col.actions': 'Acciones',
    'adminProducts.status.published': 'Publicado',
    'adminProducts.status.draft': 'Borrador',
    'adminProducts.status.inactive': 'Inactivo',
    'adminProducts.status.trash': 'Papelera',
    'adminProducts.selectAll': 'Seleccionar todo en esta página',
    'adminProducts.selectProduct': 'Seleccionar {name}',
    'adminProducts.edit': 'Editar',
    'adminProducts.delete': 'Eliminar',
  },
  pt: {
    'adminProducts.col.product': 'Produto',
    'adminProducts.col.sku': 'SKU',
    'adminProducts.col.category': 'Categoria',
    'adminProducts.col.brand': 'Marca',
    'adminProducts.col.price': 'Preço',
    'adminProducts.col.status': 'Estado',
    'adminProducts.col.actions': 'Ações',
    'adminProducts.status.published': 'Publicado',
    'adminProducts.status.draft': 'Rascunho',
    'adminProducts.status.inactive': 'Inativo',
    'adminProducts.status.trash': 'Lixo',
    'adminProducts.selectAll': 'Selecionar tudo nesta página',
    'adminProducts.selectProduct': 'Selecionar {name}',
    'adminProducts.edit': 'Editar',
    'adminProducts.delete': 'Eliminar',
  },
  it: {
    'adminProducts.col.product': 'Prodotto',
    'adminProducts.col.sku': 'SKU',
    'adminProducts.col.category': 'Categoria',
    'adminProducts.col.brand': 'Marca',
    'adminProducts.col.price': 'Prezzo',
    'adminProducts.col.status': 'Stato',
    'adminProducts.col.actions': 'Azioni',
    'adminProducts.status.published': 'Pubblicato',
    'adminProducts.status.draft': 'Bozza',
    'adminProducts.status.inactive': 'Inattivo',
    'adminProducts.status.trash': 'Cestino',
    'adminProducts.selectAll': 'Seleziona tutto in questa pagina',
    'adminProducts.selectProduct': 'Seleziona {name}',
    'adminProducts.edit': 'Modifica',
    'adminProducts.delete': 'Elimina',
  },
}

export function getAdminProductsMessages(locale: Locale): AdminProductsMessages {
  return { ...EN, ...(BY_LOCALE[locale] ?? {}) } as AdminProductsMessages
}
