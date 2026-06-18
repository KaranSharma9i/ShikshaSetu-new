import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 font-body">
      <div className="border-b border-light-gray pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Dashboard</h1>
        <p className="text-steel-gray mt-1 font-caption">Portal control center and status</p>
      </div>

      <div className="bg-white border border-light-gray rounded-2xl p-6 max-w-3xl relative overflow-hidden shadow-sm">
        {/* Subtle accent highlight */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
        <h2 className="text-lg font-bold text-charcoal mb-2 font-heading">Session Info</h2>
        <p className="text-steel-gray text-sm font-body">
          Logged in as: <span className="text-secondary font-semibold font-body">{user?.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <div className="bg-white border border-light-gray rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-charcoal mb-2 font-heading">Batch 1 Focus</h3>
          <p className="text-steel-gray text-xs leading-relaxed font-body">
            Scaffolding, connection, authentication, and layout wrapper are fully completed. Route protection middleware is operational.
          </p>
        </div>

        <div className="bg-white border border-light-gray rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-charcoal mb-2 font-heading">Batch 3 Next Steps</h3>
          <p className="text-steel-gray text-xs leading-relaxed font-body">
            Real dashboard data (student count, staff attendance, fee collections) will be queried and displayed dynamically in Batch 3.
          </p>
        </div>
      </div>
    </div>
  )
}


