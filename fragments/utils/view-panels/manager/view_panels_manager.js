//@ts-check
import GenericBuildPipelineWorker from "../../../../utils/generic-pipeline-worker/generic_build_pipeline_worker";
import ExclusiveStack from "../../../../utils/abstract-data-types/exclusive-stack/exclusive_stack_adt";
import Stack from "../../../../utils/abstract-data-types/stack/stack_adt";
import RandomNumberCharGenUtils from "../../../../utils/random-number-generator/random_number_char_generator";

/**
 * Class responsible for spawning/inflating view panels. Can do so for multiple at once. So, allow asynchronous work
 * Will seek consent for those to be destroyed.
 */

class ViewPanelsManager{

    /**
     * Start here. Implement ViewPanelManager.buildFromQueries. Cascades to children
     * @param {ViewPanelsManagerConstructorArgs} args 
     */
    constructor(args){

        /**
         * @type {OrderedViewPanelsManagerWatchQueries}
         */
        this.routeWatchQueries = buildWatchQueriesAndPanelDefinition(args.routeWatchQueries, true);
        /**
         * @type {PanelNameDefinitions}
         */
        this.panelNameDefinitions = buildWatchQueriesAndPanelDefinition(args.panelNameDefinitions, false);

        /**
         * @type {import("ViewPanelsManager").MasterViewPanelInfoUtils}
         */
        this.masterViewPanelInfoUtils = {

            /**
             * Should be a map, more complex than this. Map with stack value (call it RunningViewPanelInfo?)
             * For root parent just stack of all children (like main routing pipeline does) Don't reinflate in stack. Still type RunningViewPanelInfo
             * 
             * The string is a context argument, allowing more advanced exclusive non-exclusive working.
             * Same key, override contents (exclusive). Otherwise, inflate different (non-exclusive)
             * Context can be left when defining ViewPanelsManagerWatchQueries. Random string used. Thus, non-exclusive.
             */
            activeViewPanels: new Map(),
            /**
             * Updated once a view panel has been inflated. Rest referenced from stack
             */
            exclusiveMapKeyStack: new ExclusiveStack(),
            addMasterViewPanelInfo: (masterInfo) => {

                if(!masterInfo || !masterInfo.key || !masterInfo.runningViewPanelInfo){

                    throw new Error(`Master view panel info incomplete`);
                } else {

                    //Set state as building
                    masterInfo.runningViewPanelInfo.currentState = "building";
                    this.masterViewPanelInfoUtils.activeViewPanels.set(masterInfo.key, masterInfo.runningViewPanelInfo);
                    this.masterViewPanelInfoUtils.exclusiveMapKeyStack.push(masterInfo.key);
                }
            },
            deleteMasterViewPanelInfo: (key) => {

                if(!this.masterViewPanelInfoUtils.activeViewPanels.get(key)){

                    console.error(`No running view panel info exists for key`);
                } else {

                    this.masterViewPanelInfoUtils.activeViewPanels.delete(key);
                    this.masterViewPanelInfoUtils.exclusiveMapKeyStack.sortDelete(key);
                }
            },
            /**
             * @param {string} key
             * @param {import("ViewPanelsManager").RunningViewPanelInfoStates} state 
             */
            updateMasterViewPanelInfoState: (key, state) => {

                if(!this.masterViewPanelInfoUtils.activeViewPanels.get(key)){

                    console.error(`No running view panel info exists for key $key`);
                } else{

                    this.masterViewPanelInfoUtils.activeViewPanels.get(key).currentState = state;
                }
            }
        }

        /**
         * @type {import("ViewPanelsManager").FragmentLifeCycleObjectType}
         */
        this.fragmentLifeCycleObject = args.fragmentLifeCycleObject;
        this.mainRouterInstance = args.mainRouterInstance;

        /**
         * @type {import("./types/view_panels_manager_build_pipeline.d.ts").ViewPanelsManagerMainBuildPipelineInstance<ViewPanelsManagerBuildPipelineStates, ViewPanelsManagerBuildPipelineStartBuildArgs, ViewPanelsManagerDFAGroups, null>}
         */
        this.mainViewPanelBuildPipeline = new ViewPanelsManagerMainBuildPipeline({ viewPanelsManager: this });

        /**
         * 
         * Use every() for arrays?
         * @param {OrderedViewPanelsManagerWatchQueries} definition
         * @param {boolean} isRouteBuilt
         * @throws Matching parent or children panelIDs or query (Children parent specific - so, two unique parents can share)
         * @returns { OrderedViewPanelsManagerWatchQueries }
         * 
         */
        function buildWatchQueriesAndPanelDefinition(definition, isRouteBuilt){

            if(definition){

                polyfillWatchQueriesContext();
                return definition;
            } else {

                return {};
            }

            function polyfillWatchQueriesContext(){

                for(let query in definition){

                    if(!isRouteBuilt){

                        definition[query].context = RandomNumberCharGenUtils.generateRandomNumChar(6);
                    } else {

                        definition[query].context = ViewPanelsManager.RouteBuiltContext;
                    }
                }
            }
        }
    }

    static get RouteBuiltContext(){

        return "routeBuilt";
    }

    static get ViewPanelsManagerSavedStateKey(){

        return "PanelsSavedStatesCollection";
    }

