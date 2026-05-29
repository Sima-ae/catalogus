'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { appPath } from '@/lib/paths'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AdminSidebar, { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import StatCard from '@/components/admin/StatCard'
import { 
  BanknotesIcon, 
  ShoppingCartIcon, 
  ClipboardDocumentListIcon, 
  ShoppingBagIcon,
  EyeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { useAppTheme } from '@/lib/theme-classes'

const timeFilters = ['Today', 'Weekly', 'Monthly', 'Yearly']

interface Product {
  id: string
  name: string
  description: string
  price: number
  original_price?: number
  image_url: string
  category: string
  author: string
  author_icon: string
  created_at: string
  updated_at: string
}

interface Order {
  id: string
  tracking_number: string
  customer_email: string
  customer_name: string
  total: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  created_at: string
}

export default function AdminDashboard() {
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('Today')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalVendors: 0
  })
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, loading: authLoading, isAdmin } = useAuth()
  const t = useAppTheme()

  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (isDevelopment) {
    console.log('🔍 AdminDashboard render:', { hasUser: !!user, authLoading, isAdmin, loading })
  }

  useEffect(() => {
    if (isDevelopment) {
      console.log('🔍 AdminDashboard useEffect triggered')
    }
    if (!authLoading && user && isAdmin) {
      if (isDevelopment) {
        console.log('🔍 User authenticated and is admin, fetching data...')
      }
      fetchData()
    } else if (!authLoading && !user) {
      if (isDevelopment) {
        console.log('🔍 User not authenticated')
      }
    } else if (!authLoading && !isAdmin) {
      if (isDevelopment) {
        console.log('🔍 User not admin')
      }
    }
  }, [authLoading, user, isAdmin, isDevelopment])

  const fetchData = async () => {
    let productsData: Product[] = []
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    try {
      setLoading(true)
      if (isDevelopment) {
        console.log('🔄 Starting admin data fetch...')
      }
      
      if (isDevelopment) {
        console.log('📦 Fetching products...')
      }
      const productsResponse = await fetch(appPath('/api/products'), { method: 'GET' })

      if (!productsResponse.ok) {
        throw new Error(`Products fetch failed: ${productsResponse.status}`)
      }

      productsData = await productsResponse.json()
      if (isDevelopment) {
        console.log('✅ Products fetched:', productsData?.length || 0, 'products')
      }
      
      // Set products immediately so they display
      setProducts(productsData || [])
      
      // Calculate basic stats with products
      const totalProducts = productsData?.length || 0
      const totalVendors = new Set(productsData?.map((p: Product) => p.author) || []).size
      
      // Set initial stats
      setStats({
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts,
        totalVendors
      })

      // Fetch orders from local API
      let ordersData: any[] = []
      try {
        if (isDevelopment) console.log('📦 Fetching orders...')
        const ordersResponse = await fetch(appPath('/api/orders'), { method: 'GET' })
        if (ordersResponse.ok) {
          ordersData = await ordersResponse.json()
          if (isDevelopment) console.log('✅ Orders fetched:', ordersData.length, 'orders')
        }
      } catch {
        if (isDevelopment) console.log('⚠️ Orders not available, continuing without orders')
      }

      // Update stats with orders if available
      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total, 0) || 0
      const totalOrders = ordersData?.length || 0
      
      setOrders(ordersData || [])
      setStats({
        totalRevenue,
        totalOrders,
        totalProducts,
        totalVendors
      })
      
      if (isDevelopment) {
        console.log('✅ Admin data fetch completed successfully')
      }
    } catch (error) {
      if (isDevelopment) {
        console.error('💥 Error in admin data fetch:', error instanceof Error ? error.message : 'Unknown error')
      }
      // Even if there's an error, try to show products if we have them
      if (productsData && productsData.length > 0) {
        setProducts(productsData)
        setStats({
          totalRevenue: 0,
          totalOrders: 0,
          totalProducts: productsData.length,
          totalVendors: new Set(productsData.map((p: Product) => p.author)).size
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const res = await fetch(appPath(`/api/products/${productId}`), { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)

      // Refresh data
      fetchData()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting product:', error instanceof Error ? error.message : 'Unknown error')
      }
      alert('Failed to delete product')
    }
  }

  // Show loading state while auth is loading
  if (authLoading) {
    if (isDevelopment) {
      console.log('🔍 Showing auth loading state')
    }
    return (
      <div className={`flex min-h-screen ${t.page}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center ${t.heading}`}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4">Authenticating...</p>
            <p className="text-sm text-gray-400 mt-2">This may take a few seconds</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 text-primary-400 hover:text-primary-300 underline"
            >
              Click here if this takes too long
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show error if user is not admin
  if (!user || !isAdmin) {
    if (isDevelopment) {
      console.log('🔍 User not authenticated or not admin, showing error')
    }
    return (
      <div className={`flex min-h-screen ${t.page}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center max-w-md mx-auto ${t.heading}`}>
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className={`mb-6 ${t.muted}`}>
              {!user ? 'Please log in to access the admin dashboard.' : 'You do not have permission to access this page.'}
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => { window.location.href = appPath('/login') }} 
                className="btn-primary w-full"
              >
                Go to Login
              </button>
            </div>
            

          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    if (isDevelopment) {
      console.log('🔍 Showing data loading state')
    }
    return (
      <div className={`flex min-h-screen overflow-x-hidden ${t.page}`}>
        <AdminSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div className={`text-center ${t.heading}`}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (isDevelopment) {
    console.log('🔍 Rendering admin dashboard with:', { products: products.length, orders: orders.length, stats })
  }

  return (
    <div className={`flex min-h-screen overflow-x-hidden ${t.page}`}>
      <AdminSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className={`flex items-center gap-2 px-4 pt-4 lg:hidden border-b ${t.border}`}
        >
          <AdminMobileMenuButton onClick={() => setMobileNavOpen(true)} />
          <span className={`font-medium ${t.heading}`}>Admin Dashboard</span>
        </div>
        <AdminHeader />

        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {/* Summary Section */}
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${t.heading}`}>Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={`€ ${stats.totalRevenue.toFixed(2).replace('.', ',')}`}
                icon={<BanknotesIcon className="w-6 h-6 text-white" />}
                accentColor="bg-green-500"
              />
              <StatCard
                title="Total Orders"
                value={stats.totalOrders.toString()}
                icon={<ShoppingCartIcon className="w-6 h-6 text-white" />}
                accentColor="bg-purple-500"
              />
              <StatCard
                title="Total Products"
                value={stats.totalProducts.toString()}
                icon={<ClipboardDocumentListIcon className="w-6 h-6 text-white" />}
                accentColor="bg-pink-500"
              />
              <StatCard
                title="Total Vendors"
                value={stats.totalVendors.toString()}
                icon={<ShoppingBagIcon className="w-6 h-6 text-white" />}
                accentColor="bg-red-500"
              />
            </div>
          </div>

          {/* Products Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-semibold ${t.heading}`}>Products</h2>
              <Link href="/admin/products/new" className="btn-primary flex items-center space-x-2">
                <PlusIcon className="w-5 h-5" />
                <span>Add Product</span>
              </Link>
            </div>
            
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${t.rowBorder}`}>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Product</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Category</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Price</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Author</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length > 0 ? (
                      products.map((product) => (
                        <tr key={product.id} className={`border-b ${t.rowBorder}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded object-cover"
                                unoptimized
                              />
                              <div>
                                <p className={`font-medium ${t.tableCell}`}>{product.name}</p>
                                <p className={`text-sm line-clamp-1 ${t.muted}`}>{product.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className={`py-3 px-4 ${t.tableCell}`}>{product.category}</td>
                          <td className={`py-3 px-4 ${t.tableCell}`}>
                            € {product.price.toFixed(2).replace('.', ',')}
                          </td>
                          <td className={`py-3 px-4 ${t.tableCell}`}>{product.author}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <button className={`p-2 rounded-lg transition-colors ${t.iconBtn}`}>
                                <EyeIcon className="w-5 h-5" />
                              </button>
                              <Link
                                href={`/admin/products/${product.id}/edit`}
                                className={`p-2 rounded-lg transition-colors inline-flex ${t.iconBtn}`}
                              >
                                <PencilIcon className="w-5 h-5" />
                              </Link>
                              <button 
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-500 hover:text-red-400"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className={`py-8 text-center ${t.muted}`}>
                          No products found. Add your first product to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Orders Section */}
          <div>
            <h2 className={`text-xl font-semibold mb-4 ${t.heading}`}>Recent Orders</h2>
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${t.rowBorder}`}>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Order ID</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Customer</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Total</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Status</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Date</th>
                      <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length > 0 ? (
                      orders.map((order) => (
                        <tr key={order.id} className={`border-b ${t.rowBorder}`}>
                          <td className={`py-3 px-4 ${t.tableCell}`}>{order.id}</td>
                          <td className="py-3 px-4">
                            <div>
                              <p className={t.tableCell}>{order.customer_name}</p>
                              <p className={`text-sm ${t.muted}`}>{order.customer_email}</p>
                            </div>
                          </td>
                          <td className={`py-3 px-4 ${t.tableCell}`}>
                            € {order.total.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              order.status === 'completed' 
                                ? 'bg-green-500 text-white' 
                                : order.status === 'pending'
                                ? 'bg-yellow-500 text-white'
                                : order.status === 'processing'
                                ? 'bg-blue-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                          <td className={`py-3 px-4 ${t.muted}`}>
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <button className={`p-2 rounded-lg transition-colors ${t.iconBtn}`}>
                              <EyeIcon className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className={`py-8 text-center ${t.muted}`}>
                          No orders found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
