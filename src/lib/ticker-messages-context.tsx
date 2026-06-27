'use client'

import { createContext, useContext } from 'react'
import type { TickerMessagePublic } from '@/lib/site-ticker'

type TickerMessagesContextValue = {
  messages: TickerMessagePublic[]
}

const TickerMessagesContext = createContext<TickerMessagesContextValue>({ messages: [] })

export function TickerMessagesProvider({
  initialMessages,
  children,
}: {
  initialMessages: TickerMessagePublic[]
  children: React.ReactNode
}) {
  return (
    <TickerMessagesContext.Provider value={{ messages: initialMessages }}>
      {children}
    </TickerMessagesContext.Provider>
  )
}

export function useTickerMessages(): TickerMessagesContextValue {
  return useContext(TickerMessagesContext)
}
