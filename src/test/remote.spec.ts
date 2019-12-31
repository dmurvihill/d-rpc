import {
  AsyncSubject,
  BehaviorSubject,
  forkJoin,
  of,
} from 'rxjs';
import * as json from 'json-typescript';
import * as fc from 'fast-check';
import { map, scan } from 'rxjs/operators';
import Remote from '../main/remote';
import { FakeRemote, remote } from './gen/remote.gen';
import { JsonRpcResponse, StructuredValue, RemoteError } from '../main';
import { countFrequencies, deleteWhere, randomForEach } from './collections';
import { json as jsonValue } from './gen/json.gen';
import {
  errorObject,
  methodName,
  requestId,
  requestParams,
} from './gen/message.gen';


/** json-rpc protocol implementation tests
 *
 * Some specs use the all-caps words 'MUST', 'SHOULD', etc. in the RFC
 * style. These test names attempt to capture requirements from the
 * json-rpc 2.0 spec where the same capitalization style is used.
 */
describe('Remote', () => {
  describe('#recv', () => {
    it('should throw error on unrecognized response ID', async () => {
      fc.assert(fc.property(remote, requestId, jsonValue,
        (s, id, result) => {
          const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id,
            result,
          };
          expect(() => s.respond(response))
            .toThrowError(`Unexpected response ID '${id}'`);
        }));
    });
  });

  function requestAndNotifySharedSpec(it, fnName) {
    it('should transmit exactly once', () => {
      fc.assert(fc.property(remote, requestCall,
        (service: FakeRemote, call) => {
          service[fnName](call.methodName, call.params);
          expect(service.transmit).toHaveBeenCalledTimes(1);
        }));
    });

    it('MUST transmit the correct version number', () => {
      fc.assert(fc.property(remote, requestCall, (service, call) => {
        service[fnName](call.methodName, call.params);
        expect(firstSentMessage(service).jsonrpc).toEqual('2.0');
      }));
    });

    it('should transmit the same method name', () => {
      fc.assert(fc.property(remote, requestCall, (service, call) => {
        service[fnName](call.methodName, call.params);
        expect(firstSentMessage(service).method).toEqual(call.methodName);
      }));
    });

    it('MUST NOT accept method names that begin with \'rpc.\'', () => {
      fc.assert(fc.property(remote, requestCall, (service, call) => {
        expect(() => service[fnName](`rpc.${call.methodName}`, call.params))
          .toThrowError(RangeError);
      }));
    });

    it('params MAY be omitted', () => {
      fc.assert(fc.property(remote, methodName, (service, method) => {
        service[fnName](method);
        expect(Object.keys(firstSentMessage(service))).not.toContain('params');
      }));
    });

    it('should pass along errors thrown from send()', () => {
      fc.assert(fc.property(remote, requestCall, (service, call) => {
        service.transmit.and.throwError('test');
        expect(() => service[fnName](call.methodName, call.params))
          .toThrowError('test');
      }));
    });

    it('should complete with error on error in transport', () => {
      fc.assert(fc.asyncProperty(remote, requestCall, (service, call) => {
        const transportTask = new AsyncSubject();
        service.transmit.and.returnValue(transportTask);
        const request = service[fnName](call.methodName, call.params);
        const error = new Error('Test error');
        transportTask.error(error);
        return request.toPromise().then(() => false).catch((e) => e === error);
      }));
    });
  }

  describe('#request', () => {
    requestAndNotifySharedSpec(it, 'request');

    it('should not send null IDs', () => {
      fc.assert(fc.property(remote, requestCall, (service, call) => {
        service.request(call.methodName, call.params);
        expect(firstSentMessage(service).id).not.toEqual(null);
      }));
    });

    it('should not reuse open IDs', () => {
      fc.assert(fc.property(remote, fc.array(requestCall),
        (service, calls) => {
          calls.forEach(
            (call) => service.request(call.methodName, call.params),
          );
          const frequencies = countFrequencies(sentIds(service));
          deleteWhere(frequencies, (v) => v <= 1);
          expect(frequencies).toEqual({});
        }));
    });

    it('id number SHOULD not have fractional parts', () => {
      fc.assert(fc.property(remote, fc.array(requestCall),
        (service, calls) => {
          calls.forEach(
            (call) => service.request(call.methodName, call.params),
          );
          expect(sentIds(service)).toEqual(sentIds(service).map(Math.round));
        }));
    });

    it('should respond with results from recv', () => {
      fc.assert(fc.asyncProperty(remote, requestCall, (service, call) => {
        const o = service.request(call.methodName, call.params);
        service.respond({
          jsonrpc: '2.0',
          id: firstSentMessage(service).id,
          result: call.result,
        });
        return o.toPromise().then((r) => r === call.result);
      }));
    });

    it('should match context on ID', () => {
      fc.assert(fc.asyncProperty(
        remote, fc.array(requestCall), (service, calls) => {
          const responseObservables = calls.map(
            (c) => service.request(c.methodName, c.params),
          );
          const results = responseObservables.length > 0
            ? forkJoin(responseObservables) : of([]);
          randomForEach(
            calls, (c, i) => service.respondTo(i, c.result),
          );
          return results.pipe(map((rs) => (rs || []))).toPromise()
            .then((rs) => expect(rs).toEqual(calls.map((x) => x.result)));
        },
      ));
    });

    it('should pass through error message', () => {
      fc.assert(fc.asyncProperty(remote, requestCall, errorObject,
        (service, call, error) => {
          const request = service.request(call.methodName, call.params);
          service.respondWithErrorTo(0, error);
          return expectRejection(request.toPromise())
            .then((e) => e.message === error.message);
        }));
    });

    it('should pass through error code', () => {
      fc.assert(fc.asyncProperty(remote, requestCall, errorObject,
        (service, call, error) => {
          const request = service.request(call.methodName, call.params);
          service.respondWithErrorTo(0, error);
          return expectRejection(request.toPromise())
            .then((e: RemoteError) => e.code === error.code);
        }));
    });

    it('should pass through error data', () => {
      fc.assert(fc.asyncProperty(remote, requestCall, errorObject,
        (service, call, error) => {
          const request = service.request(call.methodName, call.params);
          service.respondWithErrorTo(0, error);
          return expectRejection(request.toPromise())
            .then((e: RemoteError) => expect(e.data).toEqual(error.data));
        }));
    });

    it('should complete with error if response missing result or error', () => {
      fc.assert(fc.asyncProperty(remote, requestCall, (service, call) => {
        const request = service.request(call.methodName, call.params);
        service.respond(<JsonRpcResponse>{
          jsonrpc: '2.0',
          id: service.requestIds[0],
        });
        return expectRejection(request.toPromise())
          .then((e) => e.message === Remote.msgWheresTheBeef);
      }));
    });

    it('should be OK if response occurs synchronously', () => {
      fc.assert(fc.asyncProperty(remote, requestCall, (service, call) => {
        service.transmit.and.callFake(() => {
          service.respondTo(0, call.result);
          return of();
        });
        const request = service.request(call.methodName, call.params);
        return request.toPromise().then((r) => r === call.result);
      }));
    });

    it('should emit error if send() errors after response is received', () => {
      fc.assert(fc.property(remote, requestCall, (service, call) => {
        const error = new Error();
        const emittedErrors = new BehaviorSubject<Error[]>([]);
        service.errors.pipe(scan(
          (acc, e) => acc.concat([e]), <Error[]>[],
        )).subscribe(emittedErrors);
        const send = new AsyncSubject();
        service.transmit.and.returnValue(send);
        service.request(call.methodName, call.params);
        service.respondTo(0, call.result);
        send.error(error);
        expect(emittedErrors.getValue()).toEqual([error]);
      }));
    });
  });

  describe('#notify', () => {
    requestAndNotifySharedSpec(it, 'notify');

    it('should omit ID', () => {
      fc.assert(fc.property(remote, requestCall, (service, call) => {
        service.notify(call.methodName, call.params);
        expect(Object.keys(firstSentMessage(service))).not.toContain('id');
      }));
    });
  });

  function firstSentMessage(s: FakeRemote) {
    return s.transmit.calls.first().args[0];
  }

  function sentIds(s: FakeRemote) {
    return s.transmit.calls.all().map((c) => c.args[0].id);
  }

  function expectRejection(p: Promise<any>): Promise<Error> {
    return p.then(() => fail('Expected request to fail'))
      .catch((e) => e);
  }
});

interface RequestCall {
  methodName: string;
  params: StructuredValue | undefined;
  result: json.Value
}

const requestCall: fc.Arbitrary<RequestCall> = fc.tuple(
  methodName, requestParams, jsonValue,
).map((t) => ({
  methodName: t[0],
  params: t[1],
  result: t[2],
}));
