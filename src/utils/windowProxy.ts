const observeUserProperties = (callback) => {
  // 创建一个 Proxy 对象来包装 window.userProperties
  const proxy = new Proxy(window.userProperties, {
    get(target, propKey, receiver) {
      // 当访问属性时，可以在这里添加日志或其他操作
      return Reflect.get(target, propKey, receiver);
    },
    set(target, propKey, value, receiver) {
      // 当设置属性时，调用回调函数
      callback(propKey, value);
      return Reflect.set(target, propKey, value, receiver);
    }
  });

  // 将 window.userProperties 替换为代理对象
  window.userProperties = proxy;
}

export default observeUserProperties;
