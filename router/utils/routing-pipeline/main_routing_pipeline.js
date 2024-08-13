import ObjectsUtils from "../../../utils/abstract-data-types/objects/objects";
import Stack from "../../../utils/abstract-data-types/stack/stack_adt";
import RouteParamsUtil from "../route-params/route_params";

/**
 * Handles actual routing from the main router
 * 
 * Holds indexed router history as well
 */

/**
 * 
 * @typedef ActiveBuildInfo
 * @property {Stack<AppMainFragmentInstance>} buildStack
 * @property {Stack<AppMainFragmentInstance>} cancelBuildStack
 * 
 * * @typedef {ExtGenericRouteBuildPipelineArgs<{ routeParams: RouteParams, savedState: SavedFragmentState, buildStack: Stack<AppMainFragmentInstance> }} BuildStatePipelineArgs
 */
class MainRoutingPipeline{

    /**
     * 
     * @param {MainRouter} mainRouter 
     * @param {canAccessRoute} accessCallback
     */
    constructor(mainRouter, accessCallback){

        /**
         * @type {MainRouter}
         */
        this.mainRouter = mainRouter;
        /**
         * @type {canAccessRoute}
         */
        this.accessCallback = accessCallback;
        this.targetRouteEntryUtils = new TargetRouteEntryUtils(this.mainRouter);
        this.currentPipelineState = MainRoutingPipeline._PIPELINESTATES.complete;
        this.asynAccessCallActiveRoute = ""; //Use to know which route is active and dump late access verification calls to a dumped route before verif
        /**
         * @type {ActiveBuildInfo}
         */
        this.activeBuildInfo = {};
        this.activeBuildInfo.cancelBuildStack = new Stack();
    }

    static get _PIPELINESTATES(){ 
        
        /**
         * If building, then can also be consenting. So block as long as building?
         * Nope. Internally must check if consenting. SOLVE THIS CONFUSION BY STARTING WITH CONSENTING THEN BUILDING
         * 
         * Cancel request, on cancel, made only to fragment building at the time. Store information in PipelineProgress object <currentBuildIndex>
         * 
         * So, possible state transitions are: 
         * 
         * consenting -> building -> complete
         * 
         * OR
         * 
         * consenting -> consentDenied -> complete (after callback, internally updates to complete? Or maintain last state? Yes. For debugging reasons** No. complicated transitions)
         * 
         * OR 
         * 
         * consenting -> building -> cancelled -> complete (new build request. Stop current pipeline and transition to building with new url)
         */
        return { complete: 0, consenting: 1, consentDenied: 2, buildStarting: 3, building: 4, cancelled: 5 };
    };

    /**
     * Get the name of a pipeline state
     * 
     * @param {number} state 
     * @returns {string}
     */
    static getNameofPipelineState(state){

        let name;
        for(let key in MainRoutingPipeline._PIPELINESTATES){

            if(MainRoutingPipeline._PIPELINESTATES[key] === state){

                name = key;
                if(key === "consentDenied"){

                    name = "consent denied";
                } else if(key === "buildStarting"){

                    name = "build starting";
                }
                break;
            }
        }

        return name ? name : "undefined " + state;
    }

    /**
     * Called by main router to start routing. ONLY command for routing
     * 
     * Throws a build error if pipeline was in consenting state. Cannot cancel a consent
     * 
     * Use when popping states to forward or reverse the pop request to current consenting path
     * 
     * @param {RouteBuildPipelineArgs} args
     */
    startRoutingBuildPipeline(args){

        try {

            this.canStartRouting();
            //Start build pipeline
            this.buildRoutePipeline(args);
        } catch(err){

            throw new Error(err);
        }
    }

