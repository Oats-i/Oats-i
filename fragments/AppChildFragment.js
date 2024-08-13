/**
 * Base class of child fragment in the app
 */

import AppMainFragment from "./AppMainFragment";
import "./types/query-params/FragmentQueryParams"

class AppChildFragment extends AppMainFragment{

    /**
     * localRoutingInfo, viewID, childFragmentID, queryParams
     * @param {AppChildFragmentConstructorArgs} args
     */
    constructor(args){

        super(args);
        this.DOMTargetID = args.childFragmentID;
    }

    bindNewUIToDOM(newUITemplate){

        let wrapper = document.createElement("div");
        wrapper.id = this.viewID;
        wrapper.innerHTML = newUITemplate;
        const targetChildFragment = this.getChildFragmentComponent();
        if(!targetChildFragment){

            console.warn(`No <child-fragment> component found with the id ${this.DOMTargetID} for child fragment with view ID ${this.viewID}`);
            throw new Error(`No <child-fragment> component found with the id ${this.DOMTargetID} for child fragment with view ID ${this.viewID}`);
        }
        targetChildFragment.insertAdjacentHTML("beforeend", wrapper.outerHTML);
    }

    /**
     * @returns {HTMLElement}
     */
    getChildFragmentComponent(){

        const mainFragmentComponent = this.getMainFragmentComponent();
        const childFragments = mainFragmentComponent.getElementsByTagName("child-fragment");
        let targetChildFragment;
        for(let i = 0; i < childFragments.length; i++){

            if(childFragments[i].id === this.DOMTargetID){

                targetChildFragment = childFragments[i];
                break;
            }
        }
        
        return targetChildFragment;
    }

    /**
     * @override
     * 
     * @type {AppMainFragment['detachViewFromDOM']}
     */
    detachViewFromDOM(){

        if(this.isViewInitialized()){

            this.getChildFragmentComponent().removeChild(this.getContentNode());
            this.viewListenersAttached = false; //Changing to this because view gone
        }
    }
}

export default AppChildFragment;