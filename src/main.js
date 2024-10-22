import '@/assets/style/reset.css';
import '@/assets/style/style.scss';
import { createApp } from 'vue';
import router from '@/router';
import App from './App.vue';

createApp(App).use(router).mount('#app');
