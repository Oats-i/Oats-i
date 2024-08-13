import "./styles/app_root.css";

class AppRootComponent extends HTMLElement{

    constructor(){

        super();
    }
}

window.customElements.define("app-root", AppRootComponent);
export default AppRootComponent;