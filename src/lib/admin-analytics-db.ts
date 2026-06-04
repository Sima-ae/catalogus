import { countDistinctProductVendors, getProductDashboardStats } from '@/lib/products-db'
import { getOrdersAggregateSummary } from '@/lib/orders-db'
import { countUsers } from '@/lib/users-db'
import { queryDb } from '@/lib/db'

export type AdminAnalyticsSummary = {
  revenue: number
  orders: number
  completedOrders: number
  products: number
  users: number
  vendors: number
}

export async function getAdminAnalyticsSummary(): Promise<AdminAnalyticsSummary> {
  const [productCountRows, productStats, orders, users, vendors] = await Promise.all([
    queryDb<{ total: number }[]>(`SELECT COUNT(*) AS total FROM products`),
    getProductDashboardStats(),
    getOrdersAggregateSummary(),
    countUsers(),
    countDistinctProductVendors(),
  ])

  const allProducts = Number(productCountRows[0]?.total ?? 0)
  const products =
    allProducts > 0
      ? allProducts
      : productStats.total + productStats.trash

  return {
    revenue: orders.revenue,
    orders: orders.orders,
    completedOrders: orders.completedOrders,
    products,
    users,
    vendors,
  }
}
