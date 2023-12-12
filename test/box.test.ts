import test from 'ava';
import {Box, type Provider} from '../box.js';
import {expectType, type ToEqual} from './expect-type.js';

test('value provider', t => {
  const container = new Box({
    message: Box.value('Hello World'),
  });

  {
    const $ = container.init({});
    t.is($.message, 'Hello World');
  }
});

test('factory provider', t => {
  function createEmployeeService() {
    const greeting = container.inject('greeting');
    return {
      greet(name: string) {
        return greeting + ' ' + name;
      },
    };
  }

  const container = new Box({
    greeting: Box.value('Hello'),
    employeeService: Box.factory(createEmployeeService),
  });

  {
    const $ = container.init({});
    t.is($.employeeService.greet('Michael Scott'), 'Hello Michael Scott');
  }
});

test('class provider', t => {
  class EmployeeService {
    private readonly greeting = container.inject('greeting');

    greet(name: string) {
      return this.greeting + ' ' + name;
    }
  }

  const container = new Box({
    greeting: Box.value('Hello'),
    employeeService: Box.class(EmployeeService),
  });

  {
    const $ = container.init({});
    t.is($.employeeService.greet('Michael Scott'), 'Hello Michael Scott');
  }
});

test('external provider', t => {
  type ApiOptions = {
    host: string;
  };

  class Api {
    private readonly protocol = container.inject('protocol');

    constructor(private readonly options: ApiOptions) {}

    url(endpoint: string) {
      return this.protocol + '://' + this.options.host + '/' + endpoint;
    }
  }

  const container = new Box({
    protocol: Box.value<'http' | 'https'>('https'),
    api: Box.external<Api>(),
  });

  {
    const $ = container.init({
      api: Box.factory(() => new Api({host: 'example.com'})),
    });
    t.is($.api.url('employees'), 'https://example.com/employees');
  }

  {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const error = t.throws(() => container.init({} as any));
    t.is(error?.message, 'No provider for api');
  }
});

test('overriding providers', t => {
  class EmployeeService {
    private readonly greeting = container.inject('greeting');

    greet(name: string) {
      return this.greeting + ' ' + name;
    }
  }

  const container = new Box({
    greeting: Box.value('Hello'),
    employeeService: Box.class(EmployeeService),
  });

  {
    const $ = container.init({
      greeting: Box.value('Hej'),
    });
    t.is($.employeeService.greet('Michael Scott'), 'Hej Michael Scott');
  }
});

test('injection context', t => {
  class Service {
    private readonly message = container.inject('message');

    getMessage() {
      return this.message;
    }
  }

  const container = new Box({
    message: Box.value('Hello World'),
    service: Box.class(Service),
  });

  {
    const error = t.throws(() => new Service());
    t.is(error?.message, 'Called inject() outside injection context');
  }

  {
    container.init({});
    const error = t.throws(() => new Service());
    t.is(error?.message, 'Called inject() outside injection context');
  }
});

test('type inference', t => {
  const container = new Box({
    value: Box.value(123),
    factory: Box.factory(() => 'factory'),
    class: Box.class(Map),
    external: Box.external<'external'>(),
  });

  type Inject = typeof container.inject;

  type ExpectedInject = <K extends 'value' | 'factory' | 'class' | 'external'>(key: K) => {
    value: number;
    factory: string;
    class: Map<unknown, unknown>;
    external: 'external';
  }[K];

  expectType<Inject, ToEqual<ExpectedInject>>();

  type Init = typeof container.init;

  type ExpectedInit = (overrides: {
    value?: Provider<number>;
    factory?: Provider<string>;
    class?: Provider<Map<unknown, unknown>>;
    external: Provider<'external'>;
  }) => {
    value: number;
    factory: string;
    class: Map<unknown, unknown>;
    external: 'external';
  };

  expectType<Init, ToEqual<ExpectedInit>>();

  t.pass();
});

test('circular dependency', t => {
  class ServiceA {
    serviceB = container.inject('serviceB');
  }

  class ServiceB {
    serviceC = container.inject('serviceC');
  }

  class ServiceC {
    serviceA = container.inject('serviceA');
  }

  const container = new Box({
    serviceA: Box.class(ServiceA),
    serviceB: Box.class(ServiceB),
    serviceC: Box.class(ServiceC),
  });

  {
    const error = t.throws(() => container.init({}));
    t.is(error?.message, 'Circular dependency detected in "serviceA" (see stack trace)');

    const trace = (error?.stack ?? '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('at '))
      .map(line => line.split(' ')[1] ?? line);

    t.deepEqual(trace.slice(0, 8), [
      'Box.inject',
      'ServiceC',
      'Box.inject',
      'ServiceB',
      'Box.inject',
      'ServiceA',
      'Box.inject',
      'Box.init',
    ], 'produces simple stack trace');
  }
});

test('inject all', t => {
  class EmployeeService {
    $ = container.injectAll();

    greet(name: string) {
      return this.$.greeting + ' ' + name;
    }
  }

  const container = new Box({
    greeting: Box.value('Hello'),
    employeeService: Box.class(EmployeeService),
  });

  {
    const $ = container.init({});
    t.is($.employeeService.greet('Michael Scott'), 'Hello Michael Scott');
  }

  {
    const error = t.throws(() => container.injectAll());
    t.is(error?.message, 'Called injectAll() outside injection context');
  }
});

test('extend', t => {
  class Api {
    baseUrl = container.inject('baseUrl');

    url(endpoint: string): string {
      return this.baseUrl + '/' + endpoint;
    }
  }

  const container = new Box({
    baseUrl: Box.external<string>(),
    api: Box.class(Api),
  });

  const stagingContainer = container.extend({
    baseUrl: Box.value('http://staging.example.com'),
  });

  const testingContainer = stagingContainer.extend({
    baseUrl: Box.value('http://testing.example.com'),
  });

  {
    const $ = testingContainer.init({});
    t.is($.api.url('employees'), 'http://testing.example.com/employees');
  }
});
