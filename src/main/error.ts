/* eslint-disable max-classes-per-file */
import { ErrorData, ErrorObject } from './message';

/** Reserved error codes in the JSON-RPC spec */
export const enum ErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
}

/** Base class for errors that originate in the json-rpc handler */
export abstract class JsonRpcError extends Error {
}

/** Raised when the server returned an invalid response */
export class InvalidResponseError extends JsonRpcError {}

/** Issued by request() when the server responds with an error object */
export class RemoteError extends JsonRpcError {
  /** Build a `RemoteError` from a JSON-RPC error object */
  static fromErrorObject(e: ErrorObject): RemoteError {
    if (e.code === ErrorCode.PARSE_ERROR) {
      return new ParseError(e.message, e.data);
    } if (e.code === ErrorCode.INVALID_REQUEST) {
      return new InvalidRequestError(e.message, e.data);
    } if (e.code === ErrorCode.METHOD_NOT_FOUND) {
      return new MethodNotFoundError(e.message, e.data);
    } if (e.code === ErrorCode.INVALID_PARAMS) {
      return new InvalidParamsError(e.message, e.data);
    } if (e.code === ErrorCode.INTERNAL_ERROR) {
      return new InternalError(e.message, e.data);
    } if (ServerError.isValidCode(e.code)) {
      return new ServerError(e.code, e.message, e.data);
    }
    return new RemoteError(e.code, e.message, e.data);
  }

  constructor(public code: number, message: string, public data?: ErrorData) {
    super(message);
  }
}

/** The server couldn't parse the request it received as JSON. */
export class ParseError extends RemoteError {
  constructor(message: string, data?: ErrorData) {
    super(ErrorCode.PARSE_ERROR, message, data);
  }
}

/** The JSON sent is not a valid Request object. */
export class InvalidRequestError extends RemoteError {
  constructor(message: string, data?: ErrorData) {
    super(ErrorCode.INVALID_REQUEST, message, data);
  }
}

/** The method does not exist / is not available. */
export class MethodNotFoundError extends RemoteError {
  constructor(message: string, data?: ErrorData) {
    super(ErrorCode.METHOD_NOT_FOUND, message, data);
  }
}

/** Invalid method parameter(s). */
export class InvalidParamsError extends RemoteError {
  constructor(message: string, data?: ErrorData) {
    super(ErrorCode.INVALID_PARAMS, message, data);
  }
}

/** Internal JSON-RPC error. */
export class InternalError extends RemoteError {
  constructor(message: string, data?: ErrorData) {
    super(ErrorCode.INTERNAL_ERROR, message, data);
  }
}

/** Implementation-defined server error. */
export class ServerError extends RemoteError {
  /** Minimum response code for this error type, inclusive */
  static readonly minCode = -32099;

  /** Maximum response code for this error type, inclusive */
  static readonly maxCode = -32000;

  /** Check if a number a legal error code for this type */
  static isValidCode(code: number): boolean {
    return ServerError.minCode <= code && code <= ServerError.maxCode;
  }

  constructor(code: number, message: string, data?: ErrorData) {
    if (ServerError.isValidCode(code)) {
      super(code, message, data);
    } else {
      throw new RangeError(
        'Can only instantiate ServerError in the reserved range '
          + `[${ServerError.minCode}, ${ServerError.maxCode}]`,
      );
    }
  }
}
