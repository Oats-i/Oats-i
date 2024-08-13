//@ts-check

import Queue from "../../../utils/abstract-data-types/queue/queue";

/**
 * This class manages all transition workers. Can queue them and help coordinate their firing for nice effects
 * Will also coordinate workers to pass data between fragments or view panels for transitions
 * 
 * SO, HOW YOU SHOULD WORK*******************
 * 
 * Transitions Manager manages transitions between various workers. 
 * Main job is to trigger each worker to start transitions and coordinate intertransition worker jobs in that
 * developer can ask manager to trigger another transition at a certain percentage of another worker's progress
 * for cool effects. 
 * 
 * Manager however is not responsible for interpolation. That is specific to worker.
 * And, note on nature of transitions, can have class triggered changes (addition or removal of classes to element)
 * or attribute triggered changes (addition or removal of attributes to trigger animations)
 * **Two listed need no interpolator. Developer use css to do actual transitions.
 * Then, others are purely numbers based for various effects
 * 
 * Developer flexibility as wished.
 * 
 * So, developer passes two values. TransitionsDataCollection and TransitionWorkersQueue. 
 * Former holds unique data for each transition. Can have worker have a static method called CollectData (GetTargetViewCurrentProperties(node)) that 
 * collects the data it needs to transition that element and have it as "before" value.
 * Latter holds the transition workers that will be used to make transitions. Each will collect its data from
 * TransitionsDataCollection when passed to it, use it as before and transition to after specified. 
 * 
 * So, TransitionsDataCollection has for each, "before" and "after". Can specify direction for transitions
 * by switching before and after since flow is from before to after.
 * 
 * OKAY
 * 
 * Look at Queues. That's where we specify order of transitions and applicable delays. If delay 0, next item in queue triggered
 * immediately.
 * 
 * Have a progress hook for each transitionworker for manager to use to coordinate queues. 
 * 
 * Deal with element flashing? Happens before "before" properties applied. Developer can mitigate by ensuring they
 * already at before? Or have opacity 0 and reset once "before", if not part of animated properties?
 * 
 * Interesting.....
 * 
 * Fragment and view panel have calls for getTransitionsData_Workers_Queue() that manager uses to build everything
 * 
 * Each worker has a DataCollectionsModel static (or just def? - YES) to return model of how it references values in data collection
 * 
 * On consent, does the same and saved in saved state for reference later.
 * 
 * So, need savedState in bind
 * 
 * STOP TRANSITIONS IF DESTROYING VIEW (on cancel or destroy and transitions was running)
 * 
 * Defer view destroys if needed for transition? Mmmm.....pass node as data? Need to consider effect on cancel.
 * 
 * 
 * @type {import("TransitionsManager").TransitionsManagerConstructor}
 */
const TransitionsManager = class TransitionsManager{

    constructor(){

        /**
         * @type {QueueInstance<TransitionsManagerQueueData<{}>>}
         */
        //@ts-ignore
        this.currentTransitionsQueue = new Queue();
        
        /**
         * @type {NodeJS.Timeout}
         */
        this.completeQueueTimeoutID = null;
    }

    /**
     * 
     * @param {TransitionsManagerRunArgs<{}>} args 
     * @param {genericFunction} cb
     */
    runTransitions(args, cb){

        const startRunningTransitions = () => {

            triggerTransitions(() => {

                this.currentTransitionsQueue.clear();
                if(args.completeQueueDelay){

                    //Delay for as long as needed to mark complete
                    this.completeQueueTimeoutID = setTimeout(() => {

                        this.completeQueueTimeoutID = null;
                        cb();
                    }, args.completeQueueDelay);
                } else {

                    cb();
                }
            });
        }

        if(!this.currentTransitionsQueue.isEmpty()){

            console.error(`Cannot request new transitions while current one still running`);
        } else {

            this.currentTransitionsQueue = args?.queue ? args.queue : this.currentTransitionsQueue;
            if(args.preStartDelay_ms){

                //Using this var because it tells when a transitions queue is being handled
                this.completeQueueTimeoutID = setTimeout(() => {

                    startRunningTransitions();
                }, args.preStartDelay_ms)
            } else {

                startRunningTransitions();
            }
        }

        /**
         * 
         * @param {genericFunction} callback 
         */
        function triggerTransitions(callback){

            if(!args?.queue?.isEmpty()){

                let queueData = args.queue.dequeue();
                queueData.worker.runViewTransition(queueData.data, (progress) => {
    
                    //Run next once we hit or pass trigger (allow for errors to pass 100)
                    if(queueData.nextPercentTrigger && progress >= queueData.nextPercentTrigger){
    
                        triggerTransitions(callback);
                    }
                });
    
                //Call for next immediately if don't have to wait. Else wait for cb
                //Also, if last in queue, then wait till it completes cause this is last recursive call and want to wait for all transitions to complete
                //Specify this value using the flag completeQueueDelay
                /**
                 * And this option won't work. last nextPercentTrigger cannot effectively be completeQueueDelay
                 * Cause can have a different transitions combo that last in queue finishes earlier than latter.
                 * So still have this flag
                 */
                if(!queueData.nextPercentTrigger){
    
                    triggerTransitions(callback);
                }
            } else {
    
                
                callback();
            }
        }
    }

    /**
     * Cancels running transitions
     */
    cancelTransitions(){

        if(this.completeQueueTimeoutID){

            clearTimeout(this.completeQueueTimeoutID);
            this.completeQueueTimeoutID = null;
        }
        while(!this.currentTransitionsQueue.isEmpty()){

            this.currentTransitionsQueue.dequeue().worker.cancelViewTransition()
        }
    }
}

export default TransitionsManager;