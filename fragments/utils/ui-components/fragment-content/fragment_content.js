import "./styles/fragment_content.css";

class FragmentContentComponent extends HTMLElement {

    constructor(){

        super();
        //Don't use shadowRoot. You won't be able to add external innerHTML well
    }
}

window.customElements.define("fragment-content", FragmentContentComponent);
export default FragmentContentComponent;