    /**
     * Tell whether can start routing. Else, throws error
     * 
     * Can only start routing if pipeline building or complete
     */
    canStartRouting(){

        if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.consenting){

            throwRoutingStartError("Current pipeline consenting");
        } else if(this.currentPipelineState == MainRoutingPipeline._PIPELINESTATES.consentDenied){

            throwRoutingStartError("Current pipeline denying consents and maintaining consented fragments");
        } else if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.buildStarting){

            throwRoutingStartError("Current pipeline starting a build");
        } else if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.cancelled){

            throwRoutingStartError("Current pipeline cancelling");
        }

        function throwRoutingStartError(msg){

            throw new Error(`Routing denied. ${msg}\n\nMain Router Internal - make sure all routing calls are in a try-catch statement to correctly handle denied calls`);
        }
    }

    /**
     * Asynchronous. Builds the routing pipeline and starts build
     * 
     * @param {RouteBuildPipelineArgs} args
     */
    async buildRoutePipeline(args){

        //NEW LOGIC
        //Have this as active route
        this.asynAccessCallActiveRoute = args.fullURL;

        //Establish route can be accessed
        /**
         * @type {RoutePipelineAccessValidator}
         */
        let validation = { canAccess: true };

        //Validate route can be accessed
        if(this.accessCallback){

            validation = await this.accessCallback(args.fullURL);
        }

        if(validation.canAccess){

            //During async action, no other build request was made. Now back to main "thread" thus no asynchoronous issues and check no build block again
            if(this.asynAccessCallActiveRoute === args.fullURL){

                try{

                    this.canStartRouting();
                    //Check if was in the middle of building another route
                    if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.building){

                        //Transition state to cancelling then building
                        this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.cancelled, args);
                    } else {

                        //Transition state to consenting then building.
                        this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.consenting, args);
                    }

                    //Get consent from previous route to destroy and build new one

                    //Get params and queries and fix to mainRouter object which will be passed to fragments through the pipeline

                    //Inflate fragments using the fragment builders based on indexed router history data

                    //Trigger the first build
                } catch(err){

                    if(err === String && err.startsWith("Routing denied")){

                        console.warn("Late validation for route " + args.fullURL);
                        console.warn("Ideally, should not be the case");
                    }
                    console.warn(err);
                }
            }
        } else {

            //Trigger mainRouter to go to default route. 
            //Use state transitions with default route

            //Update pipeline state before doing so so main router can request pipeline successfully
            //Nope. What of other running builds? haven't updated prior
            // this.currentPipelineState = MainRoutingPipeline._PIPELINESTATES.complete;

            if(validation.fallbackRoute){

                //WATCH THIS ROUTE ACTION
                //Must not retrigger consenting. Have consent managed by routing pipeline too
                this.mainRouter.routeToView({ fullURL: validation.fallbackRoute }); //Change this to routeToURL
            }
        }
    }

    /**
     * Handle pipeline state transitions. Ensures the transition is valid
     * 
     * Calls state callbacks if any is needed
     * 
     * @param {number} newState 
     * @param {RouteBuildPipelineArgs} args
     */
    transitionPipelineState(newState, args){

        //Perform integrity checks
        //Using else if to avoid running other ifs. State check only hits one

        //New state must not be the same as current state
        if(this.currentPipelineState === newState){

            throwStateTransitionError(this.currentPipelineState, "");
        }

        //Current state complete. Only valid next state is consenting
        else if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.complete){

            if(newState !== MainRoutingPipeline._PIPELINESTATES.consenting){

                throwStateTransitionError(this.currentPipelineState, `${MainRoutingPipeline.getNameofPipelineState(MainRoutingPipeline._PIPELINESTATES.consenting)}`);
            }
        }

        //Current state consenting. Only valid next states are building and consentDenied
        else if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.consenting){

            if(newState !== MainRoutingPipeline._PIPELINESTATES.buildStarting && newState !== MainRoutingPipeline._PIPELINESTATES.consentDenied){

                throwStateTransitionError(this.currentPipelineState, `${MainRoutingPipeline.getNameofPipelineState(MainRoutingPipeline._PIPELINESTATES.buildStarting)} or ${MainRoutingPipeline.getNameofPipelineState(MainRoutingPipeline._PIPELINESTATES.consentDenied)}`)
            }
        }
        
        //Current state buildStarting. Only valid next states is building
        else if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.buildStarting){

            if(newState !== MainRoutingPipeline._PIPELINESTATES.building){

                throwStateTransitionError(this.currentPipelineState, `${MainRoutingPipeline.getNameofPipelineState(MainRoutingPipeline._PIPELINESTATES.building)}`)
            }
        }

        //Current state building. Only valid next states are complete or cancelled
        else if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.building){

            if(newState !== MainRoutingPipeline._PIPELINESTATES.complete && newState !== MainRoutingPipeline._PIPELINESTATES.cancelled){

                throwStateTransitionError(this.currentPipelineState, `${MainRoutingPipeline.getNameofPipelineState(MainRoutingPipeline._PIPELINESTATES.complete)} or ${MainRoutingPipeline.getNameofPipelineState(MainRoutingPipeline._PIPELINESTATES.cancelled)}`)
            }
        }

        //Current state consentDenied. Only next valid state is complete
        else if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.consentDenied){

            if(newState !== MainRoutingPipeline._PIPELINESTATES.complete){

                throwStateTransitionError(this.currentPipelineState, `${MainRoutingPipeline.getNameofPipelineState(MainRoutingPipeline._PIPELINESTATES.complete)}`);
            }
        }

        //Current state is cancelled. Only next valid state is consenting for the new route that cancelled the current build
        //However, actual consenting will be skipped
        else if(this.currentPipelineState === MainRoutingPipeline._PIPELINESTATES.cancelled){

            if(newState !== MainRoutingPipeline._PIPELINESTATES.consenting){

                throwStateTransitionError(this.currentPipelineState, `${MainRoutingPipeline.getNameofPipelineState(MainRoutingPipeline._PIPELINESTATES.complete)}`);
            }
        }

        //Initiate state transition with correct callbacks

        //Call the build state transition callback
        if(newState === MainRoutingPipeline._PIPELINESTATES.consenting){

            this.onStateConsent(args);
        } else if(newState === MainRoutingPipeline._PIPELINESTATES.consentDenied){

            this.onStateConsentDenied(args);
        } else if(newState === MainRoutingPipeline._PIPELINESTATES.buildStarting){

            this.onStateBuildStarting(args);
        } else if(newState === MainRoutingPipeline._PIPELINESTATES.building){

            this.onStateBuilding(args);
        } else if(newState === MainRoutingPipeline._PIPELINESTATES.cancelled){

            this.onStateBuildCancelled(args);
        } else if(newState === MainRoutingPipeline._PIPELINESTATES.complete){

            this.onStateComplete(args);
        }

        function throwStateTransitionError(currentState, nextValidStates){

            const msg = `Cannot transition the build pipeline from ${MainRoutingPipeline.getNameofPipelineState(currentState)} to ${MainRoutingPipeline.getNameofPipelineState(newState)}. Next valid state is ${nextValidStates}`;
            throw new Error(msg);
        }
    }

    /**
     * 
     * @param {RouteBuildPipelineArgs} argsOLD
     * @param {BuildStatePipelineArgs} args 
     */
    onStateConsent(args){

        //Update state
        this.currentPipelineState = MainRoutingPipeline._PIPELINESTATES.consenting;

        //Inflate the target route entry
        const inflationInfo = this.targetRouteEntryUtils.inflateTargetRouteEntry(args);

        //Create extended data
        args.extendedData = {};

        //Get the route params
        args.extendedData.routeParams = RouteParamsUtil.getParams(args.targetRouteEntry.route, args.fullURL);

        if(!args.skipConsentFromCancel){ //a finalized cancel call doesn't need consent run. It never finished 

            //Consent stack NEVER empty
            //We have consents to ask
            //Use the destroy stack to request full destruction after receiving all consents
            //NEW - Getting states when consent approved. Not destroy
            this.requestConsent(inflationInfo, () => {

                //Denied. Transition state to consent denied
                this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.consentDenied, args);
            }, (consentGivenStack) => {

                //Tell those not on destroy stack to reset consent to running through fragmentMaintained, which calls routeMaintained since similar logic
                resetConsentStateForNonDestroy();
                //All accepted. Ask all to destroy now
                this.requestDestroy(inflationInfo.destroyStack, () => {

                    //Transition to buildStarting
                    this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.buildStarting, args);
                });

                function resetConsentStateForNonDestroy(consentGivenStackCopy = consentGivenStack.reverseCopy()){

                    if(!consentGivenStackCopy.isEmpty()){

                        /**
                         * @type {AppMainFragmentInstance}
                         */
                        const targetFragment = consentGivenStackCopy.pop().fragment;
                        if(!inflationInfo.destroyStack.contains(targetFragment)){

                            //routeMaintained logic resets the state as we need
                            targetFragment.localPipelineWorker.routeMaintained();
                        }

                        resetConsentStateForNonDestroy(consentGivenStackCopy);
                    }
                }
            }, new Stack(), { newRouteParams: args.extendedData.routeParams });
        } else {

            //Transition direct to buildStarting
            this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.buildStarting, args);
        }
    }

    /**
     * Used to request consent for changing route from fragments. Fragments will ask attached view panels
     * So, might be same base route but different query to change view panel, hosted by any fragment in tree, so
     * need to ask if ok.
     * Therefore, more fluid structure since view panels can be popped anywhere and consent if a simple param or query change
     * Can be used for floating panels changing data based on param or query, used by specific fragment.
     * Basically, better, more fluid design
     * 
     * @typedef ConsentGivenInfo
     * @property {AppMainFragmentInstance} fragment
     * @property {SavedFragmentState} savedState
     * 
     * @param {InflatedTargetRouteEntryInfo} inflationInfo 
     * @param {genericFunction} onConsentDeniedCb 
     * @param {genericParamFunction<Stack<ConsentGivenInfo>>} onConsentGivenCb 
     * @param {Stack<ConsentGivenInfo>} consentGivenStack
     * @param {NewRouteConsentInfo} newRouteInfo
     */
    requestConsent(inflationInfo, onConsentDeniedCb, onConsentGivenCb, consentGivenStack, newRouteInfo){

        if(!inflationInfo.consentStack.isEmpty()){

            //Continue with this. Recursive and should work well.
            const targetFragment = inflationInfo.consentStack.pop();
            targetFragment.localPipelineWorker.getRouteChangeConsent((consentParams) => {

                if(consentParams.consent){

                    //Add this fragment to the consentGivenStack in case we have to maintain routes because a parent has denied destruction of the route
                    consentGivenStack.push({ fragment: targetFragment, savedState: consentParams.savedState });
                    this.requestConsent(inflationInfo, onConsentDeniedCb, onConsentGivenCb, consentGivenStack, newRouteInfo);
                } else {

                    console.warn(`Route change consent denied by fragment with viewID ${targetFragment.viewID} for route ${this.targetRouteEntryUtils.currentInflatedTargetRouteEntry.fullURL}`);
                    //Tell the previously consented that the route is being maintained
                    maintainRoutes();
                    onConsentDeniedCb();
                }
            }, { ...newRouteInfo, fragToBeDestroyed: inflationInfo.destroyStack.contains(targetFragment) });
        } else {

            //Final recursive call to a cleared consent stack. So accepted completely
            //Save states since route change fully consented
            saveFragmentStates(this);
            onConsentGivenCb(consentGivenStack);
        }

        function maintainRoutes(){

            if(!consentGivenStack.isEmpty()){

                consentGivenStack.pop().fragment.localPipelineWorker.routeMaintained();
                maintainRoutes();
            }
        }

        /**
         * 
         * @param {MainRoutingPipeline} mainRoutingPipelineRef 
         */
        function saveFragmentStates(mainRoutingPipelineRef, consentGivenStackCopy = consentGivenStack.copy()){

            if(!consentGivenStackCopy.isEmpty()){

                mainRoutingPipelineRef.targetRouteEntryUtils.saveRouteStates(consentGivenStackCopy.pop().savedState);
                saveFragmentStates(mainRoutingPipelineRef, consentGivenStackCopy);
            }
        }
    }

    /**
     * 
     * @param {Stack<AppMainFragmentInstance>} destroyFragmentStack
     * @param {genericFunction} cb
     */
    requestDestroy(destroyFragmentStack, cb){

        if(!destroyFragmentStack.isEmpty()){

            destroyFragmentStack.pop().localPipelineWorker.destroyFragment(() => {

                this.requestDestroy(destroyFragmentStack, cb);
            });
        } else{

            cb();
        }
    }

    
    /**
     * 
     * @param {RouteBuildPipelineArgs} args 
     */
    onStateConsentDenied(args){

        this.currentPipelineState = MainRoutingPipeline._PIPELINESTATES.consentDenied;

        //Tell TargetRouteEntryUtils to flush temps
        this.targetRouteEntryUtils.flushTemps();

        //Handle any popEvent that may have been denied
        if(args.popEvent && args.popEvent.hasPopped){

            if(args.popEvent.isBack){

                this.mainRouter._popIgnoreCallback();
                window.history.forward();
            } else {

                this.mainRouter._popIgnoreCallback();
                window.history.back();
            }
        }

        //Transition to complete
        this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.complete, args);
    }

    /**
     * 
     * @param {BuildStatePipelineArgs} args 
     */
    onStateBuildStarting(args){

        //Indicate new state
        this.currentPipelineState = MainRoutingPipeline._PIPELINESTATES.buildStarting;

        //Extended data now needed during consent
        if(!args.extendedData){

            //Create extended data
            args.extendedData = {};
            console.error("HAD TO CREATE EXTENDED DATA. CONSENT BEING SKIPPED??")
        }

        //Tell TargetRouteEntryUtils to consolidate entries i.e move them from temporary to permanent as new route confirmed
        //Returns the inflatedRouteInfo to build from and the savedState if popping to back
        const inflatedRouteBuildInfo = this.targetRouteEntryUtils.consolidateTargetRouteEntry(args);

        //Get the saved state
        args.extendedData.savedState = inflatedRouteBuildInfo.savedState;

        if(!args.extendedData.routeParams){
            
            //Get the route params
            args.extendedData.routeParams = RouteParamsUtil.getParams(args.targetRouteEntry.route, args.fullURL);
        }
        
        //Get the build stack
        args.extendedData.buildStack = getBuildStack();

        //Update activeBuildInfo to help in cancelling
        this.activeBuildInfo.buildStack = args.extendedData.buildStack;

        //Transition to building
        this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.building, args);

        function getBuildStack(){

            /**
             * @type {Stack<AppMainFragmentInstance>}
             */
            let buildStack = new Stack();
            const inflatedChildren = inflatedRouteBuildInfo.inflatedRoutingInfo.inflatedNestedChildFragments;
            //Start with children from last to first (since stacks are LIFO)
            for(let i = inflatedChildren.length - 1; i >= 0; i--){

                buildStack.push(inflatedChildren[i]);
            }
            //Push target
            buildStack.push(inflatedRouteBuildInfo.inflatedRoutingInfo.inflatedTarget);

            return buildStack;
        }
    }

    /**
     * State callback for transition to building
     * 
     * @param {BuildStatePipelineArgs} args 
     */
    onStateBuilding(args){

        //Indicate new state 
        this.currentPipelineState = MainRoutingPipeline._PIPELINESTATES.building;

        //Push state
        if(!args.stateInfo.skipPushState){

            //Push new state to the window's history, after normalizing
            const newHistoryState = args.stateInfo.newHistoryState;
            window.history.pushState(newHistoryState, newHistoryState.pageTitle, args.stateInfo.rootUrl);     
        }

        //Update state
        this.mainRouter.onStateUpdate();

        //Run the build
        this.buildFragments(args); 
    }

    /**
     * WORK ON THIS NEXT
     * 
     * BUILD FRAGMENTS FIRST
     * @param {RouteBuildPipelineArgs} args 
     */
    onStateBuildCancelled(args){

        //Indicate new state
        this.currentPipelineState = MainRoutingPipeline._PIPELINESTATES.cancelled;

        //Clear activeBuildInfo
        this.clearActiveBuildInfo();

        //If we have a cancelBuildStack, invoke it
        cancelPreviousBuilds(this.activeBuildInfo.cancelBuildStack, () => {

            //TELL ARGS THAT ACTUAL CONSENTING SHOULD BE SKIPPED SINCE COMING FROM A CANCEL BUILD
            args.skipConsentFromCancel = true;
            this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.consenting, args);
        });

        /**
         * 
         * @param {Stack<AppMainFragmentInstance>} cancelBuildStack 
         * @param {genericFunction} cb
         */
        function cancelPreviousBuilds(cancelBuildStack, cb){

            if(!cancelBuildStack.isEmpty()){

                cancelBuildStack.pop().localPipelineWorker.cancelFragmentRoute(() => {

                    cancelPreviousBuilds(cancelBuildStack, cb);
                });
            } else {

                cb();
            }
        }
    }

    /**
     * 
     * @param {RouteBuildPipelineArgs} args 
     */
    onStateComplete(args){

        //Indicate new state
        this.currentPipelineState = MainRoutingPipeline._PIPELINESTATES.complete;

        //Clear activeBuildInfo
        this.clearActiveBuildInfo(true);

        //Update main router?
    }

    /**
     * 
     * @param {BuildStatePipelineArgs} args
     */
    buildFragments(args){

        if(localBuildStackValid(this.activeBuildInfo.buildStack)){ //This first check might not be necessary since calls in active thread

            //Run only if build not cancelled thus activeBuildInfo's build stack matches this build
            //Have to do this because of the asynchronous nature of the build. Thus, state might have changed by the time we get a callback so should not continue building this stack
            if(!args.extendedData.buildStack.isEmpty()){

                const targetFragment = args.extendedData.buildStack.pop();
                this.activeBuildInfo.cancelBuildStack.push(targetFragment);
                targetFragment.localPipelineWorker.buildFragmentRoute(args.extendedData.routeParams, args.extendedData.savedState, args.routeBuildPipelineDataArgs, () => {
    
                    //Doing a check here because this is a callback that might be made when the state has changed to cancelled
                    if(localBuildStackValid(this.activeBuildInfo.buildStack)){
                        
                        //Doing scroll restoration here. Check using targetFragment for any targets or scroll restoration
                        //Applied only for last fragment in stack. Therefore, build stack should be empty
                        if(args.extendedData.buildStack.isEmpty() && (args.routeBuildPipelineDataArgs ? !args.routeBuildPipelineDataArgs.skipScrollStateRestore : true)){

                            /**
                             * @type {ExtSpecSavedFragmentState}
                             * 
                             * Creating a default to always run. Otherwise fails to restore to top for new inflation with no saved state
                             */
                            const fragSavedState = args.extendedData.savedState ? args.extendedData.savedState[targetFragment.viewID] : { scrollPos: { x: 0, y: 0 } };
                            // console.warn("SAVED STATE " + targetFragment.viewID);
                            // console.log(fragSavedState);
                            fragSavedState.target = args.extendedData.routeParams.target;
                            //Prioritize scroll position
                            //Last check will prioritize target if provided and scrollPos x and y zero. Thus, a click to a target
                            if(!fragSavedState.target || (fragSavedState.target && fragSavedState.scrollPos.x > 0 && fragSavedState.scrollPos.y > 0)){

                                // console.warn("SAVED STATE: Restored default");
                                document.body.scroll({

                                    top: fragSavedState.scrollPos.y,
                                    left: fragSavedState.scrollPos.x,
                                    behavior: "smooth"
                                });
                            } else if(fragSavedState.target){

                                //Smooth scroll to target
                                try{

                                    document.getElementById(`${fragSavedState.target}`).scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center'
                                    });
                                } catch(err) {

                                    console.error(err);
                                }
                            }
                        } 
                        this.buildFragments(args);
                    }
                });
            } else {
    
                //Inform main router pipeline complete?
                this.transitionPipelineState(MainRoutingPipeline._PIPELINESTATES.complete);
            }
        } else {
            
            console.error("This local build stack is no longer valid");
        }

        function localBuildStackValid(globalBuildStack){

            return args.extendedData.buildStack === globalBuildStack;
        }
    }

    /**
     * Clears the buildStack only. cancelStack cleared after cancelling build
     * @param {boolean} clearCancel
     */
    clearActiveBuildInfo(clearCancel){

        this.activeBuildInfo.buildStack = null;
        if(clearCancel){

            this.activeBuildInfo.cancelBuildStack.clear();
        }
    }
}

