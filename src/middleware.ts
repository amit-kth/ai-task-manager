import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check for Firebase auth token in cookies
    const token = request.cookies.get('firebase-token')
    const isLoginPage = request.nextUrl.pathname === '/login'

    // If no token and trying to access protected route
    if (!token && !isLoginPage) {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    // If has token and trying to access login page
    if (token && isLoginPage) {
        const homeUrl = new URL('/', request.url)
        return NextResponse.redirect(homeUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - login
         * - api routes
         * - static files
         * - images
         * - favicon
         */
        '/((?!login|signup|api|_next/static|_next/image|favicon.ico).*)',
    ]
}