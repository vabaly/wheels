// fn.call(obj, a, b) 要将 this 从 fn 转移到 obj，核心思路就是利用对象方法调用的 this 绑定，
// 进一步讲就是将 fn 作为 obj 的一个属性，然后执行 obj.fn()，这样就可以将 this 就是 obj 了。
// 具体做法如下：
// 1. 重写 Function.prototype.call 的方法
// 2. fn.call 调用时，call 函数内部的 this 是 fn，参数是 obj 及其他参数
// 3. 将 fn 作为 obj 的一个属性，然后执行 obj.fn()
Function.prototype.call = function call(context, ...args) {
  // 4. 如果没有传入 context，则默认使用 window
  context = context || window;
  // 5. 属性名不能覆盖用户写的属性，使用 Symbol 保证唯一性
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
}
