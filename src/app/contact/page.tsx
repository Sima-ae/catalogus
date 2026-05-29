'use client'

import { useEffect, useState, FormEvent, type ComponentType } from 'react'
import ShopPageShell from '@/components/shop/ShopPageShell'
import { useTheme } from '@/lib/theme'
import { appPath } from '@/lib/paths'
import { APP_NAME, APP_COPYRIGHT } from '@/lib/brand'
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings'
import { parseSettingsResponse } from '@/lib/parse-settings-response'
import {
  EnvelopeIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const FAQ = [
  {
    q: 'How and when do I receive a product after purchase?',
    a: 'After you have placed your order we will send you a payment link. After you have made the payment you will receive your product(s) within the mentioned standard delivery time.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Products are generally non-refundable once purchased. Contact our sales support team with your order number if something is wrong with your purchase.',
  },
  {
    q: 'How do I become a seller?',
    a: 'Use “Become a Seller” in the sidebar to register. Once approved, you can list your products for sale.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We support online checkout for common european payment methods and we also accept BitCoin.',
  },
]

export default function ContactPage() {
  const { theme } = useTheme()
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(appPath('/api/settings/public'))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          setSettings(parseSettingsResponse(data).settings)
        }
      })
      .catch(() => {})
  }, [])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const heading = isDark ? 'text-white' : 'text-gray-900'
  const inputClass = isDark
    ? 'bg-dark-700 border-dark-600 text-white placeholder-gray-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'

  const supportEmail = settings.support_email?.trim()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (supportEmail) {
      const body = encodeURIComponent(
        `From: ${name} <${email}>\n\n${message}`
      )
      const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(subject || `Contact — ${APP_NAME}`)}&body=${body}`
      window.location.href = mailto
    }
    setSubmitted(true)
  }

  return (
    <ShopPageShell title="Contact" subtitle="We're here to help with orders, licensing, and seller questions">
      <section
        className={`rounded-2xl border p-6 sm:p-8 mb-8 ${
          isDark
            ? 'bg-gradient-to-br from-dark-800 via-dark-900 to-black border-dark-700'
            : 'bg-gradient-to-br from-gray-100 via-white to-gray-50 border-gray-200'
        }`}
      >
        <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${heading}`}>Get in touch</h2>
        <p className={`max-w-2xl ${muted}`}>
          Reach the {settings.site_name || APP_NAME} team for support, partnerships, or account help.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <InfoCard
            icon={EnvelopeIcon}
            title="E-mail"
            value={supportEmail || '—'}
            isDark={isDark}
          />
          <InfoCard icon={ClockIcon} title="Daily Opening Hours" value="08:00 – 20:00 CET" isDark={isDark} />
          <InfoCard icon={ShieldCheckIcon} title="Secure" value="Encrypted orders and payments" isDark={isDark} />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 items-stretch">
        <form
          onSubmit={handleSubmit}
          className={`rounded-xl border p-6 sm:p-8 h-full flex flex-col ${card}`}
        >
          <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 shrink-0 ${heading}`}>
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            Send a message
          </h3>
          {submitted && !supportEmail && (
            <p className="mb-4 text-amber-600 dark:text-amber-400 text-sm shrink-0">
              Your message was noted. Support email is not configured yet — an administrator can add it under Admin → Settings.
            </p>
          )}
          {submitted && supportEmail && (
            <p className="mb-4 text-green-600 dark:text-green-400 text-sm shrink-0">
              Your email client should open with your message ready to send.
            </p>
          )}
          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={`text-sm font-medium ${muted}`}>Name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:outline-none ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className={`text-sm font-medium ${muted}`}>Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:outline-none ${inputClass}`}
                />
              </label>
            </div>
            <label className="block">
              <span className={`text-sm font-medium ${muted}`}>Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Order help, seller inquiry, …"
                className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:outline-none ${inputClass}`}
              />
            </label>
            <label className="flex flex-1 flex-col min-h-[8rem]">
              <span className={`text-sm font-medium shrink-0 ${muted}`}>Message</span>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`mt-1 w-full flex-1 min-h-[8rem] px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:outline-none resize-y ${inputClass}`}
              />
            </label>
            <button type="submit" className="btn-primary w-full sm:w-auto px-8 py-2.5 shrink-0 mt-auto">
              {supportEmail ? 'Open in email' : 'Submit'}
            </button>
          </div>
        </form>

        <section className={`rounded-xl border p-6 sm:p-8 h-full flex flex-col ${card}`}>
          <h3 className={`text-lg font-semibold mb-6 shrink-0 ${heading}`}>Frequently asked questions</h3>
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {FAQ.map((item) => (
              <article
                key={item.q}
                className={`rounded-lg border p-4 ${
                  isDark ? 'border-dark-600 bg-dark-900/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <h4 className={`font-semibold mb-2 text-sm ${heading}`}>{item.q}</h4>
                <p className={`text-sm leading-relaxed ${muted}`}>{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <p className={`mt-10 text-center text-xs ${muted}`}>{APP_COPYRIGHT}</p>
    </ShopPageShell>
  )
}

function InfoCard({
  icon: Icon,
  title,
  value,
  isDark,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  value: string
  isDark: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        isDark ? 'bg-dark-800/80 border-dark-600' : 'bg-white border-gray-200 shadow-sm'
      }`}
    >
      <Icon className={`w-6 h-6 mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
      <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        {title}
      </p>
      <p className={`text-sm font-medium mt-1 break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
