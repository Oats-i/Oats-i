//@ts-check
/**
 * Manages fragment and view panel life cycle
 */
class FragmentLifeCycleManager{

    constructor(){

        /**
         * @type {number}
         */
        this.currentLifeCycleStage = FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed;

        /**
         * @type {LifeCycleListenerGroup[]}
         */
        this.registeredLifeCycleListeners = [];

        this.viewReady = false;
    }

    static get _LIFECYCLE_STAGES(){

        return {

            running: 0,
            destroyed: 1,
            cancelled: 2 //Special stage where the fragment or panel not destroyed. Current build cancelled for a new one
            //Above needed cause functionally, will not remove existing listeners. So, only add listeners on construct
        }
    }

    /**
     * 
     * @param {number} stage 
     * @returns 
     */
    static getNameOfLifecycleStage(stage){

        let stageName = "";
        for(let key in FragmentLifeCycleManager._LIFECYCLE_STAGES){

            if(FragmentLifeCycleManager._LIFECYCLE_STAGES[key] = stage){

                stageName = key;
                break;
            }
        }

        return stageName;
    }

    /**
     * 
     * @param {number} newStage
     */
    transitionLifeCycle(newStage){

        if(newStage === this.currentLifeCycleStage){

            const msg = newStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed ? FragmentLifeCycleManager.getNameOfLifecycleStage(FragmentLifeCycleManager._LIFECYCLE_STAGES.running) : FragmentLifeCycleManager.getNameOfLifecycleStage(FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed);
            throwLifeCycleTransitionError(this.currentLifeCycleStage, newStage, msg)
        }

        if(this.currentLifeCycleStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed){

            if(newStage !== FragmentLifeCycleManager._LIFECYCLE_STAGES.running){

                throwLifeCycleTransitionError(this.currentLifeCycleStage, newStage, FragmentLifeCycleManager.getNameOfLifecycleStage(FragmentLifeCycleManager._LIFECYCLE_STAGES.running));
            }
        }

        //Kinda redundant check, FOR NOW, cause same as not repeating state as only running only valid. FOR NOW
        else if(this.currentLifeCycleStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.running){

            if(newStage !== FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed && newStage !== FragmentLifeCycleManager._LIFECYCLE_STAGES.cancelled){

                throwLifeCycleTransitionError(this.currentLifeCycleStage, newStage, FragmentLifeCycleManager.getNameOfLifecycleStage(FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed));
            }
        }


        if(newStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed){

            this.onLifeCycleDestroy()
        } else if(newStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.running){

            this.onLifeCycleRunning();
        } else if(newStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.cancelled){

            this.onLifeCycleCancelled();
        }

        /**
         * 
         * @param {number} currStage 
         * @param {number} newStage 
         * @param {string} validStage
         */
        function throwLifeCycleTransitionError(currStage, newStage, validStage){

            throw new Error(`Cannot transition fragment's life cycle from ${FragmentLifeCycleManager.getNameOfLifecycleStage(currStage)} to ${FragmentLifeCycleManager.getNameOfLifecycleStage(newStage)}. Only next valid stage is ${validStage}`);
        }
    }

    onLifeCycleDestroy(){

        this.currentLifeCycleStage = FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed;
        this.registeredLifeCycleListeners.forEach((listenerGroup) => {

            listenerGroup.onFragmentDestroyed();

            //deregistering all listeners. And cause of list shrinking,  globally below
            //LOGIC - All destroyed fragments or view panels (extending this) are never reinflated
            //so, don't want memory leaks or null calls
        });

        this.registeredLifeCycleListeners = [];
    }

    onLifeCycleRunning(){

        this.currentLifeCycleStage = FragmentLifeCycleManager._LIFECYCLE_STAGES.running;

        this.registeredLifeCycleListeners.forEach((listenerGroup) => {

            listenerGroup.onFragmentRunning();
        });
    }

    onLifeCycleCancelled(){

        this.currentLifeCycleStage = FragmentLifeCycleManager._LIFECYCLE_STAGES.cancelled;

        this.registeredLifeCycleListeners.forEach((listenerGroup) => {

            listenerGroup.onFragmentCancelled();
        });
    }

    onViewReady(){

        if(this.currentLifeCycleStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.running){

            this.viewReady = true;
            //trigger listeners
            this.registeredLifeCycleListeners.forEach((listenerGroup) => {

                listenerGroup.onViewReady?.();
            })
        } else {

            throw new Error("Early onViewReady call. Your fragment/view manager is not running");
        }
    }

    /**
     * 
     * @param {LifeCycleListenerGroup} listenerGroup
     */
    registerLifeCycleListeners(listenerGroup){

        this.registeredLifeCycleListeners.push(listenerGroup);

        //Fire for running, if already running, then viewReady. In case developer wants to act based on that
        if(this.currentLifeCycleStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.running){

            listenerGroup.onFragmentRunning();
            if(this.viewReady){

                listenerGroup.onViewReady?.();
            }
        }
    }

    /**
     * 
     * @param {LifeCycleListenerGroup} listeners 
     */
    deregisterLifeCycleListeners(listeners){

        const targetIndex = this.registeredLifeCycleListeners.findIndex((listenerGroup) => listenerGroup === listeners);
        if(targetIndex !== -1){

            this.registeredLifeCycleListeners.splice(targetIndex, 1);
        } else {

            console.error("Failed to deregister lifecycle events listener");
            console.log(this.registeredLifeCycleListeners.length);
        }
    }

    /**
     * @returns {boolean}
     */
    isFragmentLifeCycleRunning(){

        return this.currentLifeCycleStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.running;
    }
}

if(false){

    /**
     * @type {import("FragmentLifeCycleManager").FragmentLifeCycleManagerConstructor}
     */
    const check = FragmentLifeCycleManager;
}

export default FragmentLifeCycleManager;