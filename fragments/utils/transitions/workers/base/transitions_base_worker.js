//@ts-check

/**
 * Utility Base Class for view transitions in fragment and view panels.
 */
class TransitionsBaseWorker{

    /**
     * 
     * @param {TransitionsBaseWorkerConstructorArgs} args 
     */
    constructor(args){

        /**
         * @type {BaseTransitionInterpolator}
         */
        this.interpolator = args.interpolator;
        /**
         * @type {number}
         */
        this.currentAnimationHandle = null;
        /**
         * @type {Element}
         */
        this.targetNode = args.node;
    }
    
    static DataCollectionsModel = {}

    /**
     * Override to get the properties you need 
     * 
     * @type {TransitionsBaseWorkerConstructor['GetTargetViewCurrentProperties']}
     */
    static GetTargetViewCurrentProperties(node){

        return null;
    }

    /**
     * OVERRIDE
     * 
     * Place your run view transitions logic here
     * 
     * @param {TransitionsDataCollection<{}>} data 
     * @param {transitionsWorkerProgressCb} progressCb
     */
    runViewTransition(data, progressCb){


    }

    /**
     * Cancels current transition
     */
    cancelViewTransition(){


    }
}

if(false){

    /**
     * @type {TransitionsBaseWorkerConstructor}
     */
    const check = TransitionsBaseWorker;
}

export default TransitionsBaseWorker