import { signUp } from '@/app/actions/auth'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <form action={signUp} className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border p-2 rounded"
        />
        
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="border p-2 rounded"
        />
        
        <button 
          type="submit" 
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Sign Up
        </button>
      </form>
    </div>
  )
}