// 创建 React Element 的函数
// 创建下来就是一个描述 React 元素及其子元素的一个树形对象
function createElement(type, props, ...children) {
  return {
    // HTML 标签名、自定义类型（TEXT_ELEMENT）或者函数
    type,
    props: {
      // React Element 的属性
      ...props,
      // React Element 的子元素
      children: children.map(child =>
        typeof child === "object"
          ? child
          // 字符串则说明是个文本元素
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      // 节点值
      nodeValue: text,
      children: [],
    },
  }
}

function createDom(fiber) {
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

const isEvent = key => key.startsWith("on")
const isProperty = key =>
  key !== "children" && !isEvent(key)
const isNew = (prev, next) => key =>
  prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)
// 更新 DOM 节点上面的属性和事件监听
function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners
  // 对之前的属性进行遍历，找出之前的事件属性并且在 nextProps 中不存在的，说明要被移除
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      // 移除旧的事件监听
      dom.removeEventListener(
        eventType,
        prevProps[name]
      )
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      // 移除旧的属性
      dom[name] = ""
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      // 设置新的属性
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      // 添加新的事件监听
      dom.addEventListener(
        eventType,
        nextProps[name]
      )
    })
}

function commitRoot() {
  // 先删除老的 DOM 节点
  deletions.forEach(commitWork)
  // 再根据工作树插入和更新 DOM 节点
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}

// 工作提交，本质上就是从根 Fiber 节点出发，深度优先操作 DOM
function commitWork(fiber) {
  if (!fiber) {
    return
  }

  // 找到具有 DOM 的祖先 Fiber 节点
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  // 根据 effectTag 来判断是插入还是更新还是删除
  if (
    fiber.effectTag === "PLACEMENT" &&
    fiber.dom != null
  ) {
    // 插入新的 DOM 节点到祖先 DOM
    domParent.appendChild(fiber.dom)
  } else if (
    fiber.effectTag === "UPDATE" &&
    fiber.dom != null
  ) {
    // 更新 fiber 对应的 DOM 节点
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent)
  }

  // 深度优先遍历操作 DOM
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

// 将 React Element 渲染到 DOM 中
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }

  // 如果没有下一个工作单元，并且有 wipRoot，就提交工作
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

// 浏览器空闲时间执行工作循环
// React 源码应该是在某个时刻执行的这段代码
requestIdleCallback(workLoop)

// perform 是执行的意思，就是执行一个工作单元的工作
// 每一个工作单元的任务就是创建该 Fiber 节点的 DOM，并且根据 React elements 生成子 Fiber 节点
function performUnitOfWork(fiber) {
  const isFunctionComponent =
    fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  // 下一个工作单元要么是它的兄弟节点，要么是它的父节点的兄弟节点，要么是它的父节点的父节点的兄弟节点，以此类推
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

let wipFiber = null
let hookIndex = null

// 一个函数组件类型的 Fiber 节点会调用这个函数来更新它的子节点
function updateFunctionComponent(fiber) {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []
  // fiber.type 是一个函数，它的返回值是一个 React 元素，它的参数是 fiber.props
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  const actions = oldHook ? oldHook.queue : []
  // setState 会把 action 加入到 fiber 节点的 hooks.queue 中，
  // 组件下次渲染的时候执行
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = action => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    // 任何组件设置了状态，都得从头开始执行工作单元任务
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}

// 创建 Fiber 对应的 DOM，并且生成子 Fiber 节点
function updateHostComponent(fiber) {
  // 如果 fiber 没有创建对应的 dom，就创建一个 dom，并更新它的属性和事件监听
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  // 协调子 fibers
  reconcileChildren(fiber, fiber.props.children)
}

// wipFiber 是正在工作的一个 Fiber 节点，elements 是他的子节点
// 这个函数的作用是根据当前工作的 Fiber 节点，来创建它的子 Fiber 节点，
// 新的子 Fiber 节点根据 React Element 数组和老的 Fiber 节点来创建，特别是其中的 effectTag 属性，
// 老的 Fiber 节点也将会做一些标记，比如删除，还会加入到 deletions 数组中
function reconcileChildren(wipFiber, elements) {
  let index = 0
  // wipFiber.alternate 是 current 树中的对应的 Fiber 节点，这里是获取其子 Fiber 节点
  let oldFiber =
    wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  // 循环遍历子元素
  while (
    index < elements.length ||
    oldFiber != null
  ) {
    const element = elements[index]
    let newFiber = null

    const sameType =
      oldFiber &&
      element &&
      element.type == oldFiber.type

    if (sameType) {
      // 新的 Fiber 就是老的 Fiber 节点更新了新属性的节点
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      }
    }
    if (element && !sameType) {
      // 新的 Fiber 替代老的 Fiber 节点
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }
    // 老的 Fiber 加上了 DELETION 标记，并加入删除数组，它将会被删除
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

const MyReact = {
  // 创建一个描述 React 元素及其子元素的一个树形对象
  createElement,
  render,
  useState,
}

/** @jsx MyReact.createElement */
function Counter() {
  const [state, setState] = MyReact.useState(1)
  return (
    <h1 onClick={() => setState(c => c + 1)}>
      Count: {state}
    </h1>
  )
}
const element = <Counter />
const container = document.getElementById("root")
MyReact.render(element, container)
