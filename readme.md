# Box

Box is a minimalistic, type-safe, zero-dependency, service container.

**Note:** This library is still in it's early stages and breaking changes are expected.

**Breaking change:** In release `0.2.0`, the `inject()` function was changed to inject a single service instead of the entire container: `inject(name)`. To inject the entire service container you should not use the `injectAll()` function instead (added in `0.2.1`). See [example below](#injecting-all-dependencies).

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
  // Services can inject other services using the inject function.
  // The type is automatically inferred, in this case to Database.
  database = container.inject('database');

  findAll() {
    return this.database.findAll<{name: string}>('employees');
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

## Injecting all dependencies

Release `0.2.0` introduced a breaking change where the `inject()` function now injects a single named dependency instead of the entire service container. Release `0.2.1` adds a function called `injectAll` which injects the full container. Please note that some dependencies may not be initialized when injecting the container, so it is unsafe to access it during the injection context.

```typescript
import { Box } from "@marcusrettig/box";

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

const $ = container.init({});

console.log($.employeeService.greet('Michael Scott'));
```

<details>
  <summary>Run this example</summary>
  <p>

```sh
npx tsx examples/inject-all.ts
```
</details>

## Design Goals

- **Type-Safe:** Detect all type errors at compile time (given that you follow the two rules described in the next section). Say goodbye to *"No provider found"* and similar errors.
- **Minimalistic:** The library consists of fewer than 50 lines of code (excluding types and comments). It should be easy for anyone to understand what goes on under the hood.
- **Zero-dependency:** No external dependencies makes it easy to use the library without a package manager such as npm, for example in the Deno runtime.

## Injection Context

A service can access another service by injecting it using the `inject()` function. The benefit of this approach is that the type of the injected service is automatically inferred, and that the service is guaranteed to have been provided, eliminating the *"No provider found"* errors which you've probably seen in more dynamic dependency injection systems. This however comes with two caveats:

1. The `inject()` function can only be called inside an injection context, such as a constructor, property initializer, or inside a factory function.
2. Circular dependencies are not allowed. For example, if service `A` injects service `B` which injects service `C` which injects service `A` an error will be thrown.

The concept of injection context is similar to that in the Dependency Injection system of Angular 16 and you can read more about it in the [Angular Documentation](https://angular.io/guide/dependency-injection-context).

**TLDR:** Only call `inject()` in a constructor, property initializer, or factory function. Avoid circular dependencies.

The following examples demonstrates the injection context concept:

```typescript
// Property initializer:
class EmployeeService {
  // Inside injection context:
  database = container.inject('database');

  findAll() {
    // Outside injection context (after initialization):
    return this.database.findAll('employees');
  }
}

// Factory function:
class createEmployeeService() {
  // Inside injection context:
  const database = container.inject('database');

  return {
    findAll() {
      // Outside injection context (after initialization):
      return database.findAll('employees');
    }
  }
}
```
