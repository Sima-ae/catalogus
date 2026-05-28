'use client'

import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function CartPage() {
  const { state: cartState, removeItem, updateQuantity, clearCart } = useCart()
  const { theme } = useTheme()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

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
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className={`transition-colors duration-200 ${
            theme === 'dark' ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
          } border-b px-4 sm:px-6 lg:px-8 py-4`}>
            <div className="flex items-center justify-between">
              <h1 className={`text-2xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Shopping Cart</h1>
            </div>
          </div>

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
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className={`transition-colors duration-200 ${
          theme === 'dark' ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
        } border-b px-4 sm:px-6 lg:px-8 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className={`transition-colors ${
                theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
              <h1 className={`text-2xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Shopping Cart</h1>
              <span className={`transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>({cartState.itemCount} items)</span>
            </div>
            <button
              onClick={clearCart}
              className="text-red-400 hover:text-red-300 transition-colors text-sm"
            >
              Clear Cart
            </button>
          </div>
        </div>

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
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-primary-500 font-bold">
                              € {item.price.toFixed(2).replace('.', ',')}
                            </span>
                            {item.original_price && item.original_price > item.price && (
                              <span className={`line-through text-sm transition-colors ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                € {item.original_price.toFixed(2).replace('.', ',')}
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
                <div className={`rounded-lg p-6 border sticky top-8 transition-colors ${
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
                      <span>€ {cartState.total.toFixed(2).replace('.', ',')}</span>
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
                        <span>€ {cartState.total.toFixed(2).replace('.', ',')}</span>
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