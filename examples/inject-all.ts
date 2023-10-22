import {Box} from '@marcusrettig/box';

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