    /**
     * 
     * Open routeBuilt view panels. Uses OrderedViewPanelsManagerWatchQueries to select the view panel to open
     * 
     * @returns {string} inflationID - value of context basically
     * 
     * Flow algo like pipeline. 
     * 
     * *************
     * CONSIDER - Using the algo here to inflate fragments. So, maintain a route stack. Sounds nice. Cause this algo is much simple imo
     * @todo
     * *************
     * @type {ViewPanelsManagerInstance['openViewPanel']}
     */
    openViewPanel(args){

        /**
         * @type {MatchingRootViewPanelInfo}
         */
        let viewPanelRootInfo = null;
        /**
         * @type {RunningViewPanelInfo}
         */
        let runningViewPanelInfo;
        /**
         * @type {string}
         */
        let panelID = null;

        try {

            viewPanelRootInfo = args.overrideMatchingPanelRootInfo ? args.overrideMatchingPanelRootInfo : this.findMatchingRootViewPanelInfo(args.routeParams.queries);
            if(viewPanelRootInfo){

                //Context is the map's key. Entries with no context had been polyfilled earlier
                //No need to find exclusive and delete then set new. Done automatically by Map.set()
                //Remember, had consented to this before and destroyed.
                //So, all routeBuilt will have panelID of routeBuilt. So easy to destroy any routeBuilt if need to. YEAP
                panelID = viewPanelRootInfo.rootQueryTree_Panel.context;

                //Check first if an entry with this route exists
                //If so, building on top of that. So, don't destroy already inflated record.
                const currentRunningViewPanelInfo = this.masterViewPanelInfoUtils.activeViewPanels.get(panelID);
                if(currentRunningViewPanelInfo){

                    //Set the right values
                    runningViewPanelInfo = currentRunningViewPanelInfo;
                } else {

                    //Set up our runningViewPanel info
                    runningViewPanelInfo = {

                        runningViewPanels: new Stack(),
                        runningQuery_PanelName_Stack: new Stack(),
                        rootQuery_PanelName: viewPanelRootInfo.matchingQuery_Name,
                    }
                }

                //Inflate needed view panels based on runningquerystack
                generateBuild(args.routeParams?.queries, this, () => {

                    /**
                     * Set master info
                     */
                    this.masterViewPanelInfoUtils.addMasterViewPanelInfo({ key: panelID, runningViewPanelInfo: runningViewPanelInfo });

                    //Now tell pipeline to do its ting. Using data still
                    this.mainViewPanelBuildPipeline.startViewPanelBuild({

                        panelStacks: {

                            buildStack: runningViewPanelInfo.runningViewPanels.copy(), //This, caused a bug! Always send a copy if you're keeping it. LOL
                        },
                        launchViewPanelParams: args,
                        buildID: panelID, //IMPORTANT. Use value of key map to always refer to the SAME build for all actions. Caused a big error with state resets
                        failStartCb: () => {

                            //DON'T DELETE, cause it might be an addition to existing
                        },
                        successCb: () => {

                            this.masterViewPanelInfoUtils.updateMasterViewPanelInfoState(panelID, "running");
                        }
                    });
                });

                //This will return after generate build because calls there synchronous. If promise, then before
                return panelID;
            } else {

                //No Queries. Destroy route built
                //Destroying direct cause must have consented for route to change to this, if exists
                /**
                 * DEVELOPER'S RESPONSIBILITY to ensure they had destroyed non route built associated with route built (on subsequent destruction)
                 */
                if(this.masterViewPanelInfoUtils.activeViewPanels.get(ViewPanelsManager.RouteBuiltContext)){

                    //Not doing the state check here cause this one cannot be destroyed directly.
                    //ONLY by route changes. And, had consented when route was changing as per main routing pipeline flow
                    //@ts-ignore
                    this.mainViewPanelBuildPipeline.destroyViewPanels({

                        destroyStack: this.masterViewPanelInfoUtils.activeViewPanels.get(ViewPanelsManager.RouteBuiltContext).runningViewPanels,
                        buildID: ViewPanelsManager.RouteBuiltContext,
                        completeCb: () => {

                            /**
                             * Delete master info. Panel destroyed
                             */
                            this.masterViewPanelInfoUtils.deleteMasterViewPanelInfo(ViewPanelsManager.RouteBuiltContext);
                        }
                    });
                }
            }
        } catch(err){

            /**
             * LOOK AT HOW TO FILTER SOME CONSOLE MESSAGES TO GO TO PRODUCTION IN WEBPACK
             */
            console.error(err);
            return null;
            /**
             * Report to build pipeline for fragment. 
             * No. Not reporting to build pipeline. Reporting only to caller via callback.
             * 
             * SO ADD A CALLBACK
             */
        }

        /**
         * Inflates necessary view panels, generates a new of runningViewPanels.
         * Then, new stack called as per normal build flow.
         * 
         * @param {RouteParams['queries']} queries //Was RouteQueryData ...tf!
         * @param {ViewPanelsManager} viewPanelsManagerReference
         * @param {genericFunction} completeCb
         */
        function generateBuild(queries, viewPanelsManagerReference, completeCb){

            //Generate new query stack based on passed queries
            /**
             * @type {Stack<string>}
             */
            const newQueryStack = generateNewQueryStack(viewPanelRootInfo.rootQueryTree_Panel.childrenWatchQueries);

            //Trim runningViewPanels in runningVIewPanelsInfo based on differences in new and old query stack
            trimRunningViewPanelsStack(() => {

                //Save new query stack to runnningViewPanelInfo
                runningViewPanelInfo.runningQuery_PanelName_Stack = newQueryStack;

                //Generate new runningViewPanelsStack based on newQueryStack
                generateCompleteRunningViewPanelsStack();

                completeCb();
            });

            /**
             * 
             * @param {ViewPanelsManagerChildrenWatchQueries} childrenWatchQueries 
             * @param {Stack<string>} builtQueryStack 
             * @returns {Stack<string>}
             */
            function generateNewQueryStack(childrenWatchQueries, builtQueryStack = null){

                if(!builtQueryStack){

                    builtQueryStack = new Stack();

                    //Matching query first push
                    builtQueryStack.push(viewPanelRootInfo.matchingQuery_Name);
                }
                if(childrenWatchQueries){

                    /**
                     * @type {string}
                     */
                    let matchingChildWatchQueryName = null;
                    for(let childWatchQuery in childrenWatchQueries){

                        if(queries[childWatchQuery]){
    
                            builtQueryStack.push(childWatchQuery);
                            matchingChildWatchQueryName = childWatchQuery;
                            break;
                        }
                    }

                    return generateNewQueryStack(childrenWatchQueries[matchingChildWatchQueryName].childrenWatchQueries, builtQueryStack);
                } else {

                    return builtQueryStack;
                }
            }

            /**
             * Removes consented and destroyed viewpanels from running stack
             * 
             * This doesn't just pop difference. It destroys it. Based on new workings. 
             * Or builds the destroy stack for pops. Better
             * @param {genericFunction} cb
             */
            function trimRunningViewPanelsStack(cb){

                const currentQueryStackCopy = runningViewPanelInfo.runningQuery_PanelName_Stack.copy();
                const newQueryStackCopy = newQueryStack.copy();
                /**
                 * @type {Stack<ViewPanelInstance<*, *>>}
                 */
                let destroyStack = new Stack();
                for(let i = 0; i < findPopNumber(); i++){

                    destroyStack.push(runningViewPanelInfo.runningViewPanels.pop());
                }

                //Destroy popped panels
                if(!destroyStack.isEmpty()){

                    //@ts-ignore Rest fields unneeded
                    viewPanelsManagerReference.mainViewPanelBuildPipeline.destroyViewPanels({

                        destroyStack: destroyStack.reverseCopy(), //Reversing so that panels in orignal order from last node
                        completeCb: () => {

                            cb();
                        }
                    });
                } else {

                    cb();
                }
                
                /**
                 * CHECK THIS Can modify this algorithm to generate consent stack
                 * 
                 * 
                 * Finds the number of view panels that need to be popped out of stack 
                 * i.e old and to be destroyed based on new rootQueryTree. Remember, had positively consented to destruction
                 * @param {number} popNumber 
                 * @returns 
                 */
                function findPopNumber(popNumber = 0){

                    if(currentQueryStackCopy.size() < newQueryStackCopy.size() && currentQueryStackCopy.size() > 0){

                        //Pop new by difference. Then check below using algo that assumes same stack size
                        //That's because, since the rootQueryTree is a single node tree, by data type definition,
                        //Number of queries MUST equal number of view panels.
                        //So, can safely ignore overflow in new query stack since those are non-inflated view panels.
                        //Use similar logic in main route build pipeline, using routes? But not data type enforced. Problem
                        //Instead, can have full route definition, then unique data type for ordering the fragments. YES
                        const newQueryStackCopyInitialSize = newQueryStackCopy.size();
                        for(let i = 0; i < newQueryStackCopyInitialSize - currentQueryStackCopy.size(); i++){

                            newQueryStackCopy.pop();
                        }
                    }
                    //No current stack, thus popping nil. Or, just additions on top, thus no pops. ONLY IF FIRST RUN
                    //SUBSEQUENT RUNS - May have exhausted currentQueryStackCopy, or got to a point where they match
                    if(currentQueryStackCopy.size() === 0 || currentQueryStackCopy.matches(newQueryStackCopy)){

                        //Works with this logic because it means new queries add to the existing stack, if first run
                        return popNumber;
                    } else {

                        currentQueryStackCopy.pop();
                        newQueryStackCopy.pop();
                        return findPopNumber(++popNumber);
                    }
                }
            }

            function generateCompleteRunningViewPanelsStack(){

                //Reversing so that we push new view panels correctly to existing stack based on queries
                const runningQueryStackReverseCopy = runningViewPanelInfo.runningQuery_PanelName_Stack.reverseCopy();
                //OLD calculation for skip runs. Broken imo. Skipping ALREADY INFLATED
                // inflateViewPanels(viewPanelRootInfo.rootQueryTree, runningViewPanelInfo.runningViewPanels.size() === 0 ? 0 : runningViewPanelInfo.runningQueryStack.size() - runningViewPanelInfo.runningViewPanels.size());
                inflateViewPanels(viewPanelRootInfo.rootQueryTree_Panel, runningViewPanelInfo.runningViewPanels.size());

                /**
                 * @todo ALGO POTENTIALLY BROKEN
                 * 
                 * @param {ViewPanelChildQueryTree} watchQuery 
                 * @param {number} skipRuns 
                 */
                function inflateViewPanels(watchQuery, skipRuns, runs = 1){

                    if(skipRuns < runs){

                        //Ensure we haven't inflated all of them, thus sizes now match
                        if(runningViewPanelInfo.runningQuery_PanelName_Stack.size() !== runningViewPanelInfo.runningViewPanels.size()){

                            runningViewPanelInfo.runningViewPanels.push(watchQuery.viewPanelBuilder.buildViewPanel({

                                panelQuery: runningQueryStackReverseCopy.pop(), //Popping so that we have the next query as tos for next operation
                                globalInflationID: panelID,
                                viewPanelsManager: viewPanelsManagerReference,
                                hostFragmentLifeCycleObject: viewPanelsManagerReference.fragmentLifeCycleObject
                            }));

                            //Still more to inflate.
                            if(runningQueryStackReverseCopy.size() > 0){

                                //Should not fail here. If so, algo problem
                                inflateViewPanels(watchQuery.childrenWatchQueries[runningQueryStackReverseCopy.peek()], skipRuns, ++runs);
                            }
                        }
                    } else {

                        //Popping because we don't need this tos. Popping order different for alternate algo above (if)
                        inflateViewPanels(watchQuery.childrenWatchQueries[runningQueryStackReverseCopy.pop()], skipRuns, ++runs);
                    }
                }
            }
        }
    }

