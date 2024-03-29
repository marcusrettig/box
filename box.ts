export type External<T> = {type: 'External'};

export type Value<T> = {type: 'Value'; value: T};

export type Factory<T> = {type: 'Factory'; factory: () => T};

export type Class<T> = {type: 'Class'; constructor: new () => T};

export type Provider<T> = Value<T> | Factory<T> | Class<T>;

export type Declaration<T> = External<T> | Provider<T>;

export type DeclarationValue<T extends Declaration<unknown>> = T extends Declaration<infer V> ? V : never;

export type Declarations = Record<string | number | symbol, Declaration<unknown>>;

// https://www.totaltypescript.com/concepts/the-prettify-helper
type Pretty<T> = {[K in keyof T]: T[K]} & {}; // eslint-disable-line @typescript-eslint/ban-types

type Instance<T extends Declarations> = Pretty<{
  [K in keyof T]: DeclarationValue<T[K]>;
}>;

type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

type ReplaceExternal<T extends Declarations> = {
  [K in keyof T]: Provider<DeclarationValue<T[K]>>;
};

type Init<T extends Declarations> = Pretty<
& ReplaceExternal<PickByType<T, External<unknown>>>
& Partial<ReplaceExternal<OmitByType<T, External<unknown>>>>
>;

type ExtendDeclarations<T extends Declarations> = {
  [K in keyof T]?: Declaration<DeclarationValue<T[K]>>
};

type Extend<T, U> = Pretty<Omit<T, keyof U> & U>;

type InjectionContext = {
  readonly instance: Record<string | number | symbol, unknown>;
  readonly visited: Record<string | number | symbol, true>;
  readonly providers: Record<string | number | symbol, Provider<unknown>>;
};

export class Box<T extends Declarations> {
  static external<V>(): External<V> {
    return {type: 'External'};
  }

  static value<V>(value: V): Value<V> {
    return {type: 'Value', value};
  }

  static factory<V>(factory: () => V): Factory<V> {
    return {type: 'Factory', factory};
  }

  static class<V>(constructor: new () => V): Class<V> {
    return {type: 'Class', constructor};
  }

  private context?: InjectionContext;
  private injector: Box<T> | undefined = undefined;

  constructor(private readonly declarations: T, private readonly parent?: Box<any>) {}

  extend<U extends ExtendDeclarations<T>>(declarations: U): Box<Extend<T, U>> {
    return new Box({...this.declarations, ...declarations} as Extend<T, U>, this);
  }

  init(providers: Init<T>): Instance<T> {
    this.parent?.setInjector(this);
    this.context = {
      instance: {},
      visited: {},
      providers,
    };

    for (const key of Object.keys(this.declarations)) {
      this.inject(key);
    }

    const {instance} = this.context;
    delete this.context;
    this.parent?.setInjector(undefined);

    return instance as Instance<T>;
  }

  inject<K extends keyof T>(key: K): Instance<T>[K] {
    if (this.injector) {
      return this.injector.inject(key);
    }

    if (!this.context) {
      throw new Error('Called inject() outside injection context');
    }

    if (key in this.context.instance) {
      return this.context.instance[key] as Instance<T>[K];
    }

    if (this.context.visited[key]) {
      throw new Error(`Circular dependency detected in "${key.toString()}" (see stack trace)`);
    }

    this.context.visited[key] = true;

    const provider = this.context.providers[key] ?? this.declarations[key];

    if (provider) {
      if (provider.type === 'Class') {
        this.context.instance[key] = new provider.constructor();
        return this.context.instance[key] as Instance<T>[K];
      }

      if (provider.type === 'Factory') {
        this.context.instance[key] = provider.factory();
        return this.context.instance[key] as Instance<T>[K];
      }

      if (provider.type === 'Value') {
        this.context.instance[key] = provider.value;
        return this.context.instance[key] as Instance<T>[K];
      }
    }

    // This error is only possible if you bypass type checking
    throw new Error('No provider for ' + key.toString());
  }

  injectAll(): Instance<T> {
    if (this.injector) {
      return this.injector.injectAll();
    }

    if (!this.context) {
      throw new Error('Called injectAll() outside injection context');
    }

    return this.context.instance as Instance<T>;
  }

  private setInjector(injector: Box<T> | undefined): void {
    this.injector = injector;
    this.parent?.setInjector(injector);
  }
}
