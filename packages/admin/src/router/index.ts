import { createRouter, createWebHashHistory } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';
import Apps from '@/views/Apps.vue';
import Audit from '@/views/Audit.vue';
import Dashboard from '@/views/Dashboard.vue';
import Events from '@/views/Events.vue';
import Login from '@/views/Login.vue';
import Releases from '@/views/Releases.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: Login, meta: { public: true } },
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', component: Dashboard },
        { path: 'apps', component: Apps },
        { path: 'releases', component: Releases },
        { path: 'events', component: Events },
        { path: 'audit', component: Audit },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('hub_token');
  if (to.meta.public) {
    if (token && to.path === '/login') return '/dashboard';
    return true;
  }
  if (!token) return '/login';
  return true;
});

export default router;
