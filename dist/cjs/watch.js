"use strict";
var __moduleName = "watch";
var _WatchList = $traceurRuntime.assertObject(require('./linked_list'))._WatchList;
var Watch = function Watch(watchGroup, record, reactionFn) {
  this._previousWatch = this._nextWatch = null;
  this._watchGroup = watchGroup;
  this._record = record;
  this.reactionFn = reactionFn;
  this._dirty = this._deleted = false;
  this._nextDirtyWatch = null;
};
($traceurRuntime.createClass)(Watch, {
  get expression() {
    return this._record.handler.expression;
  },
  invoke: function() {
    if (this._deleted || !this._dirty)
      return;
    this._dirty = false;
    this.reactionFn(this._record.currentValue, this._record.previousValue);
  },
  remove: function() {
    if (this._deleted)
      throw new Error('Already deleted!');
    this._deleted = true;
    var handler = this._record.handler;
    _WatchList._remove(handler, this);
    handler.release();
  }
}, {});
module.exports = {
  get Watch() {
    return Watch;
  },
  __esModule: true
};
