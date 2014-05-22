import {
  _Handler,
  _ConstantHandler,
  _InvokeHandler,
  _FieldHandler,
  _EvalWatchRecord
} from './watch_record';

function _argsList(list) {
  if (!list) list = [];
  if (!Array.isArray(list)) return '';
  return list.join(', ');
}

export class AST {
  constructor(expression) {
    if (typeof expression !== "string") {
      throw "expression must be a string";
    }

    this.expression = expression.indexOf('#.') === 0
                    ? expression.substr(2)
                    : expression;
  }

  setupWatch(group) {
    throw "setupWatch() not implemented";
  }

  toString() {
    return this.expression;
  }
}

AST._CONTEXT = '#';

export class ContextReferenceAST extends AST {
  constructor() {
    super(AST._CONTEXT);
  }

  setupWatch(group) {
    return new _ConstantWatchRecord(group, this.expression, group.context);
  }
}

export class ConstantAST extends AST {
  constructor(constant, expression) {
    if (arguments.length < 2) {
      expression = null;
    }

    super(expression === null
        ? (typeof constant === "string" ? `"${constant}"` : `${constant}`)
        : expression);

    this.constant = constant;
  }

  setupWatch(group) {
    return new _ConstantWatchRecord(group, this.expression, this.constant);
  }
}

export class FieldReadAST extends AST {
  constructor(lhs, name) {
    this.lhs = lhs;
    this.name = name;

    super(`${lhs}.${name}`);
  }

  setupWatch(group) {
    return group.addFieldWatch(this.lhs, this.name, this.expression);
  }
}

export class PureFunctionAST extends AST {
  constructor(name, fn, argsAST) {
    this.fn = fn;
    this.argsAST = argsAST;
    this.name = name;

    super(`${name}(${_argsList(argsAST)})`);
  }

  setupWatch(group) {
    return group.addFunctionWatch(this.fn, this.argsAST, this.expression);
  }
}

export class MethodAST extends AST {
  constructor(lhsAST, name, argsAST) {
    this.lhsAST = lhsAST;
    this.name = name;
    this.argsAST = argsAST;

    super(`${lhsAST}.${name}(${_argsList(argsAST)})`);
  }

  setupWatch(group) {
    return group.addMethodWatch(this.lhsAST, this.name, this.argsAST, this.expression);
  }
}

export class CollectionAST extends AST {
  constructor(valueAST) {
    this.valueAST = valueAST;

    super(`#collection(${valueAST})`);
  }

  setupWatch(group) {
    return group.addCollectionWatch(this.valueAST);
  }
}

class _ConstantWatchRecord {
  constructor(watchGroup, expression, currentValue) {
    this.currentValue = currentValue;
    this.handler = new _ConstantHandler(watchGroup, expression, currentValue);
    this.field = this.previousValue = this.object = this.nextChange = null;
  }

  check() {
    return false;
  }

  remove() {
    return null;
  }
}