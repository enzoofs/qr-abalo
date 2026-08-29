import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Member = {
  id: string
  auth_user_id: string | null
  email: string
  full_name: string
  whatsapp: string | null
  instrument: string | null
  role: 'member' | 'director'
}

type AuthState = {
  session: Session | null
  member: Member | null
  loading: boolean
  whitelistError: boolean
}

type AuthContextValue = AuthState & {
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signInWithApple: (redirectTo?: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshMember: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [whitelistError, setWhitelistError] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setMember(null)
      setWhitelistError(false)
      setLoading(false)
      return
    }
    void loadMember(session.user.id)
  }, [session?.user.id])

  async function loadMember(userId: string) {
    setLoading(true)
    setWhitelistError(false)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()
    if (error) console.error('loadMember error', error)
    if (!data) {
      setWhitelistError(true)
      setMember(null)
    } else {
      setMember(data as Member)
    }
    setLoading(false)
  }

  async function refreshMember() {
    if (session) await loadMember(session.user.id)
  }

  async function signInWithGoogle(redirectTo?: string) {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo ?? window.location.origin },
    })
  }

  async function signInWithApple(redirectTo?: string) {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: redirectTo ?? window.location.origin },
    })
  }

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  }

  async function signUpWithEmail(email: string, password: string) {
    const { data: whitelisted, error: rpcError } = await supabase.rpc('is_email_whitelisted', {
      p_email: email,
    })
    if (rpcError) return { error: rpcError.message }
    if (!whitelisted) {
      return { error: 'Esse e-mail não está cadastrado pela direção do bloco.' }
    }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        member,
        loading,
        whitelistError,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
