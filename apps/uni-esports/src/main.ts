import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { installWechatWebSocketShim } from './im/wechat-socket';

export function createApp() {
  // socket.io-client 依赖浏览器 WebSocket；小程序端先注入 wx.connectSocket 适配实现
  installWechatWebSocketShim();
  const app = createSSRApp(App);
  app.use(createPinia());
  return { app };
}
