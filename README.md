# d-rpc
Transparent json-rpc implementation

Not to be confused with [json-rpc](https://github.com/riga/node-json-rpc),
[JSONRpc](https://github.com/Miloas/JSONRpc#readme),
[rpc-json](https://www.npmjs.com/package/rpc-json),
[json-rpc-engine](https://www.npmjs.com/package/json-rpc-engine),
[jayson](https://www.npmjs.com/package/jayson),
or [jsonrpc](https://www.npmjs.com/package/jsonrpc).

d-rpc is:
- Transparent - Usage looks like any other async method call
- Transport-agnostic - Plug in your network layer in as few as 5 lines
  and go.
- Thoroughly tested and ready for production

d-rpc is in the public domain -- the only true Free.

## How To
1. Plug in your transport layer by extending the `Remote` class, making
sure to implement `send` and call `recv` for new messages:
```typescript
import {HttpClient} from 'some-http-library';
import {Remote, JsonRpcRequest, JsonRpcResponse} from 'd-rpc';
import {Observable} from "rxjs";

class JsonRpcOverHttp extends Remote {
  private readonly http: HttpClient

  constructor(private readonly url: string) {}

  // implement send() to transmit the request:
  send(request: JsonRpcRequest): Observable<void> {
    this.http.post(this.url, request)
      // Make sure to call recv() with the response:
      .then(response => this.recv(<JsonRpcResponse>response.json()));
    return of();
  }
}
```

2. Start sending requests:
```typescript
function displayWidget(widgetData) {
  // your display code here
}
const remote: Remote = new MyRemote();
remote.request('giveMeAWidget', { widgetNumber: 10 })
  .subscribe(displayWidget);
```

In addition to `request()`, you can call `notify()`, which takes the
same parameters but completes without waiting for a response.

Errors that occur outside of the context of a specific request are
emitted from the `errors` observable:

```typescript
function handleError(e: Error) {
  // your error handling code here
}
const remote: Remote = new MyRemote();
remote.errors.subscribe(handleError);
```

Most errors are subtypes of `JsonRpcError`.

Happy hacking!

## Contributing

```bash
npm test
npm lint
npm doc
```

If you made any changes to the Typedoc comments, run `npm doc` and check
in the new documentation in `docs/`. GitHub Pages hosts the API docs in
that folder.

The example source code is copied and pasted from unit tests. Make sure
they stay in sync.

Include an explicit public domain dedication in your pull request. Here
is one you can use if you like:
```
I dedicate any and all copyright interest in this software to the
public domain. I make this dedication for the benefit of the public at
large and to the detriment of my heirs and successors. I intend this
dedication to be an overt act of relinquishment in perpetuity of all
present and future rights to this software under copyright law.
```
