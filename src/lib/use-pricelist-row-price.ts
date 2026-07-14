'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PricelistRow } from '@/lib/pricelist-db'
import type { PricelistStockStatus } from '@/lib/pricelist-stock-status'
import {
  editablePriceSeed,
  parsePriceInput,
  rowStockStatus,
} from '@/lib/pricelist-row-price'

type UsePricelistRowPriceOptions = {
  row: PricelistRow
  canClearPrice: boolean
  onSavePrice: (productId: string, price: number, priceSellerId?: string) => Promise<void>
  onClearPrice?: (productId: string, priceSellerId?: string) => Promise<void>
  onSetStockStatus?: (
    productId: string,
    stockStatus: PricelistStockStatus,
    priceSellerId?: string
  ) => Promise<void>
  t: (key: string) => string
}

export function usePricelistRowPrice({
  row,
  canClearPrice,
  onSavePrice,
  onClearPrice,
  onSetStockStatus,
  t,
}: UsePricelistRowPriceOptions) {
  const savedValueRef = useRef(editablePriceSeed(row))
  const [value, setValue] = useState(() => editablePriceSeed(row))
  const [stockStatus, setStockStatus] = useState<PricelistStockStatus | null>(() =>
    rowStockStatus(row)
  )
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const next = editablePriceSeed(row)
    savedValueRef.current = next
    setValue(next)
    setStockStatus(rowStockStatus(row))
    setError(null)
  }, [
    row.product_id,
    row.seller_unit_price,
    row.display_unit_price,
    row.seller_stock_status,
    row.display_stock_status,
    row.can_edit_price,
  ])

  const handleSetStockStatus = useCallback(
    async (status: PricelistStockStatus) => {
      if (!onSetStockStatus) return
      setSaving(true)
      setError(null)
      try {
        await onSetStockStatus(row.product_id, status, row.price_seller_id)
        setStockStatus(status)
        setValue('')
        savedValueRef.current = ''
        setSavedFlash(true)
        window.setTimeout(() => setSavedFlash(false), 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('pricelist.error.saveFailed'))
      } finally {
        setSaving(false)
      }
    },
    [onSetStockStatus, row.price_seller_id, row.product_id, t]
  )

  const handleSave = useCallback(async () => {
    if (stockStatus) return
    const parsed = parsePriceInput(value)
    if (parsed === null) {
      if (!value.trim()) {
        const hadSaved = savedValueRef.current.trim() !== ''
        if (hadSaved && canClearPrice && onClearPrice) {
          setSaving(true)
          setError(null)
          try {
            await onClearPrice(row.product_id, row.price_seller_id)
            savedValueRef.current = ''
            setValue('')
            setSavedFlash(true)
            window.setTimeout(() => setSavedFlash(false), 1500)
          } catch (e) {
            setValue(savedValueRef.current)
            setError(e instanceof Error ? e.message : t('pricelist.error.clearFailed'))
          } finally {
            setSaving(false)
          }
        } else if (hadSaved) {
          setValue(savedValueRef.current)
          if (!canClearPrice) {
            setError(t('pricelist.error.onlySuperAdminClear'))
            window.setTimeout(() => setError(null), 3000)
          }
        }
        return
      }
      setError(t('pricelist.error.invalidPrice'))
      return
    }
    const savedParsed = parsePriceInput(savedValueRef.current)
    if (savedParsed !== null && parsed === savedParsed) return
    setSaving(true)
    setError(null)
    try {
      await onSavePrice(row.product_id, parsed, row.price_seller_id)
      const savedText = String(parsed)
      savedValueRef.current = savedText
      setValue(savedText)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pricelist.error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [
    canClearPrice,
    onClearPrice,
    onSavePrice,
    row.price_seller_id,
    row.product_id,
    stockStatus,
    t,
    value,
  ])

  const clearStockStatusLocally = useCallback(() => {
    setStockStatus(null)
  }, [])

  return {
    value,
    setValue,
    stockStatus,
    setStockStatus,
    saving,
    savedFlash,
    error,
    setError,
    handleSave,
    handleSetStockStatus,
    clearStockStatusLocally,
  }
}
