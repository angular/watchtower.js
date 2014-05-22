import {
  _WatchList
} from './linked_list';

export class Watch {
  constructor(watchGroup, record, reactionFn) {
    this._previousWatch = this._nextWatch = null;
    this._watchGroup = watchGroup;
    this._record = record;
    this.reactionFn = reactionFn;
    this._dirty = this._deleted = false;
    this._nextDirtyWatch = null;
  }

  get expression() {
    return this._record.handler.expression;
  }

  invoke() {
    if (this._deleted || !this._dirty) return;
    this._dirty = false;
    this.reactionFn(this._record.currentValue, this._record.previousValue);
  }

  remove() {
    if (this._deleted) throw new Error('Already deleted!');
    this._deleted = true;
    var handler = this._record.handler;
    _WatchList._remove(handler, this);
    handler.release();
  }
}