/**
 * Flexible Supabase query-builder fake for hook tests.
 * Any chained method (select/eq/in/order/range/limit/...) returns the same
 * builder; awaiting it resolves to the given result. Calls are recorded so
 * tests can assert which filters were applied without pinning call order.
 */
export interface ChainResult {
  data: unknown;
  error: unknown;
}

export interface ChainCall {
  method: string;
  args: unknown[];
}

export function makeChain(result: ChainResult, calls: ChainCall[] = []): unknown {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: ChainResult) => unknown) => resolve(result);
      }
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return proxy;
      };
    },
  };
  const proxy: object = new Proxy({}, handler);
  return proxy;
}

/** Build a `supabase.from` implementation that answers per table name. */
export function fromByTable(
  tables: Record<string, ChainResult>,
  calls: ChainCall[] = [],
): (table: string) => unknown {
  return (table: string) =>
    makeChain(tables[table] ?? { data: [], error: null }, calls);
}
