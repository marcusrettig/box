export function expectType<A, F extends (a: A) => B, B = A>(): void {
  // This function does nothing. The assertion is performed at compile time.
}

export type ToEqual<B> = (_: B) => B;
