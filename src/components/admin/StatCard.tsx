'use client'

import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  accentColor: string
  change?: string
}

export default function StatCard({ title, value, icon, accentColor, change }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p className="text-sm text-gray-400 mt-1">{change}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div className={`h-1 ${accentColor} rounded-full mt-4`} />
    </div>
  )
}
