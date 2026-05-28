export default function AdminEmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="card text-center py-12">
      <h3 className="text-lg font-medium text-white">{title}</h3>
      {description && <p className="text-gray-400 mt-2 max-w-md mx-auto">{description}</p>}
    </div>
  )
}
