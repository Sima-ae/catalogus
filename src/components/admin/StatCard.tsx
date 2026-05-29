'use client'

import React from 'react'
import { useAppTheme } from '@/lib/theme-classes'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  accentColor: string
  change?: string
}

export default function StatCard({ title, value, icon, accentColor, change }: StatCardProps) {
  const t = useAppTheme()

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${t.muted}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${t.heading}`}>{value}</p>
          {change && <p className={`text-sm mt-1 ${t.muted}`}>{change}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div className={`h-1 ${accentColor} rounded-full mt-4`} />
    </div>
  )
}
