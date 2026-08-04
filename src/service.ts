// service.ts

import type { Type } from 'typescript';

export function isServiceResponse(type: Type): boolean {
  return (
    type.getProperties().some((symbol) => symbol.name === 'status') &&
    type.getProperties().some((symbol) => symbol.name === 'headers') &&
    type.getProperties().some((symbol) => symbol.name === 'body')
  );
}
