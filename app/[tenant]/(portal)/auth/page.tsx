import { LoginForm } from './LoginForm'

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Acceso del propietario</h1>
        <LoginForm />
      </div>
    </div>
  )
}
