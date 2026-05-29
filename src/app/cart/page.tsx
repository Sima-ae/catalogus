'use client'

import { useCart } from '@/lib/cart'
import { useCatalogModeRedirect } from '@/lib/use-catalog-mode-redirect'
import { useTheme } from '@/lib/theme'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar, { SidebarMenuButton, useMobileSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { formatPrice, isZeroPrice } from '@/lib/format-price'

export default function CartPage() {
  const { blocked } = useCatalogModeRedirect()
  const { state: cartState, removeItem, updateQuantity, clearCart } = useCart()
  const { theme } = useTheme()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const { mobileOpen, open, close } = useMobileSidebar()

  if (blocked) return null

  const handleQuantityChange = async (id: string, newQuantity: number) => {
    setIsUpdating(id)
    try {
      updateQuantity(id, newQuantity)
    } finally {
      setIsUpdating(null)
    }
  }

  const handleRemoveItem = async (id: string) => {
    setIsUpdating(id)
    try {
      removeItem(id)
    } finally {
      setIsUpdating(null)
    }
  }

  if (cartState.items.length === 0) {
    return (
      <div className={`flex min-h-screen transition-colors duration-200 ${
        theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
      } overflow-x-hidden`}>
        <Sidebar open={mobileOpen} onClose={close} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <AppStickyHeader
            title="Shopping Cart"
            showSocialProof
            leading={<SidebarMenuButton open={mobileOpen} onOpen={open} />}
            actions={<ShopHeroHeaderActions />}
          />

          <main className={`flex-1 flex items-center justify-center transition-colors duration-200 ${
            theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
          }`}>
            <div className="text-center">
              <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center transition-colors ${
                theme === 'dark' ? 'bg-dark-800' : 'bg-white'
              }`}>
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Your cart is empty</h2>
              <p className={`mb-6 transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Looks like you haven&apos;t added any products to your cart yet.</p>
              <Link 
                href="/"
                className="btn-primary inline-flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
    } overflow-x-hidden`}>
      <Sidebar open={mobileOpen} onClose={close} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <AppStickyHeader
          title="Shopping Cart"
          showSocialProof
          leading={
            <>
              <SidebarMenuButton open={mobileOpen} onOpen={open} />
              <Link
                href="/"
                className={`transition-colors shrink-0 ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
            </>
          }
          actions={
            <div className="flex flex-nowrap items-center justify-end gap-2 w-full min-w-0">
              <button
                type="button"
                onClick={clearCart}
                className="text-red-400 hover:text-red-300 transition-colors text-xs sm:text-sm whitespace-nowrap shrink-0"
              >
                Clear Cart
              </button>
              <ShopHeroHeaderActions />
            </div>
          }
        />

        <main className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 ${
          theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
        }`}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {cartState.items.map((item) => (
                    <div key={item.id} className={`rounded-lg p-4 border transition-colors ${
                      theme === 'dark' 
                        ? 'bg-dark-800 border-dark-700' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-4">
                        {/* Product Image */}
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-sm line-clamp-2 mb-1 transition-colors ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {item.name}
                          </h3>
                          {(item.size || item.color) && (
                            <p className={`text-xs mb-1 transition-colors ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-primary-500 font-bold">
                              {formatPrice(item.price)}
                            </span>
                            {item.original_price &&
                              !isZeroPrice(item.original_price) &&
                              item.original_price > item.price &&
                              !isZeroPrice(item.price) && (
                              <span className={`line-through text-sm transition-colors ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {formatPrice(item.original_price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={isUpdating === item.id || item.quantity <= 1}
                            className={`w-8 h-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              theme === 'dark'
                                ? 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                                : 'bg-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                            }`}
                          >
                            -
                          </button>
                          <span className={`w-12 text-center font-medium transition-colors ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {isUpdating === item.id ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={isUpdating === item.id}
                            className={`w-8 h-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              theme === 'dark'
                                ? 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                                : 'bg-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                            }`}
                          >
                            +
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isUpdating === item.id}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                          title="Remove item"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className={`rounded-lg p-6 border sticky top-28 lg:top-32 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-dark-800 border-dark-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <h2 className={`text-xl font-bold mb-4 transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Order Summary</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className={`flex justify-between transition-colors ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <span>Subtotal ({cartState.itemCount} items)</span>
                      <span>{formatPrice(cartState.total)}</span>
                    </div>
                    <div className={`flex justify-between transition-colors ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <span>Tax</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className={`border-t pt-3 ${
                      theme === 'dark' ? 'border-dark-600' : 'border-gray-300'
                    }`}>
                      <div className={`flex justify-between text-lg font-bold transition-colors ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <span>Total</span>
                        <span>{formatPrice(cartState.total)}</span>
                      </div>
                    </div>
                  </div>

                  <Link href="/checkout" className="w-full btn-primary py-3 text-lg font-medium text-center block">
                    Proceed to Checkout
                  </Link>

                  <div className="mt-4 text-center">
                    <Link href="/" className={`transition-colors text-sm ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}>
                      Continue Shopping
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}