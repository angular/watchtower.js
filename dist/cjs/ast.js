"use strict";
var __moduleName = "ast";
var WatchRecord = $traceurRuntime.assertObject(require('./change_detection')).WatchRecord;
var $__1 = $traceurRuntime.assertObject(require('./watch_record')),
    _Handler = $__1._Handler,
    _ConstantHandler = $__1._ConstantHandler,
    _InvokeHandler = $__1._InvokeHandler,
    _FieldHandler = $__1._FieldHandler,
    _EvalWatchRecord = $__1._EvalWatchRecord;
function _argsList(list) {
  if (!list)
    list = [];
  if (!Array.isArray(list))
    return '';
  return list.join(', ');
}
var AST = function AST(expression) {
  if (typeof expression !== "string")
    throw "expression must be a string";
  this.expression = expression.indexOf('#.') === 0 ? expression.substr(2) : expression;
};
($traceurRuntime.createClass)(AST, {
  setupWatch: function(group) {
    throw "setupWatch() not implemented";
  },
  toString: function() {
    return this.expression;
  }
}, {});
AST._CONTEXT = '#';
var ContextReferenceAST = function ContextReferenceAST() {
  $traceurRuntime.superCall(this, $ContextReferenceAST.prototype, "constructor", [AST._CONTEXT]);
};
var $ContextReferenceAST = ContextReferenceAST;
($traceurRuntime.createClass)(ContextReferenceAST, {setupWatch: function(group) {
    return new _ConstantWatchRecord(group, this.expression, group.context);
  }}, {}, AST);
var ConstantAST = function ConstantAST(constant, expression) {
  if (arguments.length < 2)
    expression = null;
  $traceurRuntime.superCall(this, $ConstantAST.prototype, "constructor", [expression === null ? (typeof constant === "string" ? ("\"" + constant + "\"") : ("" + constant)) : expression]);
  this.constant = constant;
};
var $ConstantAST = ConstantAST;
($traceurRuntime.createClass)(ConstantAST, {setupWatch: function(group) {
    return new _ConstantWatchRecord(group, this.expression, this.constant);
  }}, {}, AST);
var FieldReadAST = function FieldReadAST(lhs, name) {
  this.lhs = lhs;
  this.name = name;
  $traceurRuntime.superCall(this, $FieldReadAST.prototype, "constructor", [(lhs + "." + name)]);
};
var $FieldReadAST = FieldReadAST;
($traceurRuntime.createClass)(FieldReadAST, {setupWatch: function(group) {
    return group.addFieldWatch(this.lhs, this.name, this.expression);
  }}, {}, AST);
var PureFunctionAST = function PureFunctionAST(name, fn, argsAST) {
  this.fn = fn;
  this.argsAST = argsAST;
  this.name = name;
  $traceurRuntime.superCall(this, $PureFunctionAST.prototype, "constructor", [(name + "(" + _argsList(argsAST) + ")")]);
};
var $PureFunctionAST = PureFunctionAST;
($traceurRuntime.createClass)(PureFunctionAST, {setupWatch: function(group) {
    return group.addFunctionWatch(this.fn, this.argsAST, this.expression);
  }}, {}, AST);
var MethodAST = function MethodAST(lhsAST, name, argsAST) {
  this.lhsAST = lhsAST;
  this.name = name;
  this.argsAST = argsAST;
  $traceurRuntime.superCall(this, $MethodAST.prototype, "constructor", [(lhsAST + "." + name + "(" + _argsList(argsAST) + ")")]);
};
var $MethodAST = MethodAST;
($traceurRuntime.createClass)(MethodAST, {setupWatch: function(group) {
    return group.addMethodWatch(this.lhsAST, this.name, this.argsAST, this.expression);
  }}, {}, AST);
var CollectionAST = function CollectionAST(valueAST) {
  this.valueAST = valueAST;
  $traceurRuntime.superCall(this, $CollectionAST.prototype, "constructor", [("#collection(" + valueAST + ")")]);
};
var $CollectionAST = CollectionAST;
($traceurRuntime.createClass)(CollectionAST, {setupWatch: function(group) {
    return group.addCollectionWatch(this.valueAST);
  }}, {}, AST);
var _ConstantWatchRecord = function _ConstantWatchRecord(watchGroup, expression, currentValue) {
  this.currentValue = currentValue;
  this.handler = new _ConstantHandler(watchGroup, expression, currentValue);
};
($traceurRuntime.createClass)(_ConstantWatchRecord, {
  check: function() {
    return false;
  },
  remove: function() {
    return null;
  },
  get field() {
    return null;
  },
  get previousValue() {
    return null;
  },
  get object() {
    return null;
  },
  set object(value) {
    return null;
  },
  get nextChange() {
    return null;
  }
}, {}, WatchRecord);
module.exports = {
  get AST() {
    return AST;
  },
  get ContextReferenceAST() {
    return ContextReferenceAST;
  },
  get ConstantAST() {
    return ConstantAST;
  },
  get FieldReadAST() {
    return FieldReadAST;
  },
  get PureFunctionAST() {
    return PureFunctionAST;
  },
  get MethodAST() {
    return MethodAST;
  },
  get CollectionAST() {
    return CollectionAST;
  },
  __esModule: true
};
