export type External<T> = {external: true};

export type Factory<T> = (() => T) & {external?: false};

export type Provider<T> = External<T> | Factory<T>;

export type ProvidedValue<T extends Provider<unknown>> = T extends Provider<infer V> ? V : never;

export type Providers = Record<string, Provider<unknown>>;

// https://www.totaltypescript.com/concepts/the-prettify-helper
type Pretty<T> = {[K in keyof T]: T[K]} & {}; // eslint-disable-line @typescript-eslint/ban-types

type Instance<T extends Providers> = Pretty<{
  [K in keyof T]: ProvidedValue<T[K]>;
}>;

type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

type Factories<T extends Providers> = {
  [K in keyof T]: Factory<ProvidedValue<T[K]>>;
};

type Init<T extends Providers> = Pretty<
& Factories<PickByType<T, External<unknown>>>
& Partial<Factories<OmitByType<T, External<unknown>>>>
>;

export class Box<T extends Providers> {
  static external<V>(): External<V> {
    return {external: true};
  }

  static factory<V>(factory: () => V): Factory<V> {
    return factory;
  }

  static class<V>(constructor: new () => V): Factory<V> {
    return () => new constructor();
  }

  static value<V>(value: V): Factory<V> {
    return () => value;
  }

  private instance?: Instance<T>;

  constructor(private readonly providers: T) {}

  init(init: Init<T>): Instance<T> {
    const instance: Partial<Record<keyof T, unknown>> = {};
    this.instance = instance as Instance<T>;

    for (const [key, provider] of Object.entries(this.providers)) {
      if (key in init) {
        instance[key as keyof T] = init[key as keyof T]();
      } else if (provider.external) {
        // This error is only possible if you bypass type checking
        throw new Error('No provider for ' + key);
      } else {
        instance[key as keyof T] = provider();
      }
    }

    delete this.instance;
    return instance as Instance<T>;
  }

  inject(): Instance<T> {
    if (this.instance) {
      return this.instance;
    }

    throw new Error('Called inject() outside injection context');
  }
}
