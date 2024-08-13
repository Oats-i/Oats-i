//@ts-check
import Queue from "../../../../utils/abstract-data-types/queue/queue";
import RandomNumberCharGenUtils from "../../../../utils/random-number-generator/random_number_char_generator";
import LifecycleRemoteRequestUtils from "../../../../utils/remote-requests/lifecycle/lifecycle_remote_request_utils";
import GenericBuildPipelineWorker from "../../../../utils/generic-pipeline-worker/generic_build_pipeline_worker";
import RemoteUILoader from "../../remote-ui-loader/remote_ui_loader_script";
import FragmentLifeCycleManager from "../../../lifecycle/fragment_lifecycle_manager";
import TransitionsManager from "../../transitions/transitions_manager";

/**
 * @template LAUNCH_DATA, HOST_PIPELINE_DATA
 */
class ViewPanel{

    /**
     * 
     * @param {ExtViewPanelConstructorArgs} args
     */
    constructor(args){

        /**
         * Use it to invoke another panel build? Yea. Call it openViewPanelByRoute if route-based
         * Otherwise, use normal invocation (no route changes, but full build process)
         * @type {ViewPanelsManagerInstance}
         */
        this.viewPanelsManager = args.viewPanelsManager;
        /**
         * The query to read value from. Also, one to read savedState from?
         * @type {string}
         */
        this.panelQuery = args.panelQuery;
        /**
         * @type {string}
         */
        this.globalInflationID = args.globalInflationID;
        //The local pipeline worker. Needs to be defined first to get access to lifecycle object
        this.viewPanelLocalPipelineWorker = new ViewPanelLocalPipelineWorker({

            hostPanel: this,
            hostFragmentLifeCycleObject: args.hostFragmentLifeCycleObject
        });

        this.panelRootViewDOMFixed = args.panelRootViewDOMFixed;
        this.panelRootViewID = args.panelRootViewDOMFixed ? args.panelRootViewID : RandomNumberCharGenUtils.generateRandomNumChar(5); //args.panelRootViewID;
        this.contentRootViewID = args.contentRootViewID ? args.contentRootViewID : RandomNumberCharGenUtils.generateRandomNumChar(5);
        /**
         * @type {HTMLElement}
         */
        this.panelRootViewNode = null;
        /**
         * @type {HTMLElement}
         */
        this.contentRootViewNode = null;
        //To load UIs remotely (Custom pop-ups with messaging)
        this.remoteUILoader = new RemoteUILoader(new LifecycleRemoteRequestUtils(this.getLifeCycleObject()));
        this.panelViewListenersAttached = false;
        //Allow for route based or non-route based panel navigation like fragments
        /**
         * @type {LocalViewPanelRoutingInfo[]}
         */
        this.localRoutingInfos = args.localRoutingInfos;
        /**
         * @type {string}
         */
        this.currentlyActiveFullQuery = null;
        /**
         * @type {string}
         */
        this.currentlyActiveBaseRoute = null;
        /**
         * @type {string}
         */
        this.currentlyActivePanelNavId = null;
        //Automatically getting updated queries
        //Use a generic type with keyof to make it easier to reference down the code
        //Used to also set active navBtnID. Try a different algo to fragment, using direct check of matching query in passed list to navinfo
        /**
         * @type {GenericRouteQueryData<{}>}
         */
        this.updateQueryList = this.normalizeUpdateQueryList(args.panelUpdateQueryList);

        //For transitions
        this.transitionsManager = new TransitionsManager();

        //To move data to invoking parent (one who called for view panel to be built by viewpanels manager)
        /**
         * USE THIS PIPELINE ONLY TO PASS DATA. AND CHOOSE HOW YOU WILL DESTROY PANEL LATER. Internally or externally by invoking manager
         * @type {genericParamFunction<HOST_PIPELINE_DATA>}
         */
        this.dataResponseHostPipeline = null;
    }

    /**
     * 
     * @param {GenericRouteQueryData<{}>} updateQueryList 
     */
    normalizeUpdateQueryList(updateQueryList){

        if(updateQueryList){

            for(let query in updateQueryList){

                updateQueryList[query] = null;
            }
        }

        return updateQueryList;
    }

