import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminChatInbox from '@/components/admin/AdminChatInbox'

export const dynamic = 'force-dynamic'

export default function AdminChatPage() {
  return (
    <AdminPageShell titleKey="admin.nav.chat">
      <div className="max-w-6xl mx-auto">
        <AdminChatInbox />
      </div>
    </AdminPageShell>
  )
}