    /**
     * Directly opens a view panel by name. These view panels are NOT route built
     * 
     * @type {ViewPanelsManagerInstance['openViewPanelByName']} 
     */
    openViewPanelByName(panelName, args){

        return this.openViewPanel({

            ...args,
            //@ts-ignore
            routeParams: {

                queries: {

                    [panelName]: panelName
                }
            }
        });
    }

    /**
     * Works same as open view panel by name, however, this view panel not in panelNameDefinitions
     * @type {ViewPanelsManagerInstance['directOpenViewPanel']}
     */
    directOpenViewPanel(panelBuilder, args){

        //Pass override matching view panel info. Uses this instead
        return this.openViewPanel({

            ...args,
            overrideMatchingPanelRootInfo: {

                rootQueryTree_Panel: {

                    viewPanelBuilder: panelBuilder,
                    context: RandomNumberCharGenUtils.generateRandomNumChar(4)
                },
                matchingQuery_Name: "direct"
            },
        });
    }

    /**
     * IMPLEMENT FAIL CB IN PIPELINE? BUT MESSAGE SENT IF CONSENT FAILED BY CONSENTER. SEE NO NEED
     * @type {ViewPanelsManagerInstance['requestRouteToQuery']}
     */
    requestRouteToQuery(query, dataAndArgs, failCb){

        this.mainRouterInstance.routeTO(this.mainRouterInstance.getCurrentURLWithQuery(query), dataAndArgs);
    }

    /**
     * @type {ViewPanelsManagerInstance['requestFullRoute']}
     */
    requestFullRoute(fullRoute, dataAndArgs, failCb){

        this.mainRouterInstance.routeTO(fullRoute, dataAndArgs);
    }