    /**
     * CALL SUPER
     * 
     * ALWAYS called when build about to start. Use to set any necessary values you need.
     * 
     * @param {LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>} launchParams 
     * @param {ViewPanelBuildStagesArgs} buildStageArgs 
     * @param {genericParamFunction<ViewPanelBuildStagesArgs>} localPipelineCb
     */
    onViewPanelBuildStart(launchParams, buildStageArgs, localPipelineCb){

        /**
         * Server-side rendering of view panels NOT allowed. So, directly calls, asking for view template.
         */
        this.currentlyActiveFullQuery = launchParams.routeParams?.filteredUrl?.query;
        this.currentlyActiveBaseRoute = launchParams.routeParams?.filteredUrl?.baseUrl;
        //Set the response pipeline here. Can invoke whenever you want to pass your data back
        this.dataResponseHostPipeline = launchParams.data?.dataResponseHostPipeline;

        localPipelineCb(buildStageArgs);
    }

    /**
     * Initializes the panel view - loads the content view of the panel. Not bound yet
     * @param {LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>} launchParams 
     * @param {ViewPanelBuildStagesArgs} buildStageArgs 
     * @param {genericParamFunction<ViewPanelBuildStagesArgs>} localPipelineCb 
     */
    onInitPanelView(launchParams, buildStageArgs, localPipelineCb){

        if(!this.isViewPanelContentViewInitialized()){

            this.initializePanelView(launchParams, buildStageArgs, localPipelineCb);
        } else {

            localPipelineCb({ isContentViewPreRendered: true });
        }
    }

    /**
     * Tells if root view of the panel has been initialized
     * 
     * Automatically tells if part of DOM. So, as long as you add it with the right ID, done!
     * 
     * Have a utils class that ensures IDs are not repeated? Developer be careful for now
     * @returns {boolean}
     */
    isViewPanelRootViewInitialized(){

        return !!document.getElementById(this.panelRootViewID);
    }

    /**
     * Tells if the content view has been initialized
     * @returns {boolean}
     */
    isViewPanelContentViewInitialized(){

        return !!document.getElementById(this.contentRootViewID);
    }

    /**
     * Initializes the view for the view panel. You can source it remotely using a promise (you must wait for this promise)
     * or use a template already shipped in the code
     * 
     * Override and use appropriately
     * 
     * Finally, call onViewInitSuccess with the view as a buildStageArgs in plain text html
     * 
     * @param {LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>} launchParams 
     * @param {ViewPanelBuildStagesArgs} buildStageArgs 
     * @param {genericParamFunction<ViewPanelBuildStagesArgs>} localPipelineCb 
     */
    async initializePanelView(launchParams, buildStageArgs, localPipelineCb){

        
    }

    /**
     * Loads a remote UI resource in plain text
     * @param {RequestOptions} reqOptions 
     * 
     * @returns {Promise<string>} A promise that resolves with the ui template in plain text html
     */
    loadRemoteViewPanelUI(reqOptions){

        return this.remoteUILoader.reqUIResource(reqOptions);
    }

    /**
     * Call after the UI has been loaded successfully to start binding to DOM
     * 
     * Do not override.
     * 
     * @param {LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>} launchParams
     * @param {ViewPanelBuildStagesArgs} buildStageArgs 
     * @param {genericParamFunction<ViewPanelBuildStagesArgs>} localPipelineCb
     */
    onViewInitSuccess(launchParams, buildStageArgs, localPipelineCb){

        this.setCurrentlyActiveViewPanelNavigation();
        //Call localPipelineCb with viewTemplate as arg. Will transition to bindView stage
        localPipelineCb(buildStageArgs);
    }

    /**
     * WRITE LOGIC LATER, WHEN NEEDED - LOL
     * Set the active navigation for the view panel based on the updated queries, if any provided, or default (MUST BE GIVEN)
     * @param {GenericRouteQueryData<{}>} updatedQueries 
     */
    setCurrentlyActiveViewPanelNavigation(updatedQueries = null){

        if(this.localRoutingInfos){

            this.localRoutingInfos.forEach((routingInfo) => {

                if(this.currentlyActiveFullQuery.startsWith(routingInfo.baseActiveRouteQuery)){

                    if(document.getElementById(routingInfo.navBtnID)){

                        if(this.currentlyActivePanelNavId && document.getElementById(this.currentlyActivePanelNavId)){

                            document.getElementById(this.currentlyActivePanelNavId).setAttribute("navigation-state", "inactive");
                        }

                        document.getElementById(routingInfo.navBtnID).setAttribute("navigation-state", "active");
                        this.currentlyActivePanelNavId = routingInfo.navBtnID;
                    }
                }
            });
        }
    }

    /**
     * 
     * @param {LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>} launchParams 
     * @param {ViewPanelBuildStagesArgs} buildStageArgs 
     * @param {genericParamFunction<ViewPanelBuildStagesArgs>} localPipelineCb 
     */
    onBindPanelView(launchParams, buildStageArgs, localPipelineCb){

        //Not checking is server side here because you are NOT supposed to be inflating views if rendered server-side
        if(!this.isViewPanelContentViewInitialized()){

            this.bindNewViewPanelUIToDOM(launchParams, buildStageArgs, () => {

                localPipelineCb(null);
            });
        } else {

            localPipelineCb(null);
        }
    }

