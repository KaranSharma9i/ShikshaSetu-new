export default function StudentsPage() {
  return (
    <div className="space-y-6 font-body">
      <div className="border-b border-light-gray pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Students</h1>
        <p className="text-steel-gray mt-1 font-caption">Student profiles, admissions, and status</p>
      </div>

      <div className="bg-white border border-light-gray rounded-2xl p-8 max-w-2xl text-center shadow-sm">
        <h3 className="text-xl font-semibold text-charcoal mb-2 font-heading">Admissions & Directory Coming Soon</h3>
        <p className="text-steel-gray text-sm max-w-md mx-auto font-body">
          The Student management portal (including student listings, detailed profiles, and new admissions forms) will be built in Batch 4 and Batch 5.
        </p>
      </div>
    </div>
  )
}

