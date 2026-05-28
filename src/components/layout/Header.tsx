'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  MagnifyingGlassIcon,
  MoonIcon,
  Squares2X2Icon,
  ShoppingCartIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="header px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-lg hover:bg-dark-700 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gradient">Pixer</h1>
        </div>

        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search your route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-lg hover:bg-dark-700 transition-colors">
            <MoonIcon className="w-6 h-6" />
          </button>
          
          <button className="p-2 rounded-lg hover:bg-dark-700 transition-colors">
            <Squares2X2Icon className="w-6 h-6" />
          </button>
          
          <Link href="/cart" className="relative p-2 rounded-lg hover:bg-dark-700 transition-colors">
            <ShoppingCartIcon className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              0
            </span>
          </Link>
          
          <Link href="/seller" className="btn-primary">
            Become a seller
          </Link>
          
          <div className="relative">
            <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-dark-700 transition-colors">
              <UserCircleIcon className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
