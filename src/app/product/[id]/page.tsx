'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { ArrowLeftIcon, StarIcon, HeartIcon, ShareIcon, TruckIcon, ShieldCheckIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

// Mock product data - replace with actual Supabase query
const mockProduct = {
  id: '1',
  name: 'Temprador WooCommerce Template',
  description: 'Great software is built with amazing developers. This premium WooCommerce template provides everything you need to create a professional online store with modern design and powerful functionality.',
  longDescription: `Temprador is a premium WooCommerce template designed for modern e-commerce businesses. Built with the latest web technologies, it offers:

• Responsive design that works perfectly on all devices
• Advanced product filtering and search capabilities
• Multiple layout options and customization possibilities
• SEO optimized structure for better search engine rankings
• Fast loading times and excellent performance
• Comprehensive documentation and support

Perfect for fashion stores, electronics, home goods, and any other e-commerce business looking for a professional and modern online presence.`,
  price: 59.0,
  original_price: 65.0,
  sku: 'TEMP-WC-001',
  category: 'WordPress Theme',
  author: 'TripleZero iT',
  author_icon: 'i',
  rating: 4.8,
  reviewCount: 127,
  downloads: 2341,
  lastUpdated: '2024-01-15',
  version: '2.1.0',
  compatibility: 'WordPress 6.0+, WooCommerce 7.0+',
  license: 'GPL v2 or later',
  tags: ['WooCommerce', 'WordPress', 'E-commerce', 'Responsive', 'Modern'],
  features: [
    'Responsive Design',
    'Advanced Product Filtering',
    'Multiple Layout Options',
    'SEO Optimized',
    'Fast Loading',
    'Customizable Colors',
    'Translation Ready',
    'RTL Support'
  ],
  requirements: [
    'WordPress 6.0 or higher',
    'WooCommerce 7.0 or higher',
    'PHP 8.0 or higher',
    'MySQL 5.7 or higher'
  ],
  image_url: 'https://picsum.photos/600/400?random=1',
  gallery: [
    'https://picsum.photos/600/400?random=1',
    'https://picsum.photos/600/400?random=2',
    'https://picsum.photos/600/400?random=3',
    'https://picsum.photos/400/300?random=4',
    'https://picsum.photos/400/300?random=5'
  ],
  demo_url: 'https://demo.temprador.com',
  documentation_url: 'https://docs.temprador.com',
  support_url: 'https://support.triplezero-it.com',
  created_at: '2024-01-01',
  updated_at: '2024-01-15',
}