    /**
     * CALLED EXTERNALLY 
     * 
     * Use this to check which view panels are changing
     * Updated query none, all should destroy (should work with those inflated without actually running that query in the browser)
     * Otherwise, find changed ones and ask for consent plus state (use frag algo)
     * 
     * With new frag algo, all active consenting
     * 
     * Also, this is for route builds. So, if fragment not destroying, only view panels affected by route change will consent. Others assumed not to be in route?
     * Wrong assumption. What if route params no longer exist?
     * Need to mark a view panel in info as routeBuilt or independent (!routeBuilt)
     * Therefore, if fragment not destroying, those with changing queries (based on data or not being in data)
     * and routeBuilt destroyed based on changes
     * 
     * @type {ViewPanelsManagerInstance['getViewPanelsConsent']}
     */
    getViewPanelsConsent(newRouteInfo, consentCb){

        if(this.masterViewPanelInfoUtils.activeViewPanels.size > 0){

            //Need to get destroy stack?
            //Only do that when actually destroying fragment? Not quite. On call to maintain, this also called to maintain. 
            //Actually destroy view panels when building new ones. Okay....better algo
            //So update build algo
            //Now just consent all active?
            //And is it entire map or just affected ones as per query?
            //As is, no information if fragment actually poised to be destroyed. Necessary to know?
            //I think so for above so that we know whether we'll consent the whole map or only target the different query(ies)
            //So, PASS DESTROY STACK and check match. Relocate method to reset states in consent method now since destroy stack accessible
            //YES
            //Actually, consent all and save state. Then, if maintained, back to running. Else, destroyed either based on changed queries or host fragment destruction (which will consequently trigger destruction of these)
            //How to handle asynchronous builds?
            //Get everything in maps. Use main view panel build pipeline to get consents
            //NEW LOGIC for getting view panels that need to be built
            //Allow for unique route based situations where, for example, building a comments panel
            //with button to login for reply
            //login view panel triggered by route, so can navigate back or away from easily
            //So, query tree for comment can be showComment=true&postId=123, with root as showComment
            //However, login triggered in this route by auth=true
            //so, can have showComment=true&postId=123&auth=true, that should trigger BOTH view panels, IN ORDER
            //Reverse this to destroy.
            //Therefore, different contexts, making auth=true valid?
            //NO.
            //I think routeBuilt panels need to be strongly tied to SAME CONTEXT?
            //Meaning you can only build on one chain at a time
            //Yes. Makes sense. Because route is also defined in singularity.
            //Yea. So, if you want auth=true to be valid alone, then its singular at the time.
            //IMPORTANT
            //So, routeBuildInfo is a mandatory type taking value routeBuilt boolean, and context - transferred here, which is
            //redundant if routeBuilt set to true.
            //None routeBuilt use normal context logic, so if you set two to same, know they'll mutually exclude each other
            //ONLY none routeBuilt are triggered via directOpens and closes. 
            //Do this tomorrow
            //SO CHANGING DEFINITION OF PANELS AND BUILD LOGIC (IN TERMS OF DIRECT CALLS AND ROUTE-BUILT CALLS??) AND DESTROY LOGIC
            //CAN DO ONE AT A TIME, SINCE SHOULD DO ONE AT A TIME, FOR ROUTE BASED
            //BUT ROUTE BASED AND DIRECT CAN BE CALLED AT THE SAME TIME
            //DOES THE PIPELINE REALLY NEED TO BE ASYNCHRONOUS RIGHT NOW?
            //INTERESTING STATE
            //Now, with the initial example given of showComment=true&postId=123&auth=true,
            //Can show two separate view panels if auth=true is not route built and triggered by a direct call by the routebuilt view panel when it also observes auth=true has been shown.
            //Can still pass to it its savedState to restore (best way to access it)
            //Can have confirmDialogs always deny consent if active and have unique way of blocking navigation when making important selections 
            //or actions such as loading data (loader can be a view panel loading to specific place in UI). YESSSSSSSSSS**
            getConsentOfPanelsInMap(this, this.masterViewPanelInfoUtils.exclusiveMapKeyStack.copy(), {}, (consentInfo) => {

                consentCb(consentInfo);
                //REDUNDANT FOR HERE
                //Actually not.
                /**
                 * IMPORTANT
                 * As per fragment algo, fragment consents first then allows view panels to consent. At this point,
                 * fragment okay with destruction. Waiting for view panels.
                 * But, algo still not okay. Parent might deny. So don't destroy yet until exclusive call to destroy based on:
                 * fragment destroy, new route.
                 * 
                 * Work on maintain call to reset state, or start new build can pass DFA key to work for both instances. Latter better
                 * 
                 * Use unique DFA Key like consentApprovedNoDestroyRebuild to cater for case where consented to route change, but not actually set to be destroyed and was rebuilt
                 * START FROM HERE. Will reset to complete then call DFA for complete
                 * @todo DEAL WITH GETTING DESTROY STACK ON BUILD START BEFORE PIPELINE HIT THEN DESTROY IF THERE BEFORE BUILDING NEW
                 * Should be sorted completely with that, save for build cancellation now. Remember does too if triggered but no queries, so destroys all query based
                 * Then transitions hopefully
                 */
            });
        } else{

            if(!this.masterViewPanelInfoUtils.exclusiveMapKeyStack.isEmpty()){

                throw new Error("Exclusive map key stack and active view panels stack NOT same size. Code error");
            }
            consentCb({consent: true, panelsSavedState: {}});
        }

        /**
         * @param {ViewPanelsManager} managerRef
         * @param {ExclusiveStack<string>} exclusiveMapKeyStackCopy 
         * @param {SavedFragmentState} cummulativeSaveState
         * @param {getViewPanelConsentCb} consentCompleteCb
         * @param {ExclusiveStack<string>} [consentedKeys]
         */
        function getConsentOfPanelsInMap(managerRef, exclusiveMapKeyStackCopy, cummulativeSaveState, consentCompleteCb, consentedKeys = new ExclusiveStack()){

            if(!exclusiveMapKeyStackCopy.isEmpty()){

                let key_Context = exclusiveMapKeyStackCopy.pop();

                //Reject if there's an existing direct caller who's consenting
                if(managerRef.masterViewPanelInfoUtils.activeViewPanels.get(key_Context).currentState === "consenting"){

                    //Just reject. Can't override ongoing consent
                    // console.error("REJECTED");
                    // console.log(managerRef.masterViewPanelInfoUtils.activeViewPanels.get(key_Context));
                    // console.log(key_Context);
                    consentCompleteCb({ consent: false, panelsSavedState: null });
                } else {

                    //Update state to consenting
                    managerRef.masterViewPanelInfoUtils.activeViewPanels.get(key_Context).currentState = "consenting";
                    //@ts-ignore Because other properties not really needed
                    managerRef.mainViewPanelBuildPipeline.consentViewPanels({ 
    
                        consentStack: managerRef.masterViewPanelInfoUtils.activeViewPanels.get(key_Context).runningViewPanels.copy(),
                        panelsKey_Context: ViewPanelsManager.ViewPanelsManagerSavedStateKey,
                        buildID: key_Context,
                        consentCb: (consentInfo) => {
    
                            if(consentInfo.consent){
    
                                //Show no longer consenting to avoid crash. So, update to destroying
                                //EVEN IF THIS WORKS, THIS CAN BE SOLVED BY SUPER PIPELINE LOCK YOU PLEB!!!
                                //Superlock consent and destroy, and reject consent if locked or accept destroy if there already
                                //So, update pipeline
                                //Now not destroying view. WTF. Cause not in destroy yet, but this is lying
                                //SEE WHY PIPELINE IS IMPORTANT. USE PIPELINE
                                managerRef.masterViewPanelInfoUtils.activeViewPanels.get(key_Context).currentState = "consented";
                                //Add to consentedKeys
                                consentedKeys.push(key_Context);
                                getConsentOfPanelsInMap(managerRef, exclusiveMapKeyStackCopy, { ...cummulativeSaveState, ...consentInfo.panelsSavedState }, consentCompleteCb, consentedKeys);
                            } else {
    
                                //Denied. Info already as false. saved state unnecessary
                                //Need to reupdate status of updated
                                const size = consentedKeys.size();
                                for(let i = 0; i < size; i++){

                                    //Update state back to running
                                    managerRef.masterViewPanelInfoUtils.activeViewPanels.get(consentedKeys.pop()).currentState = "running";
                                }
                                consentCompleteCb(consentInfo);
                            }
                        }
                    });
                }
            } else {

                //All agreed. Pass cummulative state
                consentCompleteCb({

                    consent: true,
                    panelsSavedState: cummulativeSaveState
                });
            }
        }
    }

