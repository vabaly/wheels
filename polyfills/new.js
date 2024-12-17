// 使得 _new(fn, a, b) 达到 new fn(a, b) 的效果
function _new(fn, ...args) {
  // 1. 内部创建一个对象
  const obj = {};
  // 2. 内部将 obj 的原型指向 fn 的原型
  obj.__proto__ = fn.prototype;
  // 3. 内部将 obj 作为 this 执行 fn
  const result = fn.call(obj, ...args);

  // 4. 判断 result 是否是对象, 不是对象返回 obj，是对象返回 result
  if (typeof result !== 'object' || typeof result!== 'function' || result === null) {
    // 如果什么都没返回，就返回新建的对象
    if (typeof result === 'undefined') {
      return obj;
    }
    return result;
  } else {
    return result;
  }
}
