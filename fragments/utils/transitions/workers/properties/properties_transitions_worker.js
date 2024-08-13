const { default: TransitionsBaseWorker } = require("../base/transitions_base_worker");

/**
 * @deprecated
 * 
 * For class changes, just use the onInitViewTransition hook in fragment or view panel
 */
class PropertiesTransitionsWorker extends TransitionsBaseWorker{

    constructor(){


    }

    /**
     * 
     * @param {ViewTransitionData} transitionData 
     */
    setUpPropertyTransition(transitionData){


    }

    /**
     * 
     * @returns { { Translation: TranslateTransition } }
     */
    PROPERTY_TRANSITION_CLASSES(){

        return {

            Translation: TranslateTransition
        }
    }
}

class TranslateTransition extends TransitionsBaseWorker{

    constructor(){


    }
}