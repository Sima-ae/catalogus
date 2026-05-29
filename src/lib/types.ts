export interface Product {
  id: string
  name: string
  description: string
  short_description?: string
  price: number
  original_price?: number
  image_url: string
  gallery_images?: string[]
  category: string
  brand?: string
  brand_id?: string | null
  tags?: string[]
  author_id?: string
  author: string
  author_icon: string
  sku?: string
  download_url?: string
  demo_url?: string
  documentation_url?: string
  support_url?: string
  compatibility?: string
  version?: string
  license_type?: string
  file_size?: string
  requirements?: any
  features?: string[]
  changelog?: string
  rating?: number
  review_count?: number
  download_count?: number
  status: 'active' | 'inactive' | 'draft'
  featured?: boolean
  created_at: string
  updated_at: string
}

