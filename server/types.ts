import { Context } from 'hono'

declare module 'hono' {
  interface ContextVariableMap {
    userId: number
  }
}
