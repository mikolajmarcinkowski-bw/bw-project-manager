import { NextRequest, NextResponse } from 'next/server'
import { verifyMcpToken } from './auth'

export type McpResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/**
 * Wrapper dla handlerów MCP: autoryzacja + error handling.
 * Użycie w route.ts:
 *   export const POST = createMcpHandler(async (body, userId) => { ... })
 */
export function createMcpHandler<T>(
  fn: (body: unknown, userId: string) => Promise<T>
) {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    // 1. Auth
    const user = await verifyMcpToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized — provide Bearer token' },
        { status: 401 }
      )
    }

    // 2. Parse body
    let body: unknown = {}
    try {
      const text = await request.text()
      if (text) body = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // 3. Execute
    try {
      const data = await fn(body, user.userId)
      return NextResponse.json({ ok: true, data })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      console.error('[MCP handler]', message)
      return NextResponse.json(
        { ok: false, error: message },
        { status: 500 }
      )
    }
  }
}
