/** Helper functions for manipulating collections */

export function countFrequencies(array: (string | number)[]) {
  return array.reduce((freq, id) => {
    // eslint-disable-next-line no-param-reassign
    freq[id] = freq[id] ? freq[id] + 1 : 1;
    return freq;
  }, {});
}

export function deleteWhere<T>(o: object, f: (v: T) => boolean) {
  Object.keys(o).forEach((k) => {
    if (f(o[k])) {
      // eslint-disable-next-line no-param-reassign
      delete o[k];
    }
  });
}

export function randomForEach<T>(a: T[], f: (e: T, i: number) => void) {
  const toDo = ascendingIntegers(a.length);
  while (toDo.length > 0) {
    const i = deleteRandomElement(toDo);
    f(a[i], i);
  }
}

function deleteRandomElement<T>(a: T[]): T {
  const i = Math.floor(Math.random() * a.length);
  return a.splice(i, 1)[0];
}

export function ascendingIntegers(length: number): number[] {
  const a = new Array(length).fill(0);
  a.forEach((_, i) => { a[i] = i; });
  return a;
}
