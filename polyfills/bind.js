// const fn1 = fn.bind(obj); fn1(a, b); or
// const fn1 = fn.bind(obj, a, b); fn1();
// bind 可以使用 call 来实现，重点在于：
// 1. 返回函数
// 2. bind 也可以传参，需要将参数保存起来，在返回函数中使用
// 3. const foo = new fn1() 时，new 操作符的 this 绑定依然有效
// 4. 希望 foo 的原型链上有 fn.prototype
// 5. bind 的首个参数进行类型检验
Function.prototype.bind = function bind(obj, ...args1) {
  const fn = this;

  // 类型检验
  if (typeof fn !== 'function') {
    throw new Error('bind must be called on function')
  }

  // 假设 fn 中有一个 this.a = 1，那么 const foo = new fn1() 时，由于执行 fn.call(obj)，fn 中的 this 还是 obj，
  // 但其实希望是 foo
  function fn1(...args2) {
    const args = [...args1,...args2];
    // 判断是不是 new 调用的
    // new fn1() 时，this 指向 foo，而 foo 的原型是 fn1.prototype
    const isNewOperation = this instanceof fn1;
    // 如果是 new 调用的，this 指向 foo，否则指向 obj
    const context = isNewOperation ? this : obj;
    return fn.call(context, ...args);
  }

  // const foo = new fn1() 时，foo 的原型是 fn1.prototype，于是可以设置 fn1.prototype 的原型是 fn.prototype
  fn1.prototype = Object.create(fn.prototype);
  return fn1;
}
