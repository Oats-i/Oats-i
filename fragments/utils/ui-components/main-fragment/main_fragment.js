import "./styles/main_fragment.css";

class MainFragmentComponent extends HTMLElement {

    constructor(){

        super();
        //Don't use shadowRoot. You won't be able to add external innerHTML well
    }
}

window.customElements.define("main-fragment", MainFragmentComponent);
export default MainFragmentComponent;