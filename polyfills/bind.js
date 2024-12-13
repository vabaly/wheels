// const fn1 = fn.bind(obj); fn1(a, b); or
// const fn1 = fn.bind(obj, a, b); fn1();
// bind 可以使用 call 来实现，重点在于：
// 1. 返回函数
// 2. bind 也可以传参，需要将参数保存起来，在返回函数中使用
Function.prototype.bind = function bind(obj, ...args1) {
  const fn = this;
  return function fn1(...args2) {
    const args = [...args1,...args2];
    return fn.call(obj, ...args);
  }
}
