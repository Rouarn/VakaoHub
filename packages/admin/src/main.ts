import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles.css'
import './styles/layout.css'
import './styles/dashboard.css';

createApp(App).use(router).mount('#app');
