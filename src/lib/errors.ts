// Traduz mensagens de erro técnicas do Supabase Auth pra algo que o
// usuário entende. Qualquer coisa não reconhecida cai num aviso
// genérico — nunca mostra o erro técnico cru pra quem tá usando o app.

const KNOWN_AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
  'New password should be different from the old password.':
    'A senha nova precisa ser diferente da atual.',
}

const GENERIC_MESSAGE =
  'Não foi possível concluir agora. Tenta de novo em instantes; se continuar, fala com a diretoria.'

export function friendlyAuthError(message: string | null | undefined): string {
  if (!message) return GENERIC_MESSAGE
  return KNOWN_AUTH_ERRORS[message] ?? GENERIC_MESSAGE
}
