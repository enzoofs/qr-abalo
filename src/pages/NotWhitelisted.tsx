import { useAuth } from '../lib/auth'

export default function NotWhitelisted() {
  const { signOut, session } = useAuth()
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-12">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-3">Conta não autorizada</h1>
        <p className="text-stone-600 mb-2">
          O e-mail <strong>{session?.user.email}</strong> não está na lista da bateria.
        </p>
        <p className="text-stone-600 mb-6 text-sm">
          Fale com a direção do bloco pra pedir o cadastro, ou verifique se o e-mail
          que você usou é o mesmo que entregou no formulário de inscrição.
        </p>
        <button
          onClick={signOut}
          className="px-4 py-2 rounded-md bg-abalo-600 text-white font-medium"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
