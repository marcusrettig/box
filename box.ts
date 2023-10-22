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

type InjectionContext = {
  readonly instance: Record<string | number | symbol, unknown>;
  readonly visited: Record<string | number | symbol, true>;
  readonly overrides: Record<string | number | symbol, Factory<unknown>>;
};

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

  private context?: InjectionContext;

  constructor(private readonly providers: T) {}

  init = (overrides: Init<T>): Instance<T> => {
    this.context = {
      instance: {},
      visited: {},
      overrides,
    };

    for (const key of Object.keys(this.providers)) {
      this.inject(key);
    }

    const {instance} = this.context;
    delete this.context;
    return instance as Instance<T>;
  };

  inject = <K extends keyof T>(key: K): Instance<T>[K] => {
    if (!this.context) {
      throw new Error('Called inject() outside injection context');
    }

    if (key in this.context.instance) {
      return this.context.instance[key] as Instance<T>[K];
    }

    if (this.context.visited[key]) {
      throw new Error('Circular dependency detected in ' + key.toString());
    }

    this.context.visited[key] = true;

    const provider = this.context.overrides[key] ?? this.providers[key];

    if (provider && !provider.external) {
      this.context.instance[key] = provider();
      return this.context.instance[key] as Instance<T>[K];
    }

    // This error is only possible if you bypass type checking
    throw new Error('No provider for ' + key.toString());
  };

  injectAll = (): Instance<T> => {
    if (!this.context) {
      throw new Error('Called injectAll() outside injection context');
    }

    return this.context.instance as Instance<T>;
  };
}
