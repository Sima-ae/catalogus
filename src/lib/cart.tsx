'use client'

import { createContext, useContext, useReducer, ReactNode, useEffect, useRef, useState } from 'react'
import { CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY } from '@/lib/brand'
import { productIsPurchasable } from '@/lib/shop-commerce'

export interface CartItem {
  id: string
  productId?: string
  name: string
  price: number
  original_price?: number
  image_url: string
  quantity: number
  size?: string
  color?: string
  /** Selected product option label (e.g. Swiss for Mechanism). */
  product_option?: string
}

export function buildCartLineId(
  productId: string,
  size?: string,
  color?: string,
  productOption?: string
): string {
  if (!size && !color && !productOption) return productId
  return `${productId}::${size || '-'}::${color || '-'}::${productOption || '-'}`
}

function normalizeCartItem(item: CartItem): CartItem {
  const productId = item.productId || item.id
  const size = item.size?.trim() || undefined
  const color = item.color?.trim() || undefined
  const product_option = item.product_option?.trim() || undefined
  return {
    ...item,
    productId,
    size,
    color,
    product_option,
    id: buildCartLineId(productId, size, color, product_option),
  }
}

/** Drop zero-price / invalid lines — cart is for Stripe-purchasable items only. */
function filterPurchasableItems(items: CartItem[]): CartItem[] {
  return items
    .map((item) => normalizeCartItem(item))
    .filter(
      (item) =>
        productIsPurchasable(item.price) &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0
    )
}

function totalsFromItems(items: CartItem[]): Pick<CartState, 'total' | 'itemCount'> {
  return {
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const line = normalizeCartItem(action.payload as CartItem)
      if (!productIsPurchasable(line.price)) {
        return state
      }
      const existingItem = state.items.find((item) => item.id === line.id)

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
          item.id === line.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        return { ...state, items: updatedItems, ...totalsFromItems(updatedItems) }
      }

      const newItems = [...state.items, { ...line, quantity: 1 }]
      return { ...state, items: newItems, ...totalsFromItems(newItems) }
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter((item) => item.id !== action.payload)
      return { ...state, items: updatedItems, ...totalsFromItems(updatedItems) }
    }

    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items
        .map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
            : item
        )
        .filter((item) => item.quantity > 0)
      return { ...state, items: updatedItems, ...totalsFromItems(updatedItems) }
    }

    case 'CLEAR_CART':
      return { ...state, items: [], total: 0, itemCount: 0 }

    case 'LOAD_CART': {
      const items = filterPurchasableItems(action.payload)
      return { ...state, items, ...totalsFromItems(items) }
    }

    default:
      return state
  }
}

interface CartContextType {
  state: CartState
  addItem: (item: Omit<CartItem, 'quantity' | 'id'> & { id?: string; productId?: string }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  isInCart: (
    productId: string,
    opts?: { size?: string; color?: string; product_option?: string }
  ) => boolean
  getItemQuantity: (
    productId: string,
    opts?: { size?: string; color?: string; product_option?: string }
  ) => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function readStoredCartItems(): CartItem[] {
  try {
    const savedCart =
      localStorage.getItem(CART_STORAGE_KEY) ?? localStorage.getItem(LEGACY_CART_STORAGE_KEY)
    if (!savedCart) return []
    const cartData = JSON.parse(savedCart)
    return Array.isArray(cartData) ? cartData : []
  } catch (error) {
    console.error('Error loading cart from localStorage:', error)
    return []
  }
}

function storedCartSignature(items: CartItem[]): string {
  return JSON.stringify(filterPurchasableItems(items))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const [isInitialized, setIsInitialized] = useState(false)
  const stateItemsRef = useRef(state.items)
  stateItemsRef.current = state.items

  useEffect(() => {
    dispatch({ type: 'LOAD_CART', payload: readStoredCartItems() })
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (!isInitialized) return
    try {
      const next = JSON.stringify(state.items)
      if (localStorage.getItem(CART_STORAGE_KEY) !== next) {
        localStorage.setItem(CART_STORAGE_KEY, next)
      }
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }, [state.items, isInitialized])

  // Keep cart in sync across browser tabs / windows.
  useEffect(() => {
    if (!isInitialized) return

    const syncFromStorage = () => {
      const stored = readStoredCartItems()
      if (storedCartSignature(stored) === storedCartSignature(stateItemsRef.current)) return
      dispatch({ type: 'LOAD_CART', payload: stored })
    }

    // storage events only fire in *other* tabs; focus/visibility catch stale tabs.
    const onStorage = (event: StorageEvent) => {
      if (
        event.key !== null &&
        event.key !== CART_STORAGE_KEY &&
        event.key !== LEGACY_CART_STORAGE_KEY
      ) {
        return
      }
      syncFromStorage()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncFromStorage()
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', syncFromStorage)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', syncFromStorage)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isInitialized])

  const addItem = (
    item: Omit<CartItem, 'quantity' | 'id'> & { id?: string; productId?: string }
  ) => {
    const productId = item.productId || item.id
    if (!productId) return
    if (!productIsPurchasable(item.price)) return
    const line = normalizeCartItem({
      ...item,
      id: item.id || productId,
      productId,
      quantity: 1,
    })
    dispatch({ type: 'ADD_ITEM', payload: line })
  }

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
      localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error)
    }
  }

  const isInCart = (
    productId: string,
    opts?: { size?: string; color?: string; product_option?: string }
  ) => {
    const lineId = buildCartLineId(productId, opts?.size, opts?.color, opts?.product_option)
    return state.items.some((item) => item.id === lineId)
  }

  const getItemQuantity = (
    productId: string,
    opts?: { size?: string; color?: string; product_option?: string }
  ) => {
    const lineId = buildCartLineId(productId, opts?.size, opts?.color, opts?.product_option)
    const item = state.items.find((row) => row.id === lineId)
    return item ? item.quantity : 0
  }

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isInCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
