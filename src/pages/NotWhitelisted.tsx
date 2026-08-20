import { useAuth } from '../lib/auth'
import { Button } from '../components/ui'

export default function NotWhitelisted() {
  const { signOut, session } = useAuth()
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-12 bg-abalo-paper">
      <div className="max-w-sm text-center">
        <div className="inline-block -rotate-2 bg-abalo-red px-4 py-2 border-2 border-abalo-ink shadow-hard-sm mb-5">
          <span className="font-display text-sm text-white">CONTA NÃO AUTORIZADA</span>
        </div>
        <p className="text-abalo-ink mb-2">
          O e-mail <strong>{session?.user.email}</strong> não está na lista da bateria.
        </p>
        <p className="text-abalo-muted mb-6 text-sm">
          Fale com a direção do bloco pra pedir o cadastro, ou verifique se o e-mail
          que você usou é o mesmo que entregou no formulário de inscrição.
        </p>
        <Button onClick={signOut}>SAIR</Button>
      </div>
    </div>
  )
}
