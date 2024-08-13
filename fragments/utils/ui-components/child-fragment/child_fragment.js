import "./styles/child_fragment.css";

class ChildFragmentComponent extends HTMLElement{

    constructor(){ 

        super();
    }
}

window.customElements.define("child-fragment", ChildFragmentComponent);
export default ChildFragmentComponent;