import Vue from "vue";
import App from "./App.vue";
import "@fortawesome/fontawesome-free/css/all.css";
import "@fortawesome/fontawesome-free/js/all.js";
import { CursorFx } from '@luxdamore/vue-cursor-fx';
import '@luxdamore/vue-cursor-fx/dist/CursorFx.css';
Vue.component(
    CursorFx.name,
    CursorFx
);

Vue.config.productionTip = false;

new Vue({
    render: function (h) {
        return h(App);
    },
}).$mount("#app");
Vue.use(
    CursorFx
);
