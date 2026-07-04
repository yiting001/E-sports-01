import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles/base.css';

/**
 * C 端商城前端入口：装配 Pinia 与路由后挂载根组件。
 */
const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