export default function ProductPage() {
  const params = useParams()
  const { addItem, isInCart, getItemQuantity } = useCart()
  const { theme, toggleTheme } = useTheme()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedLicense, setSelectedLicense] = useState('standard')
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [activeTab, setActiveTab] = useState('description')

  // In a real app, fetch product data based on params.id
  const product = mockProduct

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        original_price: product.original_price,
        image_url: product.image_url,
      })
    } finally {
      setIsAdding(false)
    }
  }

  const quantityInCart = getItemQuantity(product.id)
  const inCart = isInCart(product.id)

  const licenseOptions = [
    { id: 'standard', name: 'Standard License', price: product.price, description: 'Use for 1 project' },
    { id: 'extended', name: 'Extended License', price: product.price * 2.5, description: 'Use for multiple projects' },
    { id: 'unlimited', name: 'Unlimited License', price: product.price * 4, description: 'Unlimited use' }
  ]

  const selectedLicenseOption = licenseOptions.find(option => option.id === selectedLicense)

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
    } overflow-x-hidden`}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Search and Actions */}
        <div className={`transition-colors duration-200 ${
          theme === 'dark' ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
        } border-b px-4 sm:px-6 lg:px-8 py-4`}>
          <div className="flex items-center justify-between">
            {/* Breadcrumb Navigation - Left Side */}
            <div className="flex items-center space-x-4">
              <Link href="/" className={`transition-colors ${
                theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
              <div className={`flex items-center space-x-2 text-sm transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <Link href="/" className={`hover:text-white transition-colors ${
                  theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'
                }`}>Home</Link>
                <span>/</span>
                <Link href={`/?category=${product.category}`} className={`hover:text-white transition-colors ${
                  theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'
                }`}>
                  {product.category}
                </Link>
                <span>/</span>
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  {product.name}
                </span>
              </div>
            </div>

            {/* Action Icons - Right Side */}
            <div className="flex items-center space-x-4">
              {/* Light/Dark Mode Toggle */}
              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  theme === 'dark' 
                    ? 'text-gray-400 hover:text-white hover:bg-dark-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`} 
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              
              {/* Overview/Grid Icon */}
              <button className={`p-2 rounded-lg transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:text-white hover:bg-dark-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`} title="Grid View">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              
              {/* Cart Icon with Notification Badge */}
              <Link href="/cart" className={`relative p-2 rounded-lg transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:text-white hover:bg-dark-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`} title="Shopping Cart">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {quantityInCart > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full w-5 h-6 flex items-center justify-center font-medium">
                    {quantityInCart > 99 ? '99+' : quantityInCart}
                  </span>
                )}
              </Link>
              
              {/* Become a Seller Button */}
              <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 hover:shadow-lg" title="Become a Seller">
                Become a Seller
              </button>
            </div>
          </div>
        </div>

        <main className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 ${
          theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className={`relative aspect-video rounded-lg overflow-hidden ${
              theme === 'dark' ? 'bg-dark-800' : 'bg-gray-100'
            }`}>
              <Image
                src={product.gallery[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
              />
              <div className="absolute top-4 right-4 flex space-x-2">
                <button className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-dark-800 bg-opacity-80 text-gray-300 hover:text-white' 
                    : 'bg-white bg-opacity-90 text-gray-600 hover:text-gray-900 shadow-lg'
                }`}>
                  <HeartIcon className="w-5 h-5" />
                </button>
                <button className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-dark-800 bg-opacity-80 text-gray-300 hover:text-white' 
                    : 'bg-white bg-opacity-90 text-gray-600 hover:text-gray-900 shadow-lg'
                }`}>
                  <ShareIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            <div className="grid grid-cols-5 gap-2">
              {product.gallery.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    theme === 'dark' ? 'bg-dark-800' : 'bg-gray-100'
                  } ${
                    selectedImage === index 
                      ? 'border-primary-500' 
                      : theme === 'dark' 
                        ? 'border-transparent hover:border-gray-600' 
                        : 'border-transparent hover:border-gray-400'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${product.name} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            {/* Product Header */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`text-sm px-2 py-1 rounded ${
                  theme === 'dark' 
                    ? 'text-gray-400 bg-dark-700' 
                    : 'text-gray-600 bg-gray-200'
                }`}>
                  {product.category}
                </span>
                <span className={`text-sm px-2 py-1 rounded ${
                  theme === 'dark' 
                    ? 'text-gray-400 bg-dark-700' 
                    : 'text-gray-600 bg-gray-200'
                }`}>
                  v{product.version}
                </span>
              </div>
              
              <h1 className={`text-3xl font-bold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {product.name}
              </h1>
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <StarIconSolid
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating) 
                          ? 'text-yellow-400' 
                          : theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>{product.rating}</span>
                </div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  ({product.reviewCount} reviews)
                </span>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>•</span>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {product.downloads} downloads
                </span>
              </div>
            </div>

                        {/* Price and License Selection */}
            <div className={`rounded-lg p-6 border ${
              theme === 'dark' 
                ? 'bg-dark-800 border-dark-700' 
                : 'bg-white border-gray-200 shadow-lg'
            }`}>
              <div className="flex items-baseline space-x-3 mb-4">
                <span className="text-3xl font-bold text-primary-500">
                  € {selectedLicenseOption?.price.toFixed(2).replace('.', ',')}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span className={`text-xl line-through ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    € {product.original_price.toFixed(2).replace('.', ',')}
                </span>
                )}
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>EUR</span>
              </div>

              {/* License Options */}
              <div className="space-y-3 mb-6">
                <label className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>License Type:</label>
                {licenseOptions.map((option) => (
                  <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="license"
                      value={option.id}
                      checked={selectedLicense === option.id}
                      onChange={(e) => setSelectedLicense(e.target.value)}
                      className="text-primary-500 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>{option.name}</span>
                        <span className="text-primary-500 font-bold">
                          € {option.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Add to Cart Section */}
              <div className="space-y-4">
                {inCart ? (
                  <div className="text-center">
                    <div className="text-green-400 mb-2">✓ Added to Cart</div>
                    <div className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Quantity in cart: {quantityInCart}
                    </div>
                    <Link 
                      href="/cart"
                      className="btn-primary w-full mt-3"
                    >
                      View Cart
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-3">
                      <label className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Quantity:</label>
                      <div className={`flex items-center border rounded-lg ${
                        theme === 'dark' ? 'border-dark-600' : 'border-gray-300'
                      }`}>
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className={`px-3 py-2 transition-colors ${
                            theme === 'dark' 
                              ? 'text-gray-400 hover:text-white' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          -
                        </button>
                        <span className={`px-3 py-2 min-w-[3rem] text-center ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className={`px-3 py-2 transition-colors ${
                            theme === 'dark' 
                              ? 'text-gray-400 hover:text-white' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleAddToCart}
                      disabled={isAdding}
                      className="btn-primary w-full py-3 text-lg font-medium"
                    >
                      {isAdding ? 'Adding to Cart...' : 'Add to Cart'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-lg p-4 border ${
                theme === 'dark' 
                  ? 'bg-dark-800 border-dark-700' 
                  : 'bg-white border-gray-200 shadow-lg'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <TruckIcon className="w-5 h-5 text-primary-500" />
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Instant Download</span>
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>Get your files immediately after purchase</p>
              </div>
              
              <div className={`rounded-lg p-4 border ${
                theme === 'dark' 
                  ? 'bg-dark-800 border-dark-700' 
                  : 'bg-white border-gray-200 shadow-lg'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <ShieldCheckIcon className="w-5 h-5 text-primary-500" />
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Secure Payment</span>
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>SSL encrypted, secure checkout</p>
              </div>
            </div>

            {/* Product Meta */}
            <div className={`rounded-lg p-4 border ${
              theme === 'dark' 
                ? 'bg-dark-800 border-dark-700' 
                : 'bg-white border-gray-200 shadow-lg'
            }`}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>SKU:</span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{product.sku}</span>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Category:</span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{product.category}</span>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Author:</span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{product.author}</span>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Last Updated:</span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{product.lastUpdated}</span>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Version:</span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{product.version}</span>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>License:</span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{product.license}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-16">
          <div className={`border-b ${
            theme === 'dark' ? 'border-dark-700' : 'border-gray-200'
          }`}>
            <nav className="flex space-x-8">
              {[
                { id: 'description', name: 'Description' },
                { id: 'features', name: 'Features' },
                { id: 'requirements', name: 'Requirements' },
                { id: 'reviews', name: 'Reviews' },
                { id: 'support', name: 'Support' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-500'
                      : theme === 'dark'
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="py-8">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className={`leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>{product.longDescription}</p>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'requirements' && (
              <div className="space-y-4">
                <div className={`rounded-lg p-4 border ${
                  theme === 'dark' 
                    ? 'bg-dark-800 border-dark-700' 
                    : 'bg-white border-gray-200 shadow-lg'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>System Requirements</h4>
                  <div className="space-y-2">
                    {product.requirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                        <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`rounded-lg p-4 border ${
                  theme === 'dark' 
                    ? 'bg-dark-800 border-dark-700' 
                    : 'bg-white border-gray-200 shadow-lg'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Compatibility</h4>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{product.compatibility}</p>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className={`text-2xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Customer Reviews</h3>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Reviews coming soon!</p>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link 
                  href={product.demo_url}
                  target="_blank"
                  className={`rounded-lg p-6 border transition-colors text-center ${
                    theme === 'dark' 
                      ? 'bg-dark-800 border-dark-700 hover:border-primary-500' 
                      : 'bg-white border-gray-200 hover:border-primary-500 shadow-lg'
                  }`}
                >
                  <div className="w-12 h-12 bg-primary-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">🎯</span>
                  </div>
                  <h4 className={`font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Live Demo</h4>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>See the template in action</p>
                </Link>
                
                <Link 
                  href={product.documentation_url}
                  target="_blank"
                  className={`rounded-lg p-6 border transition-colors text-center ${
                    theme === 'dark' 
                      ? 'bg-dark-800 border-dark-700 hover:border-primary-500' 
                      : 'bg-white border-gray-200 hover:border-primary-500 shadow-lg'
                  }`}
                >
                  <div className="w-12 h-12 bg-primary-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">📚</span>
                  </div>
                  <h4 className={`font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Documentation</h4>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Complete setup guide</p>
                </Link>
                
                <Link 
                  href={product.support_url}
                  target="_blank"
                  className={`rounded-lg p-6 border transition-colors text-center ${
                    theme === 'dark' 
                      ? 'bg-dark-800 border-dark-700 hover:border-primary-500' 
                      : 'bg-white border-gray-200 hover:border-primary-500 shadow-lg'
                  }`}
                >
                  <div className="w-12 h-12 bg-primary-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">🆘</span>
                  </div>
                  <h4 className={`font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Support</h4>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Get help when you need it</p>
                </Link>
              </div>
            )}
          </div>
        </div>
          </div>
        </main>
      </div>
    </div>
  )
}
