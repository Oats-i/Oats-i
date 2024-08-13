//@ts-check

import RandomNumberCharGenUtils from "../../../utils/random-number-generator/random_number_char_generator";


class TimedFunctionUtils{

    /**
     * @param {import("TimedFunctionUtils").TimedFunctionUtilsContructorArgs} args
     */
    constructor(args){

        this.lifeCycleInstance = args.fragmentLifecycleInstance;
        /**
         * @type {Map<string, NodeJS.Timeout>}
         */
        this.runningTimers = new Map();
        this.active = false;

        this.attachToLifecycle();
    }

    attachToLifecycle(){

        this.lifeCycleInstance.registerLifeCycleListeners({

            onFragmentRunning: () => {

                this.active = true;
            },
            onFragmentCancelled: () => {


            },
            onFragmentDestroyed: () => {

                this.clearAllTimers();
            }
        });
    }

    /**
     * @type {import("TimedFunctionUtils").TimedFunctionUtilsInstance['setTimedFunction']}
     */
    setTimedFunction(delayMs, cb, overrideId){

        if(this.active){

            const returnId = overrideId ? overrideId : RandomNumberCharGenUtils.generateRandomNumChar(4);
            const timerID = setTimeout(() => {
    
                this.runningTimers.delete(returnId);
                cb();
            }, delayMs);
    
            this.runningTimers.set(returnId, timerID);
    
            return returnId;
        }

        console.error("Can't set timed function. Lifecycle host not running");
        return undefined;
    }

    /**
     * @type {import("TimedFunctionUtils").TimedFunctionUtilsInstance['clearTimedFunction']}
     */
    clearTimedFunction(id){

        const timerID = this.runningTimers.get(id);
        if(timerID){

            clearTimeout(timerID);
            this.runningTimers.delete(id);
        } else {

            console.error("TIMED FUNCTION UTILS ERROR: No timer id found for id: " + id);
        }
    }

    clearAllTimers(){

        this.runningTimers.forEach((timerID, returnId) => {

            clearTimeout(timerID);
        });

        this.runningTimers.clear();
        this.active = false;
    }
}

if(false){

    /**
     * @type {import("TimedFunctionUtils").TimedFunctionUtilsInstance}
     */
    const check = new TimedFunctionUtils(null);
}

export default TimedFunctionUtils;