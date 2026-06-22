'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { EMPTY_TENANT_CONTEXT, type TenantContext } from '@/lib/builder/tenant-context'

// El valor por defecto del context ES el vacío seguro → useTenant() fuera de un
// provider devuelve EMPTY_TENANT_CONTEXT en vez de null (default vacío puro).
const Ctx = createContext<TenantContext>(EMPTY_TENANT_CONTEXT)

export function TenantProvider({ value, children }: { value: TenantContext; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTenant(): TenantContext {
  return useContext(Ctx)
}