    /**
     * Finds the matching root view panel tree
     * Uses queries in RouteParams. NOT the processed changed queries
     * 
     * For panel name, just send panel name in query format
     * 
     * CONTINUE FROM HERE. ALGO UPDATED SO DESTROY CAN WORK BASED ON ROUTE CHANGE INFO
     * OKAY, Need routeBuildInfo polyfilled to ? or work based on known context or key for route build routeBuild?
     * Yes. Better than extra redundant fields.
     * So polyfill, have value as getter, and use in logic
     * 
     * @param {RouteQueryData} query_PanelName 
     * 
     * @returns {MatchingRootViewPanelInfo}
     * @throws Error finding matching watch query entry. Either no query has been passed or query missing
     */
    findMatchingRootViewPanelInfo(query_PanelName){

        /**
         * @type {MatchingRootViewPanelInfo}
         */
        let matchingRootViewPanelInfo = null;
        /**
         * @type {ViewPanelRootQueryTree}
         */
        let matchingRoot = null;
        if(query_PanelName){

            //Search first in routeWatchQueries
            //CONTINUE TO panelNameDefinitions
            for(let query in query_PanelName){

                matchingRoot = this.routeWatchQueries[query] ? this.routeWatchQueries[query] : this.panelNameDefinitions[query];
                if(matchingRoot){

                    matchingRootViewPanelInfo = {
                        
                        rootQueryTree_Panel: matchingRoot,
                        matchingQuery_Name: query
                    };
                    break
                }
            }

            if(!matchingRootViewPanelInfo){

                //This is actually an error
                //But console it. Might pass wrong panel name. Fail gracefully
                console.error("VIEW PANEL: No matching watch query entry found for the queries listed above for ");
                console.log(query_PanelName);
            }
        } else {

            console.warn("VIEW PANEL: No queries passed. ERROR");
            //Not an error
            //Shows routeBuilt might need to be destroyed and matching root view panel info null. Handle
        }

        return matchingRootViewPanelInfo;
    }

    /**
     * Called by fragment on fragment destroy to destroy all view panels (route built or not) as well
     * 
     * Happens in order of exclusive key map stack. Not copy, but actual since destroying. Must be cleared and activeViewPanels map on end
     * @type {ViewPanelsManagerInstance['destroyAllViewPanels']}
     */
    destroyAllViewPanels(cb){

        //Run for all exclusiveMapKeyStack
        if(!this.masterViewPanelInfoUtils.exclusiveMapKeyStack.isEmpty()){

            //Do the state check, to catch direct built already destroying and skip requesting for them
            //MIGHT CAUSE ISSUES. BUT ANYWAY, TRY. IF ISSUES relegate to calling destroy for direct built first
            //before passing last data to pipeline. Just much better. Change alert dialog to that
            //However, currently helping avoid making ordering too important for the developer cause that's a 
            //hard bug to catch
            const currentState = this.masterViewPanelInfoUtils.activeViewPanels.get(this.masterViewPanelInfoUtils.exclusiveMapKeyStack.peek()).currentState;
            if(currentState === "consenting"){

                console.warn("About to crash cause of:");
                console.log(this.masterViewPanelInfoUtils.activeViewPanels.get(this.masterViewPanelInfoUtils.exclusiveMapKeyStack.peek()));
                throw new Error("Should not call for all view panels to destroy if one consenting. Host MUST have asked for consenting first, which should have been automatically rejected not to override ongoing consent action. Affected: " + this.masterViewPanelInfoUtils.exclusiveMapKeyStack.peek());
            }
            if(currentState === "destroying"){

                // console.warn(`Bounced destroy for ${this.masterViewPanelInfoUtils.activeViewPanels.get(this.masterViewPanelInfoUtils.exclusiveMapKeyStack.peek()).rootQuery_PanelName}. Directly called thus directly destroying prior to this call`);
                this.masterViewPanelInfoUtils.deleteMasterViewPanelInfo(this.masterViewPanelInfoUtils.exclusiveMapKeyStack.pop());
                this.destroyAllViewPanels(cb);
            } else {

                //update state (so, late direct callers will get a bounce)
                this.masterViewPanelInfoUtils.activeViewPanels.get(this.masterViewPanelInfoUtils.exclusiveMapKeyStack.peek()).currentState === "destroying";
                //@ts-ignore Other properties not needed
                this.mainViewPanelBuildPipeline.destroyViewPanels({
    
                    destroyStack: this.masterViewPanelInfoUtils.activeViewPanels.get(this.masterViewPanelInfoUtils.exclusiveMapKeyStack.peek()).runningViewPanels,
                    buildID: this.masterViewPanelInfoUtils.exclusiveMapKeyStack.peek(),
                    completeCb: () => {
    
                        //Remove from exlusiveMapKeyStack and activeViewPanels
                        this.masterViewPanelInfoUtils.activeViewPanels.delete(this.masterViewPanelInfoUtils.exclusiveMapKeyStack.pop());
                        this.destroyAllViewPanels(cb);
                    }
                });
            }
        } else {

            cb();
        }
    }
    
