type PropertyChangeCallback = (propKey: string, value: unknown) => void;

const observeUserProperties = (callback: PropertyChangeCallback) => {
  const proxy = new Proxy(window.userProperties as Record<string, unknown>, {
    get(target, propKey, receiver) {
      return Reflect.get(target, propKey, receiver);
    },
    set(target, propKey, value, receiver) {
      callback(propKey as string, value);
      return Reflect.set(target, propKey, value, receiver);
    },
  });
  window.userProperties = proxy;
};

export default observeUserProperties;