    /**
     * Internal. Don't override
     * This should not be an asynchronous call
     * 
     * @param {LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>} launchParams 
     * @param {ViewPanelBuildStagesArgs} buildStageArgs 
     * @param {genericFunction} cb
     */
    bindNewViewPanelUIToDOM(launchParams, buildStageArgs, cb){

        //Can attach to a panel section you've already defined (will be useful for notification tabs container, which will be implemented as a view panel)
        //So, code below checks. If it does not exist in DOM already, inflated parent. Else, uses the one in DOM.
        let wrapper = null;
        if(!this.isViewPanelRootViewInitialized() && this.panelRootViewDOMFixed){

            console.error(`Root view should be fixed to DOM, but none found as per ID. Might cause UI issues`);
            return;
        }

        if(!this.isViewPanelRootViewInitialized()){

            //Change this to a <view-panel> component like fragments?
            wrapper = document.createElement("div");
            this.setWrapperAttributes(launchParams, buildStageArgs, wrapper);
            wrapper.id = this.panelRootViewID;
        } else {

            wrapper = document.getElementById(this.panelRootViewID);
        }

        wrapper.innerHTML = buildStageArgs.viewTemplate;

        if(!this.isViewPanelRootViewInitialized()){

            //Default, all view panels root view inserted directly in body
            document.body.insertAdjacentHTML("beforeend", wrapper.outerHTML);
        }

        //Provide the access to rootViewNode and contentNode, so developer doesn't have to query
        this.panelRootViewNode = document.getElementById(this.panelRootViewID);
        this.contentRootViewNode = document.getElementById(this.contentRootViewID);

        //ELSE
        //Had been set directly to existing root
        //USE THIS LOGIC TO ONLY REMOVE ROOT IF NOT DOM FIXED IN DESTROYING VIEW
        //Content overrides
        //Override only if viewPanelRootViewInitialized by setting flag and using that. hamburger panel factors this logic

        /**
         * Transitions happen here based on transition data passed either from previous 
         * 
         * Working with manager, who will coordinate various workers based on interworker delays (might be better than just putting abstract time delays that might not be frame-linked to worker progress)
         */
        this.transitionsManager.runTransitions(this.getLaunchTransitionsData_Workers_Queue(launchParams, buildStageArgs), () => {

            //I think waiting for the transitions to finish will help in performance of the transitions.
            //Just don't make them too long cause user is waiting
            cb();
        });
    }

    /**
     * Override
     * 
     * Called ONLY if root now hardcoded in DOM
     * 
     * Don't set ID. It will be overwritten
     * 
     * Set unique attributes for the wrapper if need be. COPY FOR FRAGMENT??
     * 
     * @param {LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>} launchParams 
     * @param {ViewPanelBuildStagesArgs} buildStageArgs 
     * @param {HTMLDivElement} wrapper
     */
    setWrapperAttributes(launchParams, buildStageArgs, wrapper){

        
    }

    /**
     * 
     * @param {LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>} launchParams 
     * @param {ViewPanelBuildStagesArgs} buildStageArgs
     * @returns {TransitionsManagerRunArgs<{}>}
     */
    getLaunchTransitionsData_Workers_Queue(launchParams, buildStageArgs){

        return null;
    }

    /**
     * 
     * @returns {TransitionsManagerRunArgs<{}>}
     */
    getCloseTransitionsData_Workers_Queue(){

        return null;
    }

    /**
     * @type {ViewPanelInstance<LAUNCH_DATA, HOST_PIPELINE_DATA>['onBindPanelViewUtils']}
     */
    onBindPanelViewUtils(launchParams, buildStageArgs, localPipelineCb){

        this.bindPanelViewUIToListeners(launchParams, buildStageArgs);
        this.bindLocalRoutingInfoToNavigation(launchParams, buildStageArgs);

        localPipelineCb(null);
    }

    /**
     * 
     * @param {LaunchViewPanelParams<{}, {}>} launchParams 
     * @param { ViewPanelBuildStagesArgs } buildStageArgs 
     */
    bindLocalRoutingInfoToNavigation(launchParams, buildStageArgs){

        if(this.localRoutingInfos){

            this.localRoutingInfos.forEach((info) => {

                document.getElementById(info.navBtnID).addEventListener("click", this.triggerViewPanelNavigationalRouting.bind(this, info, { skipScrollStateRestore: false }, () => {}));
            });
        }
    }

    /**
     * Override if you want to specify whether scroll state restore should be skipped when going back for fragment
     * Handle localized?
     * 
     * @param {LocalViewPanelRoutingInfo} info 
     * @param {routeBuildPipelineDataArgs<{}>} dataAndArgs
     * @param {genericFunction} failCb
     */
    triggerViewPanelNavigationalRouting(info, dataAndArgs, failCb){

        this.viewPanelsManager.requestRouteToQuery(info.routeQuery, dataAndArgs, failCb);
    }

    /**
     * DO NOT OVERRIDE. Use onViewPanelUIBind
     * @type {ViewPanelInstance<LAUNCH_DATA, HOST_PIPELINE_DATA>['bindPanelViewUIToListeners']}
     */
    bindPanelViewUIToListeners(launchParams, buildStageArgs){

        if(!buildStageArgs.isContentViewPreRendered){

            this.onViewPanelUIBind(launchParams, buildStageArgs);
        } else {

            console.log("View panel view had already been prerendered. No additional calls expected related to UI binding - listeners");
        }
    }

    /**
     * Override. Bind your listeners here. View already bound to DOM
     * @type {ViewPanelInstance<LAUNCH_DATA, HOST_PIPELINE_DATA>['onViewPanelUIBind']}
     */
    onViewPanelUIBind(launchParams, buildStageArgs){


    }

    /**
     * @type {ViewPanelInstance<LAUNCH_DATA, HOST_PIPELINE_DATA>['onViewPanelUpdateParams']}
     */
    onViewPanelUpdateParams(launchParams, buildStageArgs, localPipelineCb){

        this.currentlyActiveFullQuery = launchParams.routeParams?.filteredUrl?.query;
        this.setCurrentlyActiveViewPanelNavigation();

        //Check query updates and trigger request for data if necessary (developer prerogative)
        const updatedQueries = this.checkQueryUpdates(launchParams.routeParams);
        //Add to savedState the target before calling the final method to allow state restorer to jump to target automatically if valid jump
        const specSavedState = this.getSpecSavedState(launchParams.savedState, launchParams.routeParams?.target);
        this.onQueryDataUpdate(updatedQueries, launchParams.data, specSavedState);

        localPipelineCb(buildStageArgs);
    }

    /**
     * Leave implementation as super
     * 
     * @param {RouteParams} routeParams 
     */
    checkQueryUpdates(routeParams){

        /**
         * @type {GenericRouteQueryData<{}>}
         */
        let updatedQueries = {};
        if(this.updateQueryList && routeParams.queries){

            let updatedQueryValue;
            for(let query in this.updateQueryList){

                updatedQueryValue = routeParams.queries[query];
                if(updatedQueryValue !== this.updateQueryList[query]){

                    updatedQueries = {

                        ...updatedQueries,
                        [query]: updatedQueryValue
                    }
                }

                //Update query in main object
                this.updateQueryList[query] = updatedQueryValue;
            }
        }

        return updatedQueries;
    }

    /**
     * 
     * @param {SavedFragmentState} savedState 
     * @param {string} target
     * @returns {ExtSpecSavedFragmentState}
     */
    getSpecSavedState(savedState, target){

        return savedState ? { ...savedState[this.panelQuery], target: target } : null;
    }

    /**
     * OVERRIDE to check updates on queries, data sent through route call, and the saved fragment state
     * 
     * @type {ViewPanelInstance<LAUNCH_DATA, HOST_PIPELINE_DATA>['onQueryDataUpdate']}
     */
    async onQueryDataUpdate(updatedQueries, data, specSavedState){


    }

    /**
     * Override to consent to view panel changes
     * 
     * Call super to confirm consent. Else, call maintainViewPanel
     * 
     * @param {getViewPanelConsentCb} pipelineCb 
     */
    onViewPanelConsent(pipelineCb){

        pipelineCb({

            consent: true,
            panelsSavedState: this.getViewPanelState()
        });
    }

    /**
     * Override and call super to add your own properties
     * 
     * @returns {SavedFragmentState}
     */
    getViewPanelState(){

        console.warn("SAVING VIEW PANEL STATE");
        return {

            [this.getSaveStateID()]: {

                scrollPos: {

                    x: 1,
                    y: 1
                },
                smoothScroll: true,
                data: {}
            }
        }
    }

    getSaveStateID(){

        return this.panelQuery;
    }

    /**
     * 
     * @param {getViewPanelConsentCb} pipelineCb 
     */
    maintainViewPanel(pipelineCb){

        pipelineCb({ consent: false, panelsSavedState: null });
    }