/**
 * Class for TargetRouteEntry manager
 * 
 * Handles Target Route Entry inflation
 * 
 * First compares new and current target route entry, establishes the fragments that should 
 * only be inflated, inflates from that index, merges previous to create new inflated entries, consent array, and 
 * flushes to current after confirmed
 */

/**
 * Let's talk about the data type below. What necessitates it? Especially given that the extended routing info
 * already has the saved fragment state.
 * 
 * Well, one word - references. Even if I cloned the saved fragment state when saving it to the extended routing info,
 * its still saved as a reference. Now, that object, named currentTargetRouteEntry, is COMPLEX. Creating a copy
 * of it is difficult and potentially expensive computationally and more significantly memory-wise.
 * So, the logical thing to do is create a second variable in the stack that stores the cloned or copied
 * savedFragmentState. Now, that would not be corrupted by being a reference to the currentTargetRouteEntry
 * 
 * I know, references can be a b***
 */
/**
 * @typedef HistoryStackData
 * @property {ExtendedRoutingInfo} routingInfo
 * @property {SavedFragmentState} clonedState
 */
class TargetRouteEntryUtils{

    /**
     * 
     * @param {MainRouter} mainRouterInstance 
     */
    constructor(mainRouterInstance){

        this.mainRouter = mainRouterInstance;
        /**
         * Has a valid value only when route is different
         * 
         * @type {RoutingInfo}
         */
        this.tempTargetRouteEntry = null;
        /**
         * @type {ExtendedRoutingInfo}
         */
        this.currentTargetRouteEntry = null;
        /**
         * 
         * @type {{ backTargetRouteEntryStack: Stack<HistoryStackData>, forwardTargetRouteEntryStack: Stack<HistoryStackData> }}
         * 
         * Holds previous entries used in back pop to get data for restoration of state
         * Updated on consolidation, but sent back in consolidation data before pop, if url given for new inflated EXACTLY matches previous and is a pop (back event specifically). 
         * If not, then state not saved and warn (should not be the case btw, if state well saved. Or maybe opened the app afresh)
         */
        this.historyStack = {

            /**
             * @type {Stack<ExtendedRoutingInfo>}
             */
            backTargetRouteEntryStack: new Stack(),
            forwardTargetRouteEntryStack: new Stack()
        }
        this.prevTargetRouteEntryStack = new Stack();

        /**
         * Has a valid value only when route is different
         * 
         * @type {InflatedRoutingInfo}
         */
        this.tempInflatedTargetRouteEntry = null;
        /**
         * @type {InflatedRoutingInfo}
         */
        this.currentInflatedTargetRouteEntry = null;
    }

