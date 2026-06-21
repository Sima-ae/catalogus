'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ProductCard from '@/components/shop/ProductCard'
import { catalogGridClassName } from '@/components/shop/CatalogPagination'
import type { Product } from '@/lib/types'

const HOLD_MS = 180
const MOVE_CANCEL_PX = 8

type Props = {
  products: Product[]
  reorderEnabled: boolean
  saving?: boolean
  onReorder: (productIds: string[]) => void | Promise<void>
  onProductDeleted?: (productId: string) => void
  onProductBrandUpdated?: (productId: string, patch: { name: string; brand: string | null }) => void
}

function reorderList<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  const from = list.findIndex((item) => item.id === fromId)
  const to = list.findIndex((item) => item.id === toId)
  if (from < 0 || to < 0 || from === to) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

type DragState = {
  id: string
  pointerId: number
  startX: number
  startY: number
  holdTimer: number | null
  active: boolean
}

export default function SortableProductGrid({
  products,
  reorderEnabled,
  saving = false,
  onReorder,
  onProductDeleted,
  onProductBrandUpdated,
}: Props) {
  const [ordered, setOrdered] = useState(products)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    setOrdered(products)
  }, [products])

  const clearDrag = useCallback(() => {
    const d = dragRef.current
    if (d?.holdTimer) clearTimeout(d.holdTimer)
    dragRef.current = null
    setDraggingId(null)
    setOverId(null)
  }, [])

  const finishDrag = useCallback(
    async (fromId: string, toId: string) => {
      const next = reorderList(ordered, fromId, toId)
      if (next === ordered) return
      setOrdered(next)
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      await onReorder(next.map((p) => p.id))
    },
    [onReorder, ordered]
  )

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, productId: string) => {
    if (!reorderEnabled || saving) return
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, textarea, select')) return

    const holdTimer = window.setTimeout(() => {
      if (!dragRef.current || dragRef.current.id !== productId) return
      dragRef.current.active = true
      setDraggingId(productId)
    }, HOLD_MS)

    dragRef.current = {
      id: productId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      holdTimer,
      active: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return

    const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
    if (!d.active && moved > MOVE_CANCEL_PX) {
      if (d.holdTimer) clearTimeout(d.holdTimer)
      dragRef.current = null
      return
    }

    if (!d.active) return

    e.preventDefault()
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const sortable = el?.closest('[data-sortable-id]') as HTMLElement | null
    setOverId(sortable?.dataset.sortableId ?? null)
  }

  const onPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return

    if (d.holdTimer) clearTimeout(d.holdTimer)

    const dropId = overId
    const wasActive = d.active
    const dragId = d.id

    clearDrag()
    e.currentTarget.releasePointerCapture(e.pointerId)

    if (wasActive && dropId && dropId !== dragId) {
      await finishDrag(dragId, dropId)
    }
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    clearDrag()
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  if (!reorderEnabled) {
    return (
      <div className={`${catalogGridClassName} ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
        {ordered.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            onDeleted={onProductDeleted}
            onBrandUpdated={onProductBrandUpdated}
            imagePriority={index < 6}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${catalogGridClassName} ${saving ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {ordered.map((product, index) => {
        const isDragging = draggingId === product.id
        const isOver = overId === product.id && draggingId != null && !isDragging

        return (
          <div
            key={product.id}
            data-sortable-id={product.id}
            data-product-id={product.id}
            onPointerDown={(e) => onPointerDown(e, product.id)}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => void onPointerUp(e)}
            onPointerCancel={onPointerCancel}
            onClickCapture={(e) => {
              if (suppressClickRef.current || draggingId) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            className={`relative cursor-grab transition-shadow duration-150 active:cursor-grabbing touch-none ${
              isDragging ? 'z-20 scale-[0.98] opacity-55 shadow-lg' : ''
            } ${isOver ? 'ring-2 ring-primary-500 ring-offset-2 rounded-xl' : ''}`}
            style={{ touchAction: 'none' }}
          >
            <ProductCard
              product={product}
              onDeleted={onProductDeleted}
              onBrandUpdated={onProductBrandUpdated}
              imagePriority={index < 6}
            />
          </div>
        )
      })}
    </div>
  )
}
