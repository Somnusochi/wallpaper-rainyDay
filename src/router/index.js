import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/index',
    name: 'Index',
    component: () => import('@/views/index/index.vue'),
  },
  {
    path: '/',
    redirect: '/index',
  },
  // 添加更多路由
];

const options = {
  history: createWebHashHistory(),
  routes,
};

const router = createRouter(options);

export default router;
