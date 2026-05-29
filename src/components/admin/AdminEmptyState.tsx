export default function AdminEmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="card text-center py-12">
      <h3 className="card-section-title">{title}</h3>
      {description && <p className="form-hint mt-2 max-w-md mx-auto">{description}</p>}
    </div>
  )
}
