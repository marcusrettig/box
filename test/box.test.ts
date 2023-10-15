import test from 'ava';
import {Box} from '../box.js';
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
    const $ = container.inject();
    return {
      greet(name: string) {
        return $.greeting + ' ' + name;
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
    private readonly $ = container.inject();

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
});

test('external provider', t => {
  type ApiOptions = {
    host: string;
  };

  class Api {
    private readonly $ = container.inject();

    constructor(private readonly options: ApiOptions) {}

    url(endpoint: string) {
      return this.$.protocol + '://' + this.options.host + '/' + endpoint;
    }
  }

  const container = new Box({
    protocol: Box.value<'http' | 'https'>('https'),
    database: Box.external<Api>(),
  });

  {
    const $ = container.init({
      database: Box.factory(() => new Api({host: 'example.com'})),
    });
    t.is($.database.url('employees'), 'https://example.com/employees');
  }

  {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const error = t.throws(() => container.init({} as any));
    t.is(error?.message, 'No provider for database');
  }
});

test('overriding providers', t => {
  class EmployeeService {
    private readonly $ = container.inject();

    greet(name: string) {
      return this.$.greeting + ' ' + name;
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
    private readonly $ = container.inject();

    getMessage() {
      return this.$.message;
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

  type ExpectedInject = () => {
    value: number;
    factory: string;
    class: Map<unknown, unknown>;
    external: 'external';
  };

  expectType<Inject, ToEqual<ExpectedInject>>();

  type Init = typeof container.init;

  type ExpectedInit = (overrides: {
    value?: () => number;
    factory?: () => string;
    class?: () => Map<unknown, unknown>;
    external: () => 'external';
  }) => {
    value: number;
    factory: string;
    class: Map<unknown, unknown>;
    external: 'external';
  };

  expectType<Init, ToEqual<ExpectedInit>>();

  t.pass();
});