    /**
     * Call this to close a view panel. Can be triggered by a panel or host
     * Consents first
     * 
     * ONLY USE FOR PANELS NOT ROUTEBUILT. Else, effect an actual route change
     * @type {ViewPanelsManagerInstance['closeViewPanel']}
     * inflationID Or query? Prefer query. Look at close flow. Dig until which parent affected
     * Might want some data passed in savedState? Say panel returns results through it....NAAAA. Cause of "hidden" nature of saved state keyed by unique values such as viewID
     */
    closeViewPanel(inflationID, cb){

        if(inflationID !== ViewPanelsManager.RouteBuiltContext){

            const panelsInfo = this.masterViewPanelInfoUtils.activeViewPanels.get(inflationID);
            if(panelsInfo){

                //Update to consenting sending a false, destroyed bouncing with true. To avoid the
                //issue where might be consenting, so paused, then host assumes is a go. Will cause this congruency error
                //MUST MATCH in destroy
                if(panelsInfo.currentState === "consenting" || panelsInfo.currentState === "destroying" || panelsInfo.currentState === "consented"){

                    // console.warn(`Bounced close. Panel already ${panelsInfo.currentState}`);
                    cb(panelsInfo.currentState === "destroying");
                } else {

                    //update state locally
                    //Remove all these state updates. Unnneeded. Use superpipeline lock
                    this.masterViewPanelInfoUtils.updateMasterViewPanelInfoState(inflationID, "consenting");
                    //Do actual close. Consent first
                    //@ts-ignore Other properties not needed
                    this.mainViewPanelBuildPipeline.consentViewPanels({
    
                        buildID: inflationID,
                        consentStack: panelsInfo.runningViewPanels.copy(),
                        panelsKey_Context: ViewPanelsManager.ViewPanelsManagerSavedStateKey, 
                        consentCb: (consentInfo) => {
    
                            if(consentInfo.consent){
    
                                //@ts-ignore Other properties not needed
                                this.mainViewPanelBuildPipeline.destroyViewPanels({
    
                                    buildID: inflationID,
                                    destroyStack: panelsInfo.runningViewPanels,
                                    completeCb: () => {
    
                                        /**
                                         * Delete entry
                                         */
                                        this.masterViewPanelInfoUtils.deleteMasterViewPanelInfo(inflationID);
                                        cb(true);
                                    }
                                })
                            } else {
    
                                console.error("Panel refused to grant consent to destroy");
                                //Update state
                                this.masterViewPanelInfoUtils.updateMasterViewPanelInfoState(inflationID, "running");
                                cb(false);
                            }
                        }
                    });
                }
            } else {

                console.error(`No view panel with inflationID ${inflationID} found. Not closed`);
                cb(false);
            }
        } else {

            console.error(`Panel cannot be closed directly. It's route built. Request a route change to effect closure`);
            cb(false);
        }
    }
}

/**
 * Typedefs internal to ViewPanelsManagerMainBuildPipeline
 * 
 * @typedef {import("./types/view_panels_manager_build_pipeline.d.ts").ViewPanelsManagerConsentPipelineBuildArgs} ViewPanelsManagerConsentPipelineBuildArgs
 * @typedef {import("./types/view_panels_manager_build_pipeline.d.ts").ViewPanelsManagerDestroyPipeplineBuildArgs} ViewPanelsManagerDestroyPipeplineBuildArgs
 * @typedef {import("./types/view_panels_manager_build_pipeline.d.ts").BuildStatuses} BuildStatuses
 */
/**
 * 
 * @extends {GenericBuildPipelineWorker<ViewPanelsManagerBuildPipelineStates, ViewPanelsManagerBuildPipelineStartBuildArgs, ViewPanelsManagerDFAGroups, null>}
 */
class ViewPanelsManagerMainBuildPipeline extends GenericBuildPipelineWorker{

