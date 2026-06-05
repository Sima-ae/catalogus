import type { PricelistRow } from '@/lib/pricelist-db'
import { pricelistRowHasFilledPrice } from '@/lib/pricelist-filters'

export type PricelistExportRow = {
  title: string
  sku: string
  category: string
  brand: string
  price: number
  currency: string
  imageUrl: string
}

export type PricelistExportLabels = {
  title: string
  sku: string
  category: string
  brand: string
  price: string
  image: string
  sheetName: string
  pdfTitle: string
}

export function buildPricelistExportRows(rows: PricelistRow[]): PricelistExportRow[] {
  return rows.filter(pricelistRowHasFilledPrice).map((row) => {
    const raw = row.seller_unit_price ?? row.display_unit_price
    const price = Number(raw)
    return {
      title: row.name.trim(),
      sku: row.sku.trim(),
      category: row.category?.trim() || '',
      brand: row.brand?.trim() || '',
      price: Math.round(price * 100) / 100,
      currency: (row.seller_currency ?? row.display_currency ?? 'EUR').trim(),
      imageUrl: row.image_url?.trim() || '',
    }
  })
}

function formatExportPrice(row: PricelistExportRow): string {
  const amount = row.price.toFixed(2).replace('.', ',')
  return `${row.currency} ${amount}`
}

function exportFileStem(ownerLabel: string): string {
  const safe = ownerLabel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  const date = new Date().toISOString().slice(0, 10)
  return `pricelist-${safe || 'export'}-${date}`
}

export async function downloadPricelistXls(
  rows: PricelistExportRow[],
  labels: PricelistExportLabels,
  ownerLabel: string
): Promise<void> {
  const XLSX = await import('xlsx')
  const sheetRows = rows.map((row) => ({
    [labels.title]: row.title,
    [labels.sku]: row.sku,
    [labels.category]: row.category,
    [labels.brand]: row.brand,
    [labels.price]: formatExportPrice(row),
    [labels.image]: row.imageUrl,
  }))
  const worksheet = XLSX.utils.json_to_sheet(sheetRows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, labels.sheetName.slice(0, 31))
  XLSX.writeFile(workbook, `${exportFileStem(ownerLabel)}.xlsx`)
}

export async function downloadPricelistPdf(
  rows: PricelistExportRow[],
  labels: PricelistExportLabels,
  ownerLabel: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text(labels.pdfTitle, 14, 14)

  autoTable(doc, {
    startY: 20,
    head: [[labels.title, labels.sku, labels.category, labels.brand, labels.price]],
    body: rows.map((row) => [
      row.title,
      row.sku,
      row.category,
      row.brand,
      formatExportPrice(row),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [34, 34, 34] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35 },
      2: { cellWidth: 45 },
      3: { cellWidth: 40 },
      4: { cellWidth: 30 },
    },
  })

  doc.save(`${exportFileStem(ownerLabel)}.pdf`)
}
