//@ts-check
import TransitionsBaseWorker from "../base/transitions_base_worker";

/**
 * So, how you work. 
 * 
 * Just toggle a fixed attribute and use that to trigger css transitions
 * 
 */
/**
 * @extends {TransitionsBaseWorker}
 */
class AttributesTransitionsWorker extends TransitionsBaseWorker{

    /**
     * 
     * @param {AttributesTransitionsWorkerConstructorArgs} args 
     */
    constructor(args){

        super(args);

        /**
         * @type {NodeJS.Timeout}
         */
        this.durationTimeOutID = null;
        /**
         * @type {string}
         */
        this.customTargetAttribute = args.customTargetAttribute;
        /**
         * @type {Element[]}
         */
        this.nodesList = args.overrideNodesList;
    }
    
    static DataCollectionsModel = {

        forward: 1,
        back: 0
    }

    /**
     * @type {AttributesTransitionsWorkerConstructor['ToggleAttribute']}
     */
    static get ToggleAttribute(){

        return "transition_attr_toggle";
    }

    /** 
     * @type {TransitionsBaseWorkerConstructor['GetTargetViewCurrentProperties']}
     * @param {string} [customAttribute]
     * @returns {string}
     */
    static GetTargetViewCurrentProperties(node, customAttribute){

        return node.getAttribute(customAttribute ? customAttribute : AttributesTransitionsWorker.ToggleAttribute);
    }

    /**
     * 
     * @param {TransitionsData<AttributesTransitionWorkerDataModel<"">>} data 
     * @param {transitionsWorkerProgressCb} cb
     */
    runViewTransition(data, cb){

        /**
         * 
         * @param {Element} node 
         */
        const runNodeTransition = (node) => {

            //Set the attribute to after
            node.setAttribute(this.customTargetAttribute ? this.customTargetAttribute : AttributesTransitionsWorker.ToggleAttribute, data.after);
        }

        if(this.targetNode){

            runNodeTransition(this.targetNode);
        } else if(this.nodesList){

            this.nodesList.forEach((node) => {

                runNodeTransition(node);
            });
        } 

        if(this.targetNode || this.nodesList){

            //This callback does nothing, unless you specify a next percent trigger
            this.durationTimeOutID = setTimeout(() => {

                this.durationTimeOutID = null;
                cb(100);
            }, data.animDuration ? data.animDuration : 200);
        }
        
        if(!this.targetNode && !this.nodesList){

            console.error("Target node null. Transition not run");
            cb(100);
        }
    }

    cancelViewTransition(){

        clearTimeout(this.durationTimeOutID);
        this.durationTimeOutID = null;
    }
}

if(false){

    /**
     * @type {AttributesTransitionsWorkerConstructor}
     */
    const attrCheck = AttributesTransitionsWorker;
}

export default AttributesTransitionsWorker;