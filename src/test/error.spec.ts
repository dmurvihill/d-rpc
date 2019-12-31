import 'jasmine';
import * as fc from 'fast-check';
import { doesNotThrow, throws } from 'assert';
import {
  ErrorCode,
  InternalError, InvalidParamsError,
  InvalidRequestError,
  MethodNotFoundError,
  ParseError,
  RemoteError,
  ServerError,
} from '../main';

describe('ServerError', () => {
  it(`should accept codes ${ServerError.minCode} to ${ServerError.maxCode}`,
    () => {
      const validCodes = fc.integer(ServerError.minCode, ServerError.maxCode);
      fc.assert(fc.property(
        validCodes, (code) => doesNotThrow(
          () => new ServerError(code, 'test'),
        ),
      ));
    });

  it('should reject other codes', () => {
    const invalidCodes = fc.integer().filter(
      (i) => !ServerError.isValidCode(i),
    );
    fc.assert(fc.property(
      invalidCodes, (code) => throws(
        () => new ServerError(code, 'test'),
      ),
    ));
  });
});

describe('RemoteError', () => {
  describe('#get', () => {
    it('should map error codes to the correct type', () => {
      function checkCode(code: ErrorCode, type: any) {
        fc.assert(fc.property(
          fc.string(), fc.option(fc.json(), { nil: undefined }),
          (message, data) => RemoteError.fromErrorObject({
            code,
            message,
            data,
          }) instanceof type,
        ));
      }
      checkCode(ErrorCode.PARSE_ERROR, ParseError);
      checkCode(ErrorCode.INVALID_REQUEST, InvalidRequestError);
      checkCode(ErrorCode.METHOD_NOT_FOUND, MethodNotFoundError);
      checkCode(ErrorCode.INVALID_PARAMS, InvalidParamsError);
      checkCode(ErrorCode.INTERNAL_ERROR, InternalError);
    });
  });
});