    static get _DEFAULT_CHILD_DIFF_INDEX(){

        return -1;
    }

    /**
     * @param {string} fullUrl
     * @returns {InflatedRoutingInfo}
     */
    static defaultInflatedTargetRouteEntry(fullUrl){

        return {

            inflatedTarget: null,
            inflatedNestedChildFragments: [],
            fullURL: fullUrl
        }
    }

    /**
     * @typedef {{ consentStack: Stack<AppMainFragmentInstance>, destroyStack: Stack<AppMainFragmentInstance> }} InflatedTargetRouteEntryInfo
     * Inflates the target route entry
     * @param {RouteBuildPipelineArgs} args 
     * @returns {InflatedTargetRouteEntryInfo}
     */
    inflateTargetRouteEntry(args){

        //Generate consentStack and destroyStack
        /**
         * @type {InflatedTargetRouteEntryInfo}
         */
        let inflationInfo = {};
        inflationInfo.consentStack = new Stack();
        inflationInfo.destroyStack = new Stack();
        //Compare new entry from current and determine changes i.e childDiffIndex
        const diffTargetEntryInfo = this.getDiffTargetEntry(args.targetRouteEntry);

        //Inflate entries based on diffInfo
        if(diffTargetEntryInfo.inflationOverhaul){

            //Store in temp
            this.tempInflatedTargetRouteEntry = getInflatedTargetRouteEntry({ mainRouterInstance: this.mainRouter });

            if(this.currentInflatedTargetRouteEntry){

                //A route existed. Being overhauled
                inflationInfo.destroyStack = populateDestroyStack({

                    prevTarget: this.currentInflatedTargetRouteEntry.inflatedTarget,
                    prevNestedChildFragments: this.currentInflatedTargetRouteEntry.inflatedNestedChildFragments
                });
            }

        } else {

            /**
             * Not an overhaul.
             * 
             * Algorithm works such as if childDiffIndex not default value, then Target and a few or all nested children match
             * Else, if default value then probably clicked on same route. So, no need for an inflated route entry or destroy stack
             */
            if(diffTargetEntryInfo.childDiffIndex !== TargetRouteEntryUtils._DEFAULT_CHILD_DIFF_INDEX){

                //Store in temp
                this.tempInflatedTargetRouteEntry = getInflatedTargetRouteEntry({
                    
                    mainRouterInstance: this.mainRouter,
                    prevTarget: this.currentInflatedTargetRouteEntry.inflatedTarget,
                    currentInflatedNestedChildFragments: this.currentInflatedTargetRouteEntry.inflatedNestedChildFragments
                });

                inflationInfo.destroyStack = populateDestroyStack({

                    prevNestedChildFragments: this.currentInflatedTargetRouteEntry.inflatedNestedChildFragments
                });
            }
        }

        //populate destroy stack for only when we need it, and that is childDiffIndex === -1 - nope
        //populate destroy stack always, so that we always ask for consent.
        if(this.currentInflatedTargetRouteEntry){ //&& diffTargetEntryInfo.childDiffIndex !== TargetRouteEntryUtils._DEFAULT_CHILD_DIFF_INDEX

            //Build the consent stack. Similar to a destroyStack with ALL fragments
            inflationInfo.consentStack = populateDestroyStack({

                prevTarget: this.currentInflatedTargetRouteEntry.inflatedTarget,
                prevNestedChildFragments: this.currentInflatedTargetRouteEntry.inflatedNestedChildFragments
            });
        }
        
        return inflationInfo;

        /**
         * @typedef InflationArgs
         * @property {AppMainFragmentInstance} prevTarget
         * @property {AppMainFragmentInstance[]} currentInflatedNestedChildFragments
         * @property {MainRouter} mainRouterInstance
         * 
         * @param {InflationArgs} inflationArgs 
         * 
         * @returns {InflatedRoutingInfo}
         */
        function getInflatedTargetRouteEntry(inflationArgs){

            //Have the inflatedTargetRouteEntry ready
            const inflatedTargetRouteEntry = TargetRouteEntryUtils.defaultInflatedTargetRouteEntry(args.fullURL);
            //Default start index at 0
            let newInflationStartIndex = Math.max(0, diffTargetEntryInfo.childDiffIndex);

            //Inflate target - build fragments
            inflatedTargetRouteEntry.inflatedTarget = diffTargetEntryInfo.inflationOverhaul ? args.targetRouteEntry.target.buildFragment(inflationArgs.mainRouterInstance) : inflationArgs.prevTarget;
            //Copy children, if any, up to, but not including, childDiffIndex
            if(diffTargetEntryInfo.childDiffIndex !== TargetRouteEntryUtils._DEFAULT_CHILD_DIFF_INDEX){

                for(let i = 0; i < diffTargetEntryInfo.childDiffIndex; i++){

                    inflatedTargetRouteEntry.inflatedNestedChildFragments.push(inflationArgs.currentInflatedNestedChildFragments[i]);
                }
            }

            //Inflate new children
            for(let i = newInflationStartIndex; i < args.targetRouteEntry.nestedChildFragments.length; i++){

                inflatedTargetRouteEntry.inflatedNestedChildFragments.push(args.targetRouteEntry.nestedChildFragments[i].buildFragment(inflationArgs.mainRouterInstance));
            }


            return inflatedTargetRouteEntry;
        }

        /**
         * ALGO CHANGE. Everyone in changing route MUST consent, even if not necessarily being destroyed
         * So, viewing routes as states. So, two routes with same nested frags might still be different states,
         * and developer may want to consent the change in states
         * 
         * So, below algo is new for populateDestroyStack? Yes...
         * 
         * @typedef ConsentStackArgs
         * @property {AppMainFragmentInstance} prevTarget
         * @property {AppMainFragmentInstance[]} prevNestedChildFragments
         * 
         * @param {ConsentStackArgs} destroyStackArgs 
         */
        function populateDestroyStack(destroyStackArgs = {}){

            /**
             * @type {Stack<AppMainFragmentInstance>}
             */
            let destroyStack = new Stack();
            let childrenDestroyStartIndex = diffTargetEntryInfo.inflationOverhaul ? 0 : Math.max(0, diffTargetEntryInfo.childDiffIndex);
            if(destroyStackArgs.prevTarget){

                //Put target in stack
                destroyStack.push(destroyStackArgs.prevTarget);

            }
            //Put nested children in stack
            for(let i = childrenDestroyStartIndex; i < destroyStackArgs.prevNestedChildFragments.length; i++){

                destroyStack.push(destroyStackArgs.prevNestedChildFragments[i]);
            }

            return destroyStack;
        }
    }

