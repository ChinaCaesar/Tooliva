import { createApp } from "vue";
import App from "@/App.vue";
import { registerAppPlugins } from "@/plugins";
import { useSettingsStore } from "@/stores/settings.store";
import "@/styles/base.css";

const app = createApp(App);
registerAppPlugins(app);

const settingsStore = useSettingsStore();
settingsStore.hydrate();

app.mount("#app");
