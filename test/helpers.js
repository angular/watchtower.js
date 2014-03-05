export class Logger {
  constructor() {
    this._list = [];
  }

  log(message) {
    this._list.push('' + message);
  }

  clear() {
    this._list.length = 0;
  }

  toArray() {
    return [].concat(this._list);
  }

  toString() {
    return `${this._list.join(";")}`;
  }
}