    /**
     * INTERNAL
     * 
     * Purpose of algo is to determine from where we'll start inflating new fragments
     * 
     * Return the diff and diffInfo? ie. { diffTargetEntry, childDiffIndex }
     * If childDiffIndex is not undefined (-1), then use currentInflatedTargetRouteEntry 
     * to source target and all inflated children before index, then add to array inflated children
     * from childDiffIndex to end of diffTargetEntry nestedChildren array inclusive childDiffIndex
     * @param {RoutingInfo} targetRouteEntry 
     * @returns {DiffTargetEntryInfo}
     */
    getDiffTargetEntry(targetRouteEntry){

        //Save targetRouteEntry as temp
        this.tempTargetRouteEntry = targetRouteEntry;
        /**
         * This is the first route on app launch. Therefore, no currentTargetRouteEntry
         * 
         * OR
         * 
         * The targets are different. Therefore, totally different routing infos
         * 
         * O-js routing based on route similarities from head to tail i.e route/sth/here ~ route/sth/elsewhere !== go/sth/here
         * Where, for route/sth/here
         *              route -> target
         *              [sth, here] -> nested child fragments in order of route progression
         */
        if(!this.currentTargetRouteEntry || this.currentTargetRouteEntry.target !== targetRouteEntry.target){

            return {

                inflationOverhaul: true,
                childDiffIndex: TargetRouteEntryUtils._DEFAULT_CHILD_DIFF_INDEX
            }
        } else {

            /**
             * currentTargetRouteEntry exists and targets match with new targetRouteEntry 
             * 
             * Find the childDiffIndex.
             * 
             * childDiffIndex can be -1 if all match i.e a repeated route (proly caused by clicking same navigation)
             * For this case, still call build. Might be params or queries different
             */
            let childDiffIndex = TargetRouteEntryUtils._DEFAULT_CHILD_DIFF_INDEX;
            const currentNestedChildren = this.currentTargetRouteEntry.nestedChildFragments;
            const newNestedChildren = targetRouteEntry.nestedChildFragments;
            for(let i = 0; i < newNestedChildren.length; i++){

                /**
                 * What happens if i > last index of currentNestedChildren? 
                 * (i.e) longer route than previous (route/to/here vs /route/to)
                 * 
                 * currentNestedChildren.length === i will avoid currentNestedChildren[i] giving index out of bounds
                 * error. Will return i still. Otherwise, if within bounds, check per index
                 */
                if(currentNestedChildren.length === i || currentNestedChildren[i] !== newNestedChildren[i]){

                    childDiffIndex = i;
                    break;
                }
            }

            //If childIndex still -1, route repeat. No difference
            if(childDiffIndex === TargetRouteEntryUtils._DEFAULT_CHILD_DIFF_INDEX){

                console.warn("Making a same route build. Params or queries might be the difference");
                //Remove tempTargetRouteEntry since same as current
                // this.tempTargetRouteEntry = null; No longer doing this because even param changes mean different state
                return {

                    inflationOverhaul: false,
                    childDiffIndex: TargetRouteEntryUtils._DEFAULT_CHILD_DIFF_INDEX
                }
            } else {

                return {

                    inflationOverhaul: false,
                    childDiffIndex: childDiffIndex
                }
            }
        }
    }