    /**
     * 
     * @param {ViewPanelsManagerMainBuildPipelineConstructorArgs} args 
     */
    constructor(args){

        /**
         * @type {GenericBuildPipelineWorkerConstructorArgs<ViewPanelsManagerBuildPipelineStartBuildArgs, ViewPanelsManagerBuildPipelineStates, ViewPanelsManagerDFAGroups, null> }
         */
        const superArgs = {

            asynchronousBuildDefinition: {

                defaultPipelineState: "complete",
                runAsynchronous: true
            },
            pseudoStates: null,
            stateTransitionDefinition: {

                //Start of the build. None was running - WORKING ON THIS FLOW FIRST
                buildStartSuccessDFA: {
    
                    autoTriggerState: "complete",
                    root: "building", //Specifies the start node of this DFA. Automatically referenced as start point for a DFA if you just specify it
    
                    //View panel goes direct to building because it runs consent flow separately due to loose 
                    //attachment to routes
                    building: {
    
                        prev: null, //For semantics. Might not be used by algo. Help with readability. Actually, use in algo to help validate algo working well. New prev is former key
                        next: "complete", //In callback below, call transitionPipelineState(next = boolean). If true, uses this next. if not, uses fail. Keys context referenced in widening scope. So, tries to find it in current nest. Else, goes outside
                        cb: (cbArgs) => {

                            //HOW TO SORT THIS ISSUE BELOW
                            
                            //Init buildStatus for given buildID if not given
                            if(!this.buildStatuses[cbArgs.buildArgs.buildDefinitionParams.buildID]){

                                this.buildStatuses[cbArgs.buildArgs.buildDefinitionParams.buildID] = {

                                    buildCancelStack: new Stack()
                                }
                            }

                            //Check if the buildCancelStack for this buildID is not empty. Means we need to cancel that build
                            //If it wanted to return anything later, will be invalid cause of new buildStartStamp
                            if(!this.buildStatuses[cbArgs.buildArgs.buildDefinitionParams.buildID].buildCancelStack.isEmpty()){

                                //Cancel build then continue with this
                                //I see no need to switch up state? Naa...have to and lock the process
                                this.startPipelineBuild({

                                    myBuildArgs: cbArgs.buildArgs.myBuildArgs,
                                    buildDefinitionParams: {
                        
                                        buildID: cbArgs.buildArgs.buildDefinitionParams.buildID,
                                        //IMPORTANT. Otherwise when build returns, this flow will be invalid due to new start stamp
                                        inheritBuildStartStamp: cbArgs.buildArgs.buildDefinitionParams.buildStartStamp
                                    },
                                    //Not needing this because cancelDFA auto triggered when in state building if pipeline build invoked
                                    //Pipeline locked at this stage
                                    failStartCb: () => {
                        
                                        console.error("Failed to start view panel build. Default response. Check stack");
                                        //Need a build failed state? Not quite
                                        cbArgs.failNextCb({

                                            goToNext: true,
                                            buildArgs: cbArgs.buildArgs
                                        });
                                    },
                                    completeCb: () => {
                        
                                        console.error("Completed cancelling old view panel build.");
                                        //Now return to this flow
                                        this.buildViewPanelStack(cbArgs.buildArgs, () => {

                                            cbArgs.failNextCb({
            
                                                goToNext: true,
                                                buildArgs: cbArgs.buildArgs
                                            });
                                        });
                                    },
                                });
                            } else {

                                this.buildViewPanelStack(cbArgs.buildArgs, () => {

                                    cbArgs.failNextCb({
    
                                        goToNext: true,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                });
                            }
                        }, //Pass this object in the call. Help also make some decisions and now the flow of the call from previous. Will be passed in next valid transition. The callback here handles any necessary work for this stage
                        fail: null, //Will handle the fail cb here
                    },
                    complete: {
        
                        prev: "building",
                        next: null,
                        cb: (cbArgs) => {

                            console.error("WE ARE DONE");
                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    },
                },
    
                //Start of a build. But one was running 
                //Can pipeline start consenting if not build complete?
                //Nope. Consent also use this, but prioritizing auto trigger with new flag targetAutoTriggerState (building) only one that can be validly started
                //Better. So, only complete builds can consent. Otherwise, cancel as consent and pass nothing as saved state
                //Algorithm works such that, in panel, [see fragment logic]
                /**
                 * INHERIT BUILD DEFINITION VALUES
                 * 
                 * These values allow two pipelines to work together and coordinate builds based on buildIDs and build start stamps
                 * Here's how it works to cancel a build
                 * 
                 * Say a fragment or view panel was building. Before build completion, a new build was requested. The current build MUST be cancelled
                 * The pipeline can check if, for the given buildID that identifies a subpipeline (term, document), it will start the new build then,
                 * if there's an existing build running, ask it to cancel.
                 * 
                 * Algo can trigger cancel when old build returns from child pipeline or current action, which can cause delay,
                 * or do a direct trigger using data of cancel build stack. <so using stacks>.
                 * 
                 * Therefore, will trigger a cancelBuild build first, and on callback, run the new build
                 * 
                 * Actually, with latter algo, don't need inheriting values, BUT STILL LOOK AT IT
                 * 
                 * Logic not for generic pipeline but this pipeline then choose how to start.
                 * So, add a new member and use it for specific DFAs. YES!! 
                 * Like a new member with buildStartCancelStack. If not empty, start a new build by first cancelling current (old returns
                 * in old build will be void due to start stamp) Then trigger new build on complete.
                 * Make sense to lock pipeline in build cancels so that things go in good order. Can't cancel a cancel lol
                 * 
                 * @todo
                 * 
                 * INHERITING VERY VALID. Help trigger a pipeline build to cover a unique case (like build cancellation)
                 * and return to the paused build using the same start stamp. So, provide inherit buildStartStamp.
                 */
                buildStartBuildCancelledDFA: {
    
                    autoTriggerState: "building",
                    root: "buildCancelled", //Found in a flat search. Same as autoTriggerState
    
                    buildCancelled: {
    
                        prev: "building",
                        next: "building",
                        superPipelineLock: true, //So that you don't cancel a cancel or request consent of current when former cancelling
                        cb: (cbArgs) => {

                            //Destroy the old build based on buildCancelStack for buildID
                            //Use info we have about the new buildStack to see whether the request to the other pipeline
                            //(for view panel) is to destroy or just cancel
                            //DON'T PASS COPY OF ACTUAL BUILDCANCELSTACK. So that we pop appropriately.
                            cancelPreviousBuild(this.buildStatuses[cbArgs.buildArgs.buildDefinitionParams.buildID].buildCancelStack, () => {

                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            });

                            /**
                             * 
                             * @param {Stack<ViewPanelInstance<*, *>>} cancelBuildStack 
                             * @param {genericFunction} cb 
                             */
                            function cancelPreviousBuild(cancelBuildStack, cb){

                                if(!cancelBuildStack.isEmpty()){

                                    if(cbArgs.buildArgs.myBuildArgs.panelStacks.buildStack.contains(cancelBuildStack.peek())){

                                        //Part of new build. So just stop current build
                                        cancelBuildStack.pop().viewPanelLocalPipelineWorker.cancelViewPanelBuild({

                                            launchParams: cbArgs.buildArgs.myBuildArgs.launchViewPanelParams,
                                            mainPipelineCb: () => {

                                                cancelPreviousBuild(cancelBuildStack, cb);
                                            }
                                        })
                                    } else {

                                        //Ask to destroy
                                        //@ts-ignore Don't need other params
                                        cancelBuildStack.pop().viewPanelLocalPipelineWorker.destroyViewPanel({

                                            destroyCb: () => {

                                                cancelPreviousBuild(cancelBuildStack, cb);
                                            }
                                        });
                                    }
                                } else {
                                    
                                    cb();
                                }
                            }
                        },
                        fail: null
                    },
                    building: {
    
                        prev: "buildCancelled",
                        next: null,
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({
                                
                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                },
    
                //Flow for consenting - WORKING ON NOW
                buildFinishedConsentDFA: {
    
                    root: "consenting",
    
                    consenting: {
    
                        prev: "complete",
                        next: "consentApproved",
                        superPipelineLock: true, //Very special flag. Allows pipeline to refuse other requests if in such a state. Useful in main build pipeline where we cannot start processing other route requests in consenting state (and other states) of a route. Toggled based on next definition (so if undefined, goes to false)
                        cb: (cbArgs) => {

                            /**
                             * @type {ViewPanelsManagerConsentPipelineBuildArgs}
                             */
                            //@ts-ignore
                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            consentViewPanelsStack(myBuildArgs.consentStack.copy(), myBuildArgs.completeConsentParams.panelsSavedState);

                            /**
                             * 
                             * @param {Stack<ViewPanelInstance<*, *>>} consentStackCopy 
                             * @param {SavedFragmentState} cummulativeSaveState 
                             */
                            function consentViewPanelsStack(consentStackCopy, cummulativeSaveState){

                                if(!consentStackCopy.isEmpty()){

                                    //FROM HERE
                                    let panelInstance = consentStackCopy.pop();
                                    //@ts-ignore
                                    panelInstance.viewPanelLocalPipelineWorker.requestViewPanelConsent({

                                        consentCb: (consentInfo) => {

                                            if(consentInfo.consent){

                                                //Save inside of context and its view panel save state for all view panels
                                                cummulativeSaveState[myBuildArgs.panelsKey_Context].viewPanelSaveState = {

                                                    ...cummulativeSaveState[myBuildArgs.panelsKey_Context].viewPanelSaveState,
                                                    ...consentInfo.panelsSavedState
                                                }

                                                consentViewPanelsStack(consentStackCopy, cummulativeSaveState);
                                            } else {

                                                myBuildArgs.completeConsentParams = consentInfo;
                                                console.error("Consent denied by panel " + panelInstance.panelQuery);
                                                //Go to fail
                                                cbArgs.failNextCb({

                                                    goToNext: false,
                                                    buildArgs: cbArgs.buildArgs
                                                });
                                            }
                                        }
                                    });
                                } else {

                                    //All should have positively consented
                                    //Put final params
                                    myBuildArgs.completeConsentParams = {

                                        consent: true,
                                        panelsSavedState: cummulativeSaveState
                                    };
                                    cbArgs.buildArgs.myBuildArgs = myBuildArgs;
                                    cbArgs.failNextCb({

                                        goToNext: true,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                }
                            }
                        },
                        fail: "consentDenied"
                    },
                    consentApproved: { //Added this to allow for superPipelineLock to be removed, then have a clear stage to destroy from. 
    
                        prev: "consenting",
                        next: null,
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        }, //Tell the frag using complete cb, for a view panel, or main build pipeline for a frag
                        fail: null
                    },
                    consentDenied: {
    
                        prev: "consenting",
                        next: "complete",
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    },
                    complete: {

                        prev: "consentDenied",
                        next: null,
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                },
    
                //Consenting has happened. We have that flow above
                buildDestroyDFA: {
    
                    autoTriggerState: "consentApproved", //No superPipelineLock. Can be triggered
                    root: "destroying",
    
                    destroying: { //Helpful in running animations to close
    
                        prev: "consentApproved",
                        next: "complete",
                        cb: (cbArgs) => {

                            //Now destroy the stack of view panels.
                            /**
                             * @type {ViewPanelsManagerDestroyPipeplineBuildArgs}
                             */
                            //@ts-ignore
                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            destroyViewPanelsStack(myBuildArgs.destroyStack, () => {

                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            });
                            /**
                             * 
                             * @param {Stack<ViewPanelInstance<*, *>>} viewPanelsStack 
                             * @param {genericFunction} completeCb
                             */
                            function destroyViewPanelsStack(viewPanelsStack, completeCb){

                                if(!viewPanelsStack.isEmpty()){

                                    //@ts-ignore Rest not needed
                                    viewPanelsStack.pop().viewPanelLocalPipelineWorker.destroyViewPanel({

                                        destroyCb: () => {

                                            destroyViewPanelsStack(viewPanelsStack, completeCb);
                                        }
                                    });
                                } else {

                                    completeCb();
                                }
                            }
                        },
                        fail: null
                    },
                    complete: {

                        prev: "destroying",
                        next: null,
                        cb: (cbArgs) => {

                            //Trigger complete cb. Next and fail null
                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                },

                //Special DFA Group for when consent was approved, but fragment wasn't actually to be destroyed. 
                //Any panel that was to be destroyed will be done so in normal build flow
                //Better than making weird reset calls. 
                consentApprovedNoDestroyRebuild: {

                    root: "consentApproved",
                    consentApproved: {

                        prev: "consentApproved",
                        next: "complete",
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null,
                    },
                    complete: {

                        prev: "consentApproved",
                        next: "buildStartSuccessDFA", //Transfer control to this dfa group
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                }
            }
        };
        super(superArgs);
        /**
         * @type {BuildStatuses}
         */
        this.buildStatuses = {};
        this.viewPanelsManager = args.viewPanelsManager;
    }

    /**
     * TRIGGER INTERNAL CALL TO STATE TRANSITION WITH APPROPRIATE DFAGROUPKEY (OPTIONAL DEPENDING ON STATE TRANSITION DEFINITION)
     * 
     * CHECK ARGS CALLBACKS PROVIDED. IF NOT, USE OWN CB
     * 
     * @param {ViewPanelsManagerBuildPipelineStartBuildArgs} args 
     */
    startViewPanelBuild(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: args.buildID,
            },
            targetDFAInfo: {

                dfaGroupKey: "consentApprovedNoDestroyRebuild", //Used if pipeline not in complete state, thus most likely consentApproved, to reset and retarget pipeline
                DFA: null,
                DFAKey_StateName: null,
                prioritizeAutoTrigger: true
            },
            failStartCb: () => {

                console.error("Failed to start view panel build. Default response. Check stack");
                args.failStartCb?.();
            },
            completeCb: () => {

                console.error("Completed view panel build. Default response.");
                args.successCb?.();
            }
        });
    }

    /**
     * 
     * @param {ViewPanelsManagerConsentPipelineBuildArgs} args 
     */
    consentViewPanels(args){

        //Set the ref for this set of view panels based on key_Context
        //@ts-ignore For the other redundant properties
        args.completeConsentParams = {};
        args.completeConsentParams.panelsSavedState = {};
        //@ts-ignore For the other redundant properties
        args.completeConsentParams.panelsSavedState[args.panelsKey_Context] = { viewPanelSaveState: {} };
        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: args.buildID
            },
            targetDFAInfo: {

                dfaGroupKey: "buildFinishedConsentDFA",
                DFA: null,
                DFAKey_StateName: null
            },
            failStartCb: () => {

                // console.error("Failed to consent for view panels. Failed start. Defaulting to refuse consent");
                args.consentCb({ consent: false, panelsSavedState: null });
            },
            /**
             * 
             * @param {ViewPanelsManagerConsentPipelineBuildArgs} finalArgs 
             */
            completeCb: (finalArgs) => {

                // console.warn("Completed consent build");
                args.consentCb(finalArgs.completeConsentParams);
            }
        });
    }

    /**
     * 
     * @param {ViewPanelsManagerDestroyPipeplineBuildArgs} args 
     */
    destroyViewPanels(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: args.buildID
            },
            failStartCb: () => {

                console.error("Failed to start pipeline for destroy view panels in manager");
            },
            completeCb: () => {

                args.completeCb();
            }
        });
    }

    /**
     * Internal
     * 
     * @param {GenericBuildPipelineBuildArgs<ViewPanelsManagerBuildPipelineStartBuildArgs, ViewPanelsManagerBuildPipelineStates, ViewPanelsManagerDFAGroups>} cbArgs
     * @param {genericFunction} pipelineCb
     */
    buildViewPanelStack(cbArgs, pipelineCb){

        //Trigger each view panel to build going through the build stack. Populate a built stack used to cancel builds
        if(cbArgs.myBuildArgs.panelStacks.buildStack.size() > 0){

            cbArgs.myBuildArgs.panelStacks.buildStack.peek().viewPanelLocalPipelineWorker.buildViewPanel({

                launchParams: cbArgs.myBuildArgs.launchViewPanelParams,
                mainPipelineCb: () => {

                    this.buildStatuses[cbArgs.buildDefinitionParams.buildID].buildCancelStack.push(cbArgs.myBuildArgs.panelStacks.buildStack.pop());
                    this.buildViewPanelStack(cbArgs, pipelineCb);
                }
            });
        } else {
            
            //Complete. So buildCancelStack should be cleared
            this.buildStatuses[cbArgs.buildDefinitionParams.buildID].buildCancelStack.clear();
            pipelineCb();
        }
    }
}

if(false){

    /**
     * @type {import("ViewPanelsManager").ViewPanelsManagerConstructor}
     */
    const check = ViewPanelsManager;
}

export default ViewPanelsManager;