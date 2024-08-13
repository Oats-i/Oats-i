//@ts-check
const { default: TransitionsBaseWorker } = require("../base/transitions_base_worker");

/**
 * @type {TransitionsTranslationWorkerConstructor}
 */
const TransitionTranslationWorker = class TransitionTranslationWorker extends TransitionsBaseWorker{

    static get TRANSLATE_Y_PROPERTY(){
        
        return "--hpTY";
    }

    static get TRANSLATE_X_PROPERTY(){

        return "--hpTX";
    } 
    
    /**
     * Use this to get the current properties of the object to be animated. Each implements differently
     * @param {HTMLElement} node 
     * @returns {TransitionTranslationAnimationProperties}
     */
    static GetCurrentAnimationProperties(node){

        return {

            translateX: node.style.getPropertyValue(TransitionTranslationWorker.TRANSLATE_X_PROPERTY),
            translateY: node.style.getPropertyValue(TransitionTranslationWorker.TRANSLATE_Y_PROPERTY)
        }
    }
}

export default TransitionTranslationWorker;