    /**
     * 
     * @param {SavedFragmentState} savedState 
     */
    saveRouteStates(savedState){

        this.currentTargetRouteEntry.savedFragmentState = { ...this.currentTargetRouteEntry.savedFragmentState, ...savedState };
    }

    /**
     * Removes all temps
     */
    flushTemps(){

        this.tempTargetRouteEntry = null;
        this.tempInflatedTargetRouteEntry = null;
    }

    /**
     * @param {RouteBuildPipelineArgs} args
     * 
     * @returns {RouteBuildInfo}
     */
    consolidateTargetRouteEntry(args){

        /**
         * @type {RouteBuildInfo}
         */
        let buildInfo = {};
        //Deal with a few issues here
        args.popEvent = args.popEvent ? args.popEvent : {};

        //Changes all temps to null, flushes temp to current
        //Can use this later to add fullRunningURL to help match prev with data and return to states if arg has back as pop argument?
        //temp null if repeating route (repeating routes don't get to save states since no one is destroying - BAD. Still had a state based on current params)
        //Handle pop events
        if(args.popEvent.hasPopped){

            if(args.popEvent.isBack){

                //We are moving back
                const lastBackRouteEntry = this.historyStack.backTargetRouteEntryStack.peek();
                //Get saved state
                if(!this.historyStack.backTargetRouteEntryStack.isEmpty() && args.fullURL === lastBackRouteEntry.routingInfo.fullURL){

                    //Get the saved state from previous back entry
                    // console.warn("Detected back pop. Taking previous state");
                    buildInfo.savedState = lastBackRouteEntry.clonedState;
                }
                //Pop previous back
                this.historyStack.backTargetRouteEntryStack.pop();
                //Save current to the forward stack
                this.historyStack.forwardTargetRouteEntryStack.push({ routingInfo: this.currentTargetRouteEntry, clonedState: ObjectsUtils.copy().json(this.currentTargetRouteEntry.savedFragmentState) });

                // console.log("Moved back now forward with " + this.historyStack.forwardTargetRouteEntryStack.size());
                console.log(this.historyStack.forwardTargetRouteEntryStack.peek().savedFragmentState);
            } else {

                //We are moving forwards
                const lastForwardRouteEntry = this.historyStack.forwardTargetRouteEntryStack.peek();
                //Get saved state
                if(!this.historyStack.forwardTargetRouteEntryStack.isEmpty() && args.fullURL === lastForwardRouteEntry.routingInfo.fullURL){

                    //Get the saved state from previous forward entry
                    // console.warn("Detected forward pop. Taking previous forward state - HANDLE THIS");
                    buildInfo.savedState = lastForwardRouteEntry.clonedState;
                }
                //Pop previous forward
                this.historyStack.forwardTargetRouteEntryStack.pop();
                //Save current to the back stack
                this.historyStack.backTargetRouteEntryStack.push({ routingInfo: this.currentTargetRouteEntry, clonedState: ObjectsUtils.copy().json(this.currentTargetRouteEntry.savedFragmentState) });
            }
        } else {

            //Not a pop event. Normal flow
            // console.warn("Not a pop event. Normal flow");
            if(this.currentTargetRouteEntry){

                //Not a first route build. Avoiding to push null
                // console.warn("Pushing to back");
                this.historyStack.backTargetRouteEntryStack.push({ routingInfo: this.currentTargetRouteEntry, clonedState: ObjectsUtils.copy().json(this.currentTargetRouteEntry.savedFragmentState) });

                //Clear forward entries. A new forward will be created when going back
                this.historyStack.forwardTargetRouteEntryStack.clear();
            }
        }
        //Switch over current to temp
        this.currentTargetRouteEntry = this.tempTargetRouteEntry;

        //Save full URL
        this.currentTargetRouteEntry.fullURL = args.fullURL;
        //Doing this cause same routes will have no temp inflated. Same (will be) inflated but params different
        //so, current will not change. Else, will change to newly inflated. YES
        if(this.tempInflatedTargetRouteEntry){

            this.currentInflatedTargetRouteEntry = this.tempInflatedTargetRouteEntry;
        }
        this.flushTemps();
        buildInfo.inflatedRoutingInfo = this.currentInflatedTargetRouteEntry;

        // console.warn("RETRIEVED BUILD STATE");
        // console.log(buildInfo.savedState);

        return buildInfo;
    }
}

export default MainRoutingPipeline;