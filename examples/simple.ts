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
