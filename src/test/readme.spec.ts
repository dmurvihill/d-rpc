import { FakeRemote as MyRemote } from './gen/remote.gen';
import Remote from '../main/remote';

describe('README.md', () => {
  describe('sending requests example', () => {
    it('should run without error', () => expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
      function displayWidget(widgetData) {
        // your display code here
      }
      const remote: Remote = new MyRemote();
      remote.request('giveMeAWidget', { widgetNumber: 10 })
        .subscribe(displayWidget);
    }).not.toThrow());
  });

  describe('catching errors example', () => {
    it('should run without error', () => expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
      function handleError(e: Error) {
        // your error handling code here
      }
      const remote: Remote = new MyRemote();
      remote.errors.subscribe(handleError);
    }));
  });
});
