export function decorateClass(target, decorators, paramTypes = []) {
  for (const decorator of decorators) {
    decorator(target);
  }

  Reflect.defineMetadata("design:paramtypes", paramTypes, target);
  return target;
}

export function decorateMethod(target, propertyKey, decorators, options = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

  for (const decorator of decorators) {
    decorator(target, propertyKey, descriptor);
  }

  Object.defineProperty(target, propertyKey, descriptor);
  Reflect.defineMetadata("design:type", Function, target, propertyKey);
  Reflect.defineMetadata("design:paramtypes", options.paramTypes ?? [], target, propertyKey);

  if ("returnType" in options) {
    Reflect.defineMetadata("design:returntype", options.returnType, target, propertyKey);
  }
}

export function parameterDecorator(index, decorator) {
  return (target, propertyKey) => {
    decorator(target, propertyKey, index);
  };
}
