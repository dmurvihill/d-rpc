import { AsyncSubject, Observable, Subject } from 'rxjs';
import * as json from 'json-typescript';
import { map } from 'rxjs/operators';
import {
  JsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccessResponse,
  RequestId,
  StructuredValue,
} from './message';
import { InvalidResponseError, RemoteError } from './error';


/** Transport-agnostic JSON-RPC protocol implementation
 *
 * To use this class, implementations must do two things:
 *
 * 1. Implement the abstract `send` method to serialize messages and
 *    send them to the remote; and,
 * 2. Ensure that any received message is properly parsed and triggers a
 *    call to `recv`.
 *
 * `Remote` does not support batch requests.
 */
export default abstract class Remote {
  static readonly msgReservedMethodName =
      'The method name prefix \'rpc.\' is reserved and may not be used.';

  static readonly msgWheresTheBeef =
      'Response object has no result or error object';

  /** Stream of general errors not associated with a specific request. */
  private readonly _errors: Subject<Error> = new Subject();

  readonly errors: Observable<Error> = this._errors.asObservable();

  private _nextId = 0;

  private requests: { [id: string]: AsyncSubject<JsonRpcResponse> } = {};

  private static handleResponse(response: JsonRpcResponse): json.Value {
    if (response.result !== undefined) {
      const r = <JsonRpcSuccessResponse>response;
      return r.result;
    } if (response.error !== undefined) {
      const e = <JsonRpcErrorResponse>response;
      throw RemoteError.fromErrorObject(e.error);
    } else {
      throw new InvalidResponseError(Remote.msgWheresTheBeef);
    }
  }

  private static buildNotification(
    methodName: string,
    params: StructuredValue,
  ) {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: methodName,
    };
    if (params) {
      request.params = params;
    }
    return request;
  }

  private static checkMethodName(methodName: string) {
    if (methodName.indexOf('rpc.') === 0) {
      throw new RangeError(Remote.msgReservedMethodName);
    }
  }

  /** Transmit a request message to the remote machine
   *
   * The returned observable should complete when the implementation is
   * reasonably sure the message has been transmitted successfully. For
   * TCP-based implementations, this might mean receiving an ACK. For
   * fire-and-forget protocols like UDP, it makes more sense to resolve
   * immediately.
   *
   * The returned observable should error if there is a transmission
   * problem (no route to host, etc.)
   * */
  protected abstract send(request: JsonRpcRequest): Observable<void>;

  /** Context match and parse a response object
   *
   * Implementer: Call this method with every response received from the
   * transport.
   *
   * If the response is not fully json-rpc compliant, recv will throw an
   * InvalidResponseError.
   * */
  protected recv(response: JsonRpcResponse): void {
    const o = this.requests[response.id];
    if (o) {
      o.next(response);
      o.complete();
      delete this.requests[response.id];
    } else {
      throw new InvalidResponseError(`Unexpected response ID '${response.id}'`);
    }
  }

  /** Execute a procedure on the remote server and expect a result
   *
   * The returned Observable will respond once with the result of the
   * execution and then complete. If an error comes back from the
   * server, the observable completes with a `JsonRpcError` subclass
   * instead.
   * */
  request(methodName: string, params?: StructuredValue):
      Observable<json.Value> {
    Remote.checkMethodName(methodName);
    const request = this.buildRequest(methodName, params);
    const result = this.listenForResponse(request.id)
      .pipe(map((r) => Remote.handleResponse(r)));
    const s = this.send(request).subscribe(
      () => s.unsubscribe(),
      (e) => this.handleSendError(request, e),
    );
    return result;
  }

  /** Execute a procedure that does not expect a result
   *
   * The returned observable will error if the service fails to transmit
   * the notification to the remote server. Once the message is
   * successful, there is no way to tell if the remote procedure
   * actually executed successfully.
   */
  notify(methodName: string, params?: StructuredValue): Observable<void> {
    Remote.checkMethodName(methodName);
    const request = Remote.buildNotification(methodName, params);
    return this.send(request);
  }

  private buildRequest(methodName: string, params: StructuredValue) {
    const request = Remote.buildNotification(methodName, params);
    request.id = this.nextId();
    if (params) {
      request.params = params;
    }
    return request;
  }

  private listenForResponse(id: RequestId): Observable<JsonRpcResponse> {
    this.requests[id] = new AsyncSubject();
    return this.requests[id];
  }

  private handleSendError(request: JsonRpcRequest, e) {
    if (this.requests[request.id]) {
      this.requests[request.id].error(e);
      delete this.requests[request.id];
    } else {
      this._errors.next(e);
    }
  }

  private nextId(): RequestId {
    const n = this._nextId;
    this._nextId += 1;
    return n;
  }
}
