import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas sem autenticação
const PUBLIC_PATHS = ['/login', '/primeiro-acesso', '/esqueci-a-senha', '/redefinir-senha']

// Rotas que exigem sessão mas NÃO redirecionam para /dashboard ao ter sessão ativa.
// Isso permite que SUPER_ADMIN acesse /selecionar-empresa sem ser "empurrado" ao dashboard.
const SESSION_ONLY_PATHS = ['/selecionar-empresa', '/esqueci-a-senha', '/redefinir-senha']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic      = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isSessionOnly = SESSION_ONLY_PATHS.some((p) => pathname.startsWith(p))

  // O access token vive apenas em memória no cliente, então o middleware não consegue lê-lo.
  // Usamos 'has_session' só como sinal de rota; a sessão real continua sendo restaurada via refresh token HttpOnly.
  const hasSession = request.cookies.has('has_session')

  // Rota privada sem sessão → redireciona para login
  if (!isPublic && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Rota pública com sessão → redireciona para seleção de empresa
  // (session-only excluídas: /selecionar-empresa precisa ser acessível com sessão ativa)
  if (isPublic && !isSessionOnly && hasSession) {
    const companySelectionUrl = new URL('/selecionar-empresa', request.url)
    const redirect = request.nextUrl.searchParams.get('redirect')
    if (redirect) companySelectionUrl.searchParams.set('redirect', redirect)
    return NextResponse.redirect(companySelectionUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
}
