import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import './style.css'

import { useWorkspaceStore } from '@/stores/workspace'
import { setupWorkspacePersistence } from '@/services/bootstrap/setupWorkspacePersistence'
import { bootstrapAdapters } from '@/services/bootstrap/adapterBootstrap'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const workspace = useWorkspaceStore()
setupWorkspacePersistence(workspace)

void bootstrapAdapters()

app.mount('#app')
