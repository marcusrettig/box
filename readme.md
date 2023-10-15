# Box

Box is a minimalistic, type-safe, zero-dependency, service container.

## Install

With npm:
```sh
npm install @marcusrettig/box
```

<details>
  <summary>Other package managers</summary>
  <p>

With pnpm:

```sh
pnpm add @marcusrettig/box
```

With yarn:

```sh
yarn add @marcusrettig/box
```
  </p>
</details>

## Simple Example

```typescript
import {Box} from '@marcusrettig/box';

class Database {
  findAll<T>(table: string): T[] {
    if (table === 'employees') {
      return [{name: 'Michael Scott'}] as T[];
    }

    throw new Error(`Table ${table} does not exist`);
  }
}

class EmployeeService {
  // Services can inject the service container to consume other services.
  $ = container.inject();

  findAll() {
    return this.$.database.findAll<{name: string}>('employees');
  }
}

const container = new Box({
  database: Box.class(Database),
  employeeService: Box.class(EmployeeService),
});

function start() {
  // The type for $ is automatically inferred to:
  // { database: Database; employeeService: EmployeeService }
  const $ = container.init({});

  const employees = $.employeeService.findAll();

  console.log(employees);
}

start();
```

<details>
  <summary>Run this example</summary>
  <p>

```sh
npx tsx examples/simple.ts
```
</details>

## Design Goals

- **Type-Safe:** Detect all type errors at compile time (given that you follow the two rules described in the next section). Say goodbye to *"No provider found"* and similar errors.
- **Minimalistic:** The library consists of fewer than 50 lines of code (excluding types and comments). It should be easy for anyone to understand what goes on under the hood.
- **Zero-dependency:** No external dependencies makes it easy to use the library without a package manager such as npm, for example in the Deno runtime.

## Injection Context

To access the service container inside a service, it first has to be injected using the `inject()` method. The benefit of this approach is that the type of the injected service container can be automatically inferred, meaning any service that is accessed through the container is guaranteed to have been provided, eliminating the *"No provider found"* errors which you've probably seen in more dynamic dependency injection systems. This however comes with two caveats:

1. The `inject()` function can only be called inside an injection context, such as a constructor, property initializer, or inside a factory function.
2. Any service can only be accessed through the service container only after the container has been initialized (outside the injection context).

The concept of injection concept is similar to that in the Dependency Injection system of Angular 16 and you can read more about it in the [Angular Documentation](https://angular.io/guide/dependency-injection-context).

**TLDR:** Only call `inject()` in a constructor, property initializer, or factory function. Only access the service container (`this.$` in the examples) after it has been initialized (e.g. outside the constructor).

The following examples demonstrates the injection context concept:

```typescript
// Property initializer:
class EmployeeService {
  // Inside injection context:
  $ = container.inject();

  findAll() {
    // Outside injection context (after initialization):
    return this.$.database.findAll('employees');
  }
}

// Factory function:
class createEmployeeService() {
  // Inside injection context:
  const $ = container.inject();

  return {
    findAll() {
      // Outside injection context (after initialization):
      return $.database.findAll('employees');
    }
  }
}
```
