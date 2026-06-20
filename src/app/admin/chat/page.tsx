import AdminPageShell from '@/components/admin/AdminPageShell'

export const dynamic = 'force-dynamic'

export default function AdminChatPage() {
  return (
    <AdminPageShell title="Chat">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">
            Admin chat inbox (buyer quote requests) will appear here in the next step.
          </p>
        </div>
      </div>
    </AdminPageShell>
  )
}

