import App from './App'
import { installWechatWebSocketShim } from './im/wechat-socket'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
export function createApp() {
	// socket.io-client 依赖浏览器 WebSocket；小程序端先注入 wx.connectSocket 适配实现
	installWechatWebSocketShim()
	const app = createSSRApp(App)
	return {
		app
	}
}
// #endif
