'use client'

import { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react'
import { CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY } from '@/lib/brand'

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
}

export function buildCartLineId(
  productId: string,
  size?: string,
  color?: string
): string {
  if (!size && !color) return productId
  return `${productId}::${size || '-'}::${color || '-'}`
}

function normalizeCartItem(item: CartItem): CartItem {
  const productId = item.productId || item.id
  const size = item.size?.trim() || undefined
  const color = item.color?.trim() || undefined
  return {
    ...item,
    productId,
    size,
    color,
    id: buildCartLineId(productId, size, color),
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
      const existingItem = state.items.find(item => item.id === line.id)
      
      if (existingItem) {
        // Update quantity if item already exists
        const updatedItems = state.items.map(item =>
          item.id === line.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const newItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
        
        return {
          ...state,
          items: updatedItems,
          total: newTotal,
          itemCount: newItemCount,
        }
      } else {
        // Add new item
        const newItem = { ...line, quantity: 1 }
        const newItems = [...state.items, newItem]
        const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const newItemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
        
        return {
          ...state,
          items: newItems,
          total: newTotal,
          itemCount: newItemCount,
        }
      }
    }
    
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload)
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const newItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
      
      return {
        ...state,
        items: updatedItems,
        total: newTotal,
        itemCount: newItemCount,
      }
    }
    
    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: Math.max(0, action.payload.quantity) }
          : item
      ).filter(item => item.quantity > 0) // Remove items with 0 quantity
      
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const newItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
      
      return {
        ...state,
        items: updatedItems,
        total: newTotal,
        itemCount: newItemCount,
      }
    }
    
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        total: 0,
        itemCount: 0,
      }
    
    case 'LOAD_CART': {
      const items = action.payload.map((item) => normalizeCartItem(item))
      const newTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const newItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

      return {
        ...state,
        items,
        total: newTotal,
        itemCount: newItemCount,
      }
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
  isInCart: (productId: string, opts?: { size?: string; color?: string }) => boolean
  getItemQuantity: (productId: string, opts?: { size?: string; color?: string }) => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart =
        localStorage.getItem(CART_STORAGE_KEY) ?? localStorage.getItem(LEGACY_CART_STORAGE_KEY)
      if (savedCart) {
        const cartData = JSON.parse(savedCart)
        dispatch({ type: 'LOAD_CART', payload: cartData })
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Save cart to localStorage whenever state changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items))
      } catch (error) {
        console.error('Error saving cart to localStorage:', error)
      }
    }
  }, [state.items, isInitialized])

  const addItem = (item: Omit<CartItem, 'quantity' | 'id'> & { id?: string; productId?: string }) => {
    const productId = item.productId || item.id
    if (!productId) return
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
    // Also clear from localStorage
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
      localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error)
    }
  }

  const isInCart = (productId: string, opts?: { size?: string; color?: string }) => {
    const lineId = buildCartLineId(productId, opts?.size, opts?.color)
    return state.items.some(item => item.id === lineId)
  }

  const getItemQuantity = (productId: string, opts?: { size?: string; color?: string }) => {
    const lineId = buildCartLineId(productId, opts?.size, opts?.color)
    const item = state.items.find(item => item.id === lineId)
    return item ? item.quantity : 0
  }

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isInCart,
      getItemQuantity,
    }}>
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