    /**
     * 
     * @returns {FragmentLifeCycleInstance}
     */
    getLifeCycleObject(){

        return this.viewPanelLocalPipelineWorker.getLifeCycleObject();
    }

    /**
     * 
     * @param {genericFunction} cb 
     */
    destroyViewPanel(cb){

        this.detachPanelViewFromDOM(cb);
    }

    /**
     * 
     * @param {genericFunction} pipelineCb 
     */
    detachPanelViewFromDOM(pipelineCb){

        this.transitionsManager.runTransitions(this.getCloseTransitionsData_Workers_Queue(), () => {
            
            if(!this.panelRootViewDOMFixed && this.isViewPanelRootViewInitialized()){

                //Removing root and content
                const parent = document.getElementById(this.panelRootViewID).parentNode;
                parent.removeChild(document.getElementById(this.panelRootViewID));
            } else {
    
                //removing content only
                if(this.isViewPanelContentViewInitialized()){
    
                    //Removing content
                    const parent = document.getElementById(this.contentRootViewID).parentNode;
                    parent.removeChild(document.getElementById(this.contentRootViewID));
                }
            }
    
            this.panelViewListenersAttached = false; //Changing cause same might be triggered for next build, but view gone. But from the build cancel stack, should not be retriggered. So no need? Huh
            pipelineCb();
        });
    }
}

/**
 * FOR THE LOCAL PIPELINE WORKER
 */

/**
 * @typedef  {  { updateParams: "pseudo" } } PseudoViewPanelLocalPipelineWorkerStates
 * @typedef { { destroyed: 0, buildStarting: 1, initView: 2, bindView: 3, bindViewUtils: 4, cancellingBuild: 2, running: 3, consenting: 4, consentApproved: 5, consentDenied: 6, destroying: 7 } & PseudoViewPanelLocalPipelineWorkerStates } ViewPanelLocalPipelineWorkerStates
 * @typedef { import("./types/view_panel_local_pipeline_worker.d.ts").ViewPanelLocalPipelineWorkerBuildArgs<*, *> } ViewPanelLocalPipelineWorkerBuildArgs
 * @typedef { { buildStartSuccessDFA: {}, buildStartBuildCancelledDFA: {}, buildFinishedConsentDFA: {}, buildDestroyDFA: {} } } ViewPanelLocalPipelineWorkerDFAGroups
 */

/**
 * TYPES SPECIFIC TO ViewPanelLocalPipelineWorker
 */
/**
 * @typedef {import("./types/view_panel_local_pipeline_worker.d.ts").ViewPanelLocalPipelineWorkerConsentArgs<*, *>} ViewPanelLocalPipelineWorkerConsentArgs
 * @typedef {import("./types/view_panel_local_pipeline_worker.d.ts").ViewPanelLocalPipelineWorkerDestroyArgs<*, *>} ViewPanelLocalPipelineWorkerDestroyArgs
 */
/**
 * @template L_D, H_P_D
 * @extends {GenericBuildPipelineWorker<ViewPanelLocalPipelineWorkerStates, ViewPanelLocalPipelineWorkerBuildArgs, ViewPanelLocalPipelineWorkerDFAGroups, PseudoViewPanelLocalPipelineWorkerStates>}
 * 
 */
class ViewPanelLocalPipelineWorker extends GenericBuildPipelineWorker{

