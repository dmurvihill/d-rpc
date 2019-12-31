import {
  Arbitrary, array, constant, integer, oneof, option, tuple,
} from 'fast-check';
import { ErrorObject, StructuredValue } from '../../main';
import { json, object, string } from './json.gen';

export const requestId = oneof(integer(), string, constant(null));
export const methodName = string.filter((s) => !s.startsWith('rpc.'));
export const structuredValue: Arbitrary<StructuredValue> = oneof<StructuredValue>(array(json), object(json));
export const requestParams: Arbitrary<StructuredValue | undefined> = oneof(structuredValue, constant(undefined));

export const errorObject: Arbitrary<ErrorObject> = tuple(integer(), string, option(json)).map(([code, msg, data]) => {
  const o: ErrorObject = {
    code,
    message: msg,
  };
  if (data) {
    o.data = data;
  }
  return o;
});
