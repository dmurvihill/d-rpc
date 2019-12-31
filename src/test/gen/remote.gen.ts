import Remote from "../../main/remote";
import { Observable, of } from "rxjs";
import { ErrorObject, JsonRpcRequest, JsonRpcResponse, RequestId } from "../../main";
import * as json from "json-typescript";
import * as fc from "fast-check";
import Spy = jasmine.Spy;
import createSpy = jasmine.createSpy;

export class FakeRemote extends Remote {
  readonly transmit: Spy = createSpy('transmit').and.returnValue(of());

  readonly requestIds: RequestId[] = [];

  protected send(request: JsonRpcRequest): Observable<void> {
    this.requestIds.push(request.id);
    return this.transmit(request);
  }

  respond(response: JsonRpcResponse): void {
    this.recv(response);
  }

  respondTo(requestIndex: number, result: json.Value): void {
    this.respond({
      jsonrpc: '2.0',
      id: this.requestIds[requestIndex],
      result,
    });
  }

  respondWithErrorTo(requestIndex: number, e: ErrorObject): void {
    this.respond({
      jsonrpc: '2.0',
      id: this.requestIds[requestIndex],
      error: e,
    });
  }
}

export const remote: fc.Arbitrary<FakeRemote> = new class extends fc.Arbitrary<FakeRemote> {
  generate(): fc.Shrinkable<FakeRemote> {
    return new fc.Shrinkable(new FakeRemote(), fc.Stream.nil);
  }
}();
