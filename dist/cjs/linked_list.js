"use strict";
var __moduleName = "linked_list";
var _LinkedListItem = function _LinkedListItem() {};
($traceurRuntime.createClass)(_LinkedListItem, {}, {_initialize: function(item) {
    item._next = item._previous = null;
  }});
var _LinkedList = function _LinkedList() {};
($traceurRuntime.createClass)(_LinkedList, {}, {
  _initialize: function(list) {
    list._tail = list._head = null;
  },
  _add: function(list, item) {
    if (list._tail === null) {
      list._head = list._tail = item;
    } else {
      item._previous = list._tail;
      list._tail._next = item;
      list._tail = item;
    }
    return item;
  },
  _isEmpty: function(list) {
    return list._head === null;
  },
  _remove: function(list, item) {
    var previous = item._previous;
    var next = item._next;
    if (previous === null)
      list._head = next;
    else
      previous._next = next;
    if (next === null)
      list._tail = previous;
    else
      next._previous = previous;
  }
});
var _WatchList = function _WatchList() {};
($traceurRuntime.createClass)(_WatchList, {}, {
  _initialize: function(list) {
    list._watchHead = list._watchTail = null;
  },
  _add: function(list, item) {
    if (list._watchTail === null) {
      list._watchHead = list._watchTail = item;
    } else {
      item._previousWatch = list._watchTail;
      list._watchTail._nextWatch = item;
      list._watchTail = item;
    }
    return item;
  },
  _isEmpty: function(list) {
    return list._watchHead === null;
  },
  _remove: function(list, item) {
    var previous = item._previousWatch;
    var next = item._nextWatch;
    if (previous === null)
      list._watchHead = next;
    else
      previous._nextWatch = next;
    if (next === null)
      list._watchTail = previous;
    else
      next._previousWatch = previous;
  }
});
var _WatchGroupList = function _WatchGroupList() {};
($traceurRuntime.createClass)(_WatchGroupList, {}, {
  _add: function(list, item) {
    if (list._watchGroupTail === null) {
      list._watchGroupHead = list._watchGroupTail = item;
    } else {
      item._prevWatchGroup = list._watchGroupTail;
      list._watchGroupTail._nextWatchGroup = item;
      list._watchGroupTail = item;
    }
    return item;
  },
  _isEmpty: function(list) {
    return list._watchGroupHead === null;
  },
  _remove: function(list, item) {
    var previous = item._prevWatchGroup;
    var next = item._nextWatchGroup;
    if (previous === null)
      list._watchGroupHead = next;
    else
      previous._nextWatchGroup = next;
    if (next === null)
      list._watchGroupTail = previous;
    else
      next._prevWatchGroup = previous;
  }
});
var _ArgHandlerList = function _ArgHandlerList() {};
($traceurRuntime.createClass)(_ArgHandlerList, {}, {
  _initialize: function(list) {
    list._argHandlerHead = list._argHandlerTail = null;
  },
  _add: function(list, item) {
    if (list._argHandlerTail === null) {
      list._argHandlerHead = list._argHandlerTail = item;
    } else {
      item._previousArgHandler = list._argHandlerTail;
      list._argHandlerTail._nextArgHandler = item;
      list._argHandlerTail = item;
    }
    return item;
  },
  _isEmpty: function(list) {
    return list._argHandlerHead === null;
  },
  _remove: function(list, item) {
    var previous = item._previousArgHandler;
    var next = item._nextArgHandler;
    if (previous === null)
      list._argHandlerHead = next;
    else
      previous._nextArgHandler = next;
    if (next === null)
      list._argHandlerTail = previous;
    else
      next._previousArgHandler = previous;
  }
});
var _EvalWatchList = function _EvalWatchList() {};
($traceurRuntime.createClass)(_EvalWatchList, {}, {
  _add: function(list, item) {
    var prev = list._evalWatchTail;
    var next = prev._nextEvalWatch;
    if (prev === list._marker) {
      list._evalWatchHead = list._evalWatchTail = item;
      prev = prev._prevEvalWatch;
      list._marker._prevEvalWatch = null;
      list._marker._nextEvalWatch = null;
    }
    item._nextEvalWatch = next;
    item._prevEvalWatch = prev;
    if (prev !== null)
      prev._nextEvalWatch = item;
    if (next !== null)
      next._prevEvalWatch = item;
    return (list._evalWatchTail = item);
  },
  _isEmpty: function(list) {
    return list._evalWatchHead === null;
  },
  _remove: function(list, item) {
    var prev = item._prevEvalWatch;
    var next = item._nextEvalWatch;
    if (list._evalWatchHead === list._evalWatchTail) {
      list._evalWatchHead = list._evalWatchTail = list._marker;
      list._marker._nextEvalWatch = next;
      list._marker._prevEvalWatch = prev;
      if (prev !== null)
        prev._nextEvalWatch = list._marker;
      if (next !== null)
        next._prevEvalWatch = list._marker;
    } else {
      if (item === list._evalWatchHead)
        list._evalWatchHead = next;
      if (item === list._evalWatchTail)
        list._evalWatchTail = prev;
      if (prev !== null)
        prev._nextEvalWatch = next;
      if (next !== null)
        next._prevEvalWatch = prev;
    }
  }
});
module.exports = {
  get _LinkedListItem() {
    return _LinkedListItem;
  },
  get _LinkedList() {
    return _LinkedList;
  },
  get _WatchList() {
    return _WatchList;
  },
  get _WatchGroupList() {
    return _WatchGroupList;
  },
  get _ArgHandlerList() {
    return _ArgHandlerList;
  },
  get _EvalWatchList() {
    return _EvalWatchList;
  },
  __esModule: true
};
