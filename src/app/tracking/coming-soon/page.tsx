import Link from 'next/link'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 text-indigo-600 mb-6">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Coming Soon
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            We're working on exciting new features to enhance your YouTube analytics experience. 
            Stay tuned for updates!
          </p>
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🚀 Advanced Analytics</h3>
              <p className="text-sm text-gray-600">Deep dive into audience demographics and engagement patterns</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Custom Reports</h3>
              <p className="text-sm text-gray-600">Generate and export custom analytics reports</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🔔 Smart Alerts</h3>
              <p className="text-sm text-gray-600">Get notified when your metrics hit important milestones</p>
            </div>
          </div>
          <div className="mt-8">
            <Link 
              href="/dashboard"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 