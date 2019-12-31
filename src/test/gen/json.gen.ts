/** Improved JSON arbitraries for fast-check
 *
 * - strings are enforced to be JSON-compliant (i.e. unicode)
 * - uses types from json-typescript
 * - convenient array and object arbitraries
 */
import {
  Arbitrary,
  array,
  boolean,
  constant,
  dictionary,
  float,
  frequency,
  integer,
  letrec,
  oneof,
  unicodeString,
} from 'fast-check';
import { Object, Primitive, Value } from 'json-typescript';

export const number: Arbitrary<number> = oneof(
  integer(),
  float(Number.MIN_VALUE, Number.MAX_VALUE),
);
export const string: Arbitrary<string> = unicodeString();
export const primitive: Arbitrary<Primitive> = oneof(
  string,
  number,
  boolean(),
  constant(null),
);

export function object<T extends Value>(values: Arbitrary<T>):
    Arbitrary<Object> {
  return dictionary(string, values);
}

export const json: Arbitrary<Value> = <Arbitrary<Value>>letrec((tie) => ({
  json: frequency(
    { weight: 5, arbitrary: tie('object') },
    { weight: 5, arbitrary: tie('array') },
    { weight: 90, arbitrary: tie('primitive') },
  ),
  object: object(<Arbitrary<Value>>tie('json')),
  array: array(tie('json')),
  primitive,
})).json;
