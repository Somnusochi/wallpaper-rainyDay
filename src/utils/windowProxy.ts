interface UserProperties {
  [key: string]: any;
}

/**
 * 观察 `window.userProperties` 的属性变化，并在属性设置时调用回调函数。
 *
 * @param callback - 属性设置时调用的回调函数，参数为属性名和新值。
 */
const observeUserProperties = (callback: (propKey: string, value: any) => void): void => {
  // 创建一个 Proxy 对象来包装 window.userProperties
  const proxy = new Proxy(window.userProperties as UserProperties, {
    get(target: UserProperties, propKey: string | symbol, receiver: any) {
      // 当访问属性时，可以在这里添加日志或其他操作
      return Reflect.get(target, propKey, receiver);
    },
    set(target: UserProperties, propKey: string | symbol, value: any, receiver: any) {
      // 当设置属性时，调用回调函数
      callback(propKey.toString(), value);
      return Reflect.set(target, propKey, value, receiver);
    }
  });

  // 将 window.userProperties 替换为代理对象
  window.userProperties = proxy;
};

export default observeUserProperties;
