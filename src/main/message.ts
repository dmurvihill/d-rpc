/** Type definitions for concepts from the json-rpc spec */
import * as json from 'json-typescript';

/** Type representing a 'structured value' as defined in the spec */
export type StructuredValue = json.Object | json.Arr;

export type RequestId = string | number | null;

export interface JsonRpcMessage extends json.Object {
  jsonrpc: '2.0';
}

/** JSON-serializable remote procedure call */
export interface JsonRpcRequest extends JsonRpcMessage {

  method: string;

  /** Internally-generated request ID
   *
   * Used for matching responses to the correct request
   */
  id?: RequestId;

  params?: StructuredValue;
}

/** JSON-serializable remote procedure response */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export interface JsonRpcSuccessResponse extends JsonRpcMessage {

  /** ID of the request corresponding to this response
   *
   * `null` if the request ID could not be parsed
   */
  id: RequestId;

  result: json.Value;
}

/** Procedure call error response
 *
 * We receive these responses when the procedure call is successfully
 * transmitted to the remote, but an error occurs when trying to
 * complete it.
 */
export interface JsonRpcErrorResponse extends JsonRpcMessage {

  /** ID of the request corresponding to this response
   *
   * `null` if the request ID could not be parsed
   */
  id: RequestId;
  error: ErrorObject;
}

/** Details about an error in a procedure call */
export interface ErrorObject extends json.Object {
  /** Error code; some are defined in the JSON-RPC spec */
  code: number;

  /** Human-readable short description of the error */
  message: string;

  /** Full error details */
  data?: ErrorData;
}

export type ErrorData = json.Primitive | StructuredValue;