    /**
     * 
     * @param {ViewPanelLocalPipelineWorkerConstructorArgs<L_D, H_P_D>} args
     */
    constructor(args){

        /**
         * @type {GenericBuildPipelineWorkerConstructorArgs<ViewPanelLocalPipelineWorkerBuildArgs, ViewPanelLocalPipelineWorkerStates, ViewPanelLocalPipelineWorkerDFAGroups, PseudoViewPanelLocalPipelineWorkerStates> }
         */
        const superArgs = {

            asynchronousBuildDefinition: {

                defaultPipelineState: "destroyed",
                runAsynchronous: false
            },
            pseudoStates: {
 
                updateParams: "pseudo"
            },
            stateTransitionDefinition: {

                //DONE
                buildStartSuccessDFA: {

                    autoTriggerState: "destroyed",
                    root: "buildStarting",

                    buildStarting: {

                        prev: "destroyed",
                        next: "initView",
                        cb: (cbArgs) => {

                            //View panel is now running. All lifecycle aware methods and processes are allowed to run
                            this.fragmentLifeCycleObject.transitionLifeCycle(FragmentLifeCycleManager._LIFECYCLE_STAGES.running);

                            //Make buildStageArgs available

                            //In fragments, this would be an invocation to the FragmentBuilder. No longer need that. Invoke pseudo states for 
                            //building and initiating fragment
                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    },
                    initView: {

                        prev: "buildStarting",
                        next: "bindView",
                        cb: (cbArgs) => {

                            //Chained them cause makes no sense to separate in stages. Might read better but,,,,naaa
                            this.hostPanel.onViewPanelBuildStart(cbArgs.buildArgs.myBuildArgs.launchParams, cbArgs.buildArgs.myBuildArgs.buildStageArgs, (newBuildStageArgs) => {

                                this.hostPanel.onInitPanelView(cbArgs.buildArgs.myBuildArgs.launchParams, cbArgs.buildArgs.myBuildArgs.buildStageArgs, (newBuildStageArgs) => {

                                    cbArgs.buildArgs.myBuildArgs.buildStageArgs = {
    
                                        ...cbArgs.buildArgs.myBuildArgs.buildStageArgs,
                                        ...newBuildStageArgs
                                    }
                                    cbArgs.failNextCb({
    
                                        goToNext: true,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                });
                            });
                        },
                        fail: null
                    },
                    bindView: {

                        prev: "initView",
                        next: "bindViewUtils",
                        cb: (cbArgs) => {

                            this.hostPanel.onBindPanelView(cbArgs.buildArgs.myBuildArgs.launchParams, cbArgs.buildArgs.myBuildArgs.buildStageArgs, (newBuildStageArgs) => {

                                cbArgs.buildArgs.myBuildArgs.buildStageArgs = {

                                    ...cbArgs.buildArgs.myBuildArgs.buildStageArgs,
                                    ...newBuildStageArgs
                                }
                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            });
                        },
                        fail: null
                    },
                    bindViewUtils: {

                        prev: "bindView",
                        next: "updateParams",
                        cb: (cbArgs) => {

                            this.hostPanel.onBindPanelViewUtils(cbArgs.buildArgs.myBuildArgs.launchParams, cbArgs.buildArgs.myBuildArgs.buildStageArgs, (newBuildStageArgs) => {

                                //Update view ready call here - everything bound
                                //@ts-expect-error
                                this.fragmentLifeCycleObject.onViewReady();
                                cbArgs.buildArgs.myBuildArgs.buildStageArgs = {

                                    ...cbArgs.buildArgs.myBuildArgs.buildStageArgs,
                                    ...newBuildStageArgs
                                }
                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            });
                        },
                        fail: null
                    },
                    updateParams: {

                        //Continue from here
                        prev: "bindViewUtils",
                        next: "running",
                        cb: (cbArgs) => {

                            this.hostPanel.onViewPanelUpdateParams(cbArgs.buildArgs.myBuildArgs.launchParams, cbArgs.buildArgs.myBuildArgs.buildStageArgs, (newBuildStageArgs) => {

                                cbArgs.buildArgs.myBuildArgs.buildStageArgs = {

                                    ...cbArgs.buildArgs.myBuildArgs.buildStageArgs,
                                    ...newBuildStageArgs
                                }
                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            });
                        },
                        fail: null
                    },
                    running: {

                        prev: "updateParams",
                        next: null,
                        cb: (cbArgs) => {

                            //Pipeline cb made in successCb. MAKES SENSE. End of pipeline
                            //Call this to trigger complete cb if you had sth to do there
                            cbArgs.failNextCb({

                                goToNext: false,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                },
                //TO TEST
                buildStartBuildCancelledDFA: {

                    root: "cancellingBuild",
                    cancellingBuild: {

                        prev: null, //Can be any stage apart from complete
                        next: "destroyed", //So that next build autoTriggered
                        cb: (cbArgs) => {

                            //Transition Fragment Lifecycle to destroyed until next build starts
                            //Can have a new state cancelled, but no functional changed now. Just semantics
                            this.fragmentLifeCycleObject.transitionLifeCycle(FragmentLifeCycleManager._LIFECYCLE_STAGES.cancelled);

                            //Detach view if had attached
                            //Will do this cause developer has flexibility to load different views with 
                            //different build params (route params for instance)
                            if(this.hostPanel.isViewPanelContentViewInitialized()){

                                this.hostPanel.detachPanelViewFromDOM(() => {

                                    cbArgs.failNextCb({

                                        goToNext: true,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                });
                            } else {

                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: null
                    },
                    destroyed: {

                        prev: "cancellingBuild",
                        next: null,
                        cb: (cbArgs) => {

                            //We'll main pipeline we're done in complete cb. MAKES SENSE
                            // cbArgs.buildArgs.myBuildArgs.mainPipelineCb();
                            cbArgs.failNextCb({

                                goToNext: false,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                },

                buildFinishedConsentDFA: {

                    autoTriggerState: "running",
                    root: "consenting",

                    consenting: {

                        prev: "running",
                        next: "consentApproved",
                        superPipelineLock: true,
                        cb: (cbArgs) => {

                            /**
                             * @type {ViewPanelLocalPipelineWorkerConsentArgs}
                             */
                            //@ts-ignore
                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;

                            //Request the panel for consent
                            this.hostPanel.onViewPanelConsent((consentInfo) => {

                                //Save consent info to args
                                myBuildArgs.consentParams = consentInfo;
                                cbArgs.buildArgs.myBuildArgs = myBuildArgs;

                                //go to next depending on consent approval
                                cbArgs.failNextCb({

                                    goToNext: consentInfo.consent,
                                    buildArgs: cbArgs.buildArgs
                                });
                            });
                        },
                        fail: "consentDenied"
                    },
                    consentApproved: {

                        prev: "consenting",
                        next: null,
                        cb: (cbArgs) => {

                            //Trigger complete. Triggered if going to next but undefined next
                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    },
                    consentDenied: {

                        prev: "consenting",
                        next: "running",
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    },
                    running: {

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

                buildDestroyDFA: {

                    autoTriggerState: "consentApproved",
                    root: "destroying",

                    destroying: {

                        prev: "consentApproved",
                        next: "destroyed",
                        cb: (cbArgs) => {

                            //View panel is now being destroyed. All lifecycle aware methods and processes are to stop
                            this.fragmentLifeCycleObject.transitionLifeCycle(FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed);

                            this.hostPanel.destroyViewPanel(() => {

                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            });
                        },
                        fail: null
                    },
                    destroyed: {

                        prev: "destroying",
                        next: null,
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
        }
        super(superArgs);
        this.hostPanel = args.hostPanel;

        //Lifecycle defined here
        //@ts-ignore
        this.fragmentLifeCycleObject = this.buildLifeCycleObject(args.hostFragmentLifeCycleObject);
    }

    /**
     * //TEST BUILD START WORKING
     * Called to trigger view panel build
     * @param {import("./types/view_panel_local_pipeline_worker.d.ts").OpenViewPanelWorkerArgs<L_D, H_P_D>} args
     */
    buildViewPanel(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: null
            },
            failStartCb: () => {

                console.error("Failed to build view panels")
            },
            completeCb: () => {

                console.warn("View panel build complete");
                args.mainPipelineCb();
            }
        });
    }

    /**
     * Called to trigger view panel build
     * @param {import("./types/view_panel_local_pipeline_worker.d.ts").OpenViewPanelWorkerArgs<L_D, H_P_D>} args
     */
    cancelViewPanelBuild(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: null
            },
            failStartCb: () => {

                console.error("Failed to cancel view panel build")
            },
            completeCb: () => {

                console.warn("View panel build cancelled");
                args.mainPipelineCb();
            },
            //@ts-ignore No need to fill the other properties. Leave at null
            targetDFAInfo: {

                dfaGroupKey: "buildStartBuildCancelledDFA"
            }
        });
    }

    /**
     * 
     * @param {ViewPanelLocalPipelineWorkerConsentArgs} args 
     */
    requestViewPanelConsent(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: null
            },
            failStartCb: () => {

                console.error("Failed to get consent for view panel");
                args.consentCb({ consent: false, panelsSavedState: null });
            },
            /**
             * 
             * @param {ViewPanelLocalPipelineWorkerConsentArgs} finalArgs 
             */
            completeCb: (finalArgs) => {

                console.warn("Completed consent ask for panel");
                args.consentCb(finalArgs.consentParams);
            }
        });
    }

    /**
     * 
     * @param {ViewPanelLocalPipelineWorkerDestroyArgs} args 
     */
    destroyViewPanel(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: null, //AUTO GENERATE THIS???? BETTER
            },
            //@ts-ignore Other fields not needed. Prioritize autoTrigger to allow autoTrigger calls (not necessary since DFA same anyway. But cool using the feature)
            targetDFAInfo: {

                dfaGroupKey: "buildDestroyDFA",
                prioritizeAutoTrigger: true,
            },
            failStartCb: () => {

                console.error("Failed to start destroy pipeline for view panel");
            },
            completeCb: () => {

                args.destroyCb();
            }
        })
    }

    /**
     * builds and sets the lifecycleobject for the view panel
     * Runs separate from fragment, but if for fragment provided, runs itself based on the fragment's lifecycle stage
     * 
     * Build its lifecycle based on the fragment's lifecycle. Applies for frag attached. Otherwise, app-view-context based (App-Context represents larger app context. Affects complete views, i.e complete overhaul. Say, was viewing admin then back to client. Or sign up page shows up and changes app context)
     * Bind lifecycle object and allow runs if valid
     * @param {import("FragmentLifeCycleManager").FragmentLifeCycleManagerInstance} hostFragmentLifeCycleObject
     * @returns {import("FragmentLifeCycleManager").FragmentLifeCycleManagerInstance}
     */
    buildLifeCycleObject(hostFragmentLifeCycleObject){

        /**
         * @type {import("FragmentLifeCycleManager").FragmentLifeCycleManagerInstance}
         */
        const fragmentLifeCycleObject = new FragmentLifeCycleManager();
        //Congruency checks. Preserve. Important
        if(hostFragmentLifeCycleObject){

            //Listen to changes in host fragment lifecycle. 
            //Basically checking if algo is correct for running and destory triggers and expected state matches
            if(hostFragmentLifeCycleObject.currentLifeCycleStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.running){

                hostFragmentLifeCycleObject.registerLifeCycleListeners({

                    onFragmentRunning: () => {

                        throwLifecycleCongruencyError("Triggered onFragmentRunning for host fragment in view panel. Should not be triggered. View panels built last after fragment thus fragment lifecycle call for running already made and previous listeners must have been deregistered onFragmentDestroyed");
                    },
                    onFragmentDestroyed: () => {

                        //This should also have transitioned to destroy when the host fragment destroys.
                        //By algo, both should already be at destroy. So, throw error if not.
                        if(this.fragmentLifeCycleObject.currentLifeCycleStage !== FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed){

                            if(this.fragmentLifeCycleObject.currentLifeCycleStage === FragmentLifeCycleManager._LIFECYCLE_STAGES.running){

                                console.warn("THIS VIEW PANEL WILL BE AUTOMATICALLY DESTROYED. Host fragment transitioned to destroy. If not, should be an error\n\nPossibly arising from the view panel being active, consenting to a destroy triggered by route from the host, then the host accepting the destroy.")
                            } else {

                                //Update to consenting sending a false, destroyed bouncing with true. To avoid the
                                //issue where might be consenting, so paused, then host assumes is a go. Will cause this congruency error
                                //MUST MATCH in destroy
                                console.warn("Should already be in destroy considering duplicate destroy request bounce")
                                throwLifecycleCongruencyError("By pipeline build algo, both fragment and view panel should already be at destroy.\nHost fragment triggers view panels to destroy first");
                            }
                        }
                    },
                    onFragmentCancelled: () => {

                        //DO NOTHING. No congruity issues here. Panel can be cancelled when frag is not
                        //Also, frag can be cancelled but panel still building
                        //So, what happens is, if frag destroyed, MUST destroy panels as well. Hooked up that way
                        //If frag cancelling then rebuilding, rebuild will retrigger pipeline so okay
                    }
                })
            } else {

                throwLifecycleCongruencyError("Should not be building a view panel of a host fragment that's destroyed - lifecycle inferred, which should be correct");
            }
        }

        return fragmentLifeCycleObject;

        /**
         * 
         * @param {string} msg 
         */
        function throwLifecycleCongruencyError(msg){

            throw new Error(`${msg}\nLifecycle changes can only be made by respective local pipeline workers of fragment or view panel. Ensure this is being followed`);
        }
    }

    /**
     * @type {import("./types/view_panel_local_pipeline_worker.d.ts").ViewPanelLocalPipelineWorkerInstance<ViewPanelLocalPipelineWorkerStates, ViewPanelLocalPipelineWorkerBuildArgs, ViewPanelLocalPipelineWorkerDFAGroups, PseudoViewPanelLocalPipelineWorkerStates>['getLifeCycleObject']}
     */
    getLifeCycleObject(){

        return this.fragmentLifeCycleObject;
    }
}

if(false){
     
    /**
     * Taking most design from previous controller
     * @type {import("ViewPanel").ViewPanelConstructor}
     */
    const check = ViewPanel;

    /**
     * @type {import("./types/view_panel_local_pipeline_worker.d.ts").ViewPanelLocalPipelineWorkerConstructor<ViewPanelLocalPipelineWorkerStates, ViewPanelLocalPipelineWorkerBuildArgs, ViewPanelLocalPipelineWorkerDFAGroups, PseudoViewPanelLocalPipelineWorkerStates>}
     */
    const checkWorker = ViewPanelLocalPipelineWorker;
}

export default ViewPanel;