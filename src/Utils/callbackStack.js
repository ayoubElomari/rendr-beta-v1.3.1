class CallbackStack {
  constructor() {
    this.callbacks = [];
  }
  add(callback) {
    this.callbacks.push(callback);
  }
  async close() {
    for (const cb of this.callbacks) {
      await cb();
      this.callbacks = this.callbacks.filter((c) => c !== cb); // Remove executed callback
    }
  }
}
const closeCallbackStack = new CallbackStack();

module.exports = {
  closeCallbackStack,
};
