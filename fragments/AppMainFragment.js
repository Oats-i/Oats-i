//@ts-check
/**
 * Base class of a main fragment in the app
 */
import LifecycleRemoteRequestUtils from "../utils/remote-requests/lifecycle/lifecycle_remote_request_utils";
import RemoteUILoader from "./utils/remote-ui-loader/remote_ui_loader_script";
import MainRouter from "../router/main_router";
import FragmentLifeCycleManager from "./lifecycle/fragment_lifecycle_manager";
import TimedFunctionUtils from "./utils/timed-functions/timed_functions_utils";
import MainFragmentComponent from "./utils/ui-components/main-fragment/main_fragment";

class AppMainFragment{

    /**
     * 
     * MainRouter used to allow main fragment to request for routing to children
     * @param {AppMainFragmentConstructorArgs} args
     */
    constructor(args){

        /**
         * @type {LocalFragmentRoutingInfo[]}
         */
        this.localRoutingInfos = args.localRoutingInfos;
        /**
         * @type {string}
         * Considering changing this to path unique value. More dynamic. So, passed dynamically on build. Only problem if fragment not reinflating? test with view panel
         */
        this.viewID = args.viewID;
        /**
         * @type {MainRouter}
         */
        this.mainRouter = args.mainRouter;
        this.localPipelineWorker = new LocalPipelineWorker(this);

        this.remoteUILoader = new RemoteUILoader(new LifecycleRemoteRequestUtils(this.getLifeCycleObject()));
        this.viewListenersAttached = false;
        this.currentlyActiveRoute = null;
        this.currentlyActiveNavId = null;

        //Don't annotate the type of this. Causing weird typescript conflict between implementation and declaration files
        //So, can't have an implemented member or method NOT in declaration file. Limiting imo and cause of frustration due to baseless errors.
        //Developer may want some APIs not exposed directly. Yes, only compile time limitation, but preferred
        /**
         * @type {ViewPanelsManagerInstance}
         */
        this.viewPanelsManager = null;

        /**
         * @type {UpdatedQueryParams}
         */
        this.updatedQueryParamsList = this.buildNormalizedUpdatedQueryParamsList(args.queryParams);
        /**
         * @type {import("TimedFunctionUtils").TimedFunctionUtilsInstance}
         */
        this.timedFunctionsUtils = new TimedFunctionUtils({ fragmentLifecycleInstance: this.getLifeCycleObject() });
    }

    /**
     * 
     * Extract the parameter and query names and add them to the list of params and queries to watch
     * @param {UpdatedQueryParams} queryParams
     * @returns {UpdatedQueryParams}
     */
    buildNormalizedUpdatedQueryParamsList(queryParams){

        if(queryParams){

            //Normalize params
            for(let param in queryParams.params){

                queryParams.params[param] = undefined;
            }

            //Normalize queries
            for(let query in queryParams.queries){

                queryParams.queries[query] = undefined;
            }
        }

        return queryParams;
    }

    /**
     * Called to initialize view.
     * 
     * First build stage
     * 
     * @param {string} activeRoute
     * @param {initViewBuilderCb} builderCb 
     */
    onInitView(activeRoute, builderCb){

        //Set currently active route
        this.currentlyActiveRoute = activeRoute;

        //Start initialization flow
        if (!this.isViewInitialized()){

            //No other call after this. Async method. Will fail terribly if flow not well considered
            this.initializeView(builderCb);
        } else {

            //Callback to transition to bind view
            //use flag to set the right one always
            builderCb({ isServerSide: true, uiTemplate: undefined });
        }
    }

    /**
     * Check whether the view for the fragment has been initialized/loaded or not.
     * 
     * @returns {boolean} Whether the view for this fragment has been initialized or not
     */
    isViewInitialized(){

        return !!document.getElementById(this.viewID); //Only exists if view has been bound to DOM
    }

    /**
     * Override as developer
     * 
     * Initializes the view for the fragment. You can source it remotely using a promise (you must wait for this promise)
     * or use a template already shipped in the code
     * 
     * Override and use appropriately
     * 
     * Finally, call onViewInitSuccess with the view as plain text html
     * @param {initViewBuilderCb} builderCb
     */
    async initializeView(builderCb){


    }

    /**
     * Loads a remote UI resource in plain text
     * @param {RequestOptions} reqOptions 
     * 
     * @returns {Promise<string>} A promise that resolves with the ui template in plain text html
     */
    loadRemoteUI(reqOptions){

        return this.remoteUILoader.reqUIResource(reqOptions);
    }

    /**
     * Call after the UI has been loaded successfully to start binding to DOM
     * 
     * DO NOT OVERRIDE
     * 
     * @param {string} uiAsHTMLText 
     * @param {initViewBuilderCb} builderCb
     */
    onViewInitSuccess(uiAsHTMLText, builderCb){

        /**
         * @todo
         */
        // MIGRATE THIS CALL TO AFTER UI BOUND
        this.setCurrentlyActiveNavigation();
        //Call builderCb with uiAsHTMLText as arg. Will transition to bindView stage
        builderCb({ uiTemplate: uiAsHTMLText, isServerSide: false });
    }

    /**
     * Call if you encounter some error loading the view
     * 
     * Modify to tell router that building the route failed
     * 
     * ACTUALLY, with the new pipeline, will add a fallback to show error and user can retry and build can continue
     * 
     * YES. Otherwise, allow them to navigate elsewhere. Pipeline not superlocked so can do that
     *
     * @param {object} err The loading error
     * @param {initViewBuilderCb} cb 
     */
    onViewInitFail(err, cb){


    }

    /**
     * Called to bind view
     * 
     * @param {string} uiTemplate 
     * @param {genericFunction} builderCb
     */
    onBindView(uiTemplate, builderCb){

        if(uiTemplate){

            this.bindNewUIToDOM(uiTemplate);
        }

        builderCb();
    }

    /**
     * Called to bind view listeners
     * 
     * @param {boolean} serverSideRendered 
     * @param {genericFunction} builderCb 
     */
    onBindViewUtils(serverSideRendered, builderCb){

        this.bindUIListeners(serverSideRendered);
        this.bindLocalRoutingInfoToNavigation();

        builderCb();
    }

    /**
     * DO NOT RUN THIS ASYNCHRONOUSLY
     * 
     * Will mess up dry update params builds where we lock flow in main thread since no data job is being done
     * So, CALLBACK NOT FOR ASYNCHRONOUS REASONS
     * @param {RouteParams} routeParams 
     * @param {{}} data
     * @param {ExtSpecSavedFragmentState} savedState
     * @param {genericFunction} buildCb 
     * @param {boolean} [isServerSide]
     */
    onUpdateParams(routeParams, data, savedState, buildCb, isServerSide){

        //Called to set the active one. Dictated by currently active route
        this.currentlyActiveRoute = routeParams.filteredUrl.baseUrl;
        this.setCurrentlyActiveNavigation();

        //Check query params updates and trigger loadData(paramUpdates, savedState) - if param update null, nothing was updated
        const updatedQueryParams = this.checkQueryParamsUpdates(routeParams);
        //Add to savedState the target before calling the final method to allow state restorer to jump to target automatically if valid jump
        const specSavedState = this.getSpecSavedState(savedState);
        if(specSavedState){

            specSavedState.target = routeParams.filteredUrl.target
        }
        this.onQueryParamsDataUpdate(updatedQueryParams, data, specSavedState, routeParams, isServerSide);

        buildCb();
    }

    /**
     * Leave implementation as super. 
     * @param {boolean} isServerSideRender Flag whether the view had been rendered freshly in fragment 
     */
    bindUIListeners(isServerSideRender){

        if(!this.viewListenersAttached){

            if(isServerSideRender){

                console.warn(`The main fragment view with view ID ${this.viewID} was server side rendered`);
            }
            this.onUIBind(isServerSideRender);
            this.viewListenersAttached = true;
        }
    }

    /**
     * Internal. DO NOT OVERRIDE 
     * 
     * Avoid asynchronous calls here, before UI is bound to the DOM. 
     * Might lead to unexpected behavior with child fragments
     * @param {string} newUITemplate 
     */
    bindNewUIToDOM(newUITemplate){

        let wrapper = document.createElement("div");
        wrapper.id = this.viewID;
        wrapper.innerHTML = newUITemplate;
        let mainFragmentComponent = this.getMainFragmentComponent();
        mainFragmentComponent.insertAdjacentHTML("beforeend", wrapper.outerHTML);
    }

    /**
     * Internal
     * 
     * @returns {MainFragmentComponent}
     */
    getMainFragmentComponent(){

        let mainFragmentComponent = document.getElementsByTagName("main-fragment");
        if(mainFragmentComponent.length > 1){

            console.warn("Markup error. Multiple <main-fragment> components. Only first in the hierarchy will be used");
            console.log(mainFragmentComponent);
        } else if(mainFragmentComponent.length < 1){

            console.error("<main-fragment> component missing. Fragment UI cannot be bound. Please add it to the markup");
            throw new Error("<main-fragment> component missing. Fragment UI cannot be bound. Please add it to the markup");
        }

        return mainFragmentComponent[0];
    }

    /**
     * @return {HTMLElement}
     */
    getContentNode(){

        return document.getElementById(this.viewID);
    }

    /**
     * Override. Process attached view. For instance, add listeners
     * 
     * @param {boolean} serverSideRendered Flag whether the current view had been server side rendered
     */
    onUIBind(serverSideRendered){


    }

    /**
     * Uses the local routing information to bind navigational controls and their on click actions
     * 
     * Leave implementation as super
     */
    bindLocalRoutingInfoToNavigation(){

        if(this.localRoutingInfos){

            this.localRoutingInfos.forEach((routingInfo) => {

                document.getElementById(routingInfo.navBtnID).addEventListener("click", this.triggerNavigationalRouting.bind(this, routingInfo.navBtnID, routingInfo.route));
            });
        }
    }

    /**
     * Triggers the app's routing based on a navigational control click
     * 
     * Override if you want to perform some custom operation
     * 
     * Calling super confirms routing. Note that onDestroyView won't be necessarily called depending on route changes
     * 
     * @param {string} navBtnId 
     * @param {string} route 
     */
    triggerNavigationalRouting(navBtnId, route){

        this.mainRouter.routeTO(route);
    }

    /**
     * Set the navigational control that is currently active
     * 
     * @param {string} [navBtnId] The ID of the currently active nav button. If none is provided, the algo will pick based on the currently active route
     */
    setCurrentlyActiveNavigation(navBtnId) {

        if(this.localRoutingInfos){

            //No nav btn id provided? Get one based on currently active route
            if(!navBtnId){

                //Set Id of currently active
                this.localRoutingInfos.forEach((routingInfo) => {

                    if(this.currentlyActiveRoute.startsWith(routingInfo.baseActiveRoute)){

                        navBtnId = routingInfo.navBtnID;
                    }
                });
            }
            
            if(document.getElementById(navBtnId)){

                if(this.currentlyActiveNavId){

                    document.getElementById(this.currentlyActiveNavId).setAttribute("navigation-state", "inactive");
                }
    
                document.getElementById(navBtnId).setAttribute("navigation-state", "active");
                this.currentlyActiveNavId = navBtnId;
            }
        }
    }

    /**
     * 
     * Leave implementation as super
     * 
     * Checks if you have to update your locals 
     * @param {RouteParams} routeParams
     * @returns {UpdatedQueryParams}
     */
    checkQueryParamsUpdates(routeParams){

        /**
        * @type {UpdatedQueryParams}
        */
        let updatedParamsQueries = { params: {}, queries: {} };
        if(this.updatedQueryParamsList){

            //Check params first
            let updatedParamValue;
            for(let param in this.updatedQueryParamsList.params){

                updatedParamValue = routeParams.params ? routeParams.params[param] : undefined;
                if(updatedParamValue !== this.updatedQueryParamsList.params[param]){
    
                    updatedParamsQueries.params = {

                        ...updatedParamsQueries.params,
                        [param]: updatedParamValue
                    }
                }
                //Update param in main object
                this.updatedQueryParamsList.params[param] = updatedParamValue;
            }

            //Check queries next
            let updatedQueryValue;
            for(let query in this.updatedQueryParamsList.queries){

                updatedQueryValue = routeParams.queries ? routeParams.queries[query] : undefined;
                if(updatedQueryValue !== this.updatedQueryParamsList.queries[query]){
    
                    updatedParamsQueries.queries = {

                        ...updatedParamsQueries.queries,
                        [query]: updatedQueryValue
                    }
                }

                //Update query in main object
                this.updatedQueryParamsList.queries[query] = updatedQueryValue;
            }
        }

        //Check if there are any changes and push the updatedParamsQueries object
        return updatedParamsQueries;
    }

    /**
     * 
     * @param {SavedFragmentState} savedState 
     * @returns {ExtSpecSavedFragmentState}
     */
    getSpecSavedState(savedState){

        return savedState ? savedState[this.viewID] : undefined;
    }

    /**
     * Called with updated queries and params, data from the route call, and the savedState
     * 
     * Override to check updates to query params, data sent through the route call, and saved state
     * 
     * Call super to properly trigger routeBuilt view panel builds. restore state?? Do so individually
     * 
     * @param {UpdatedQueryParams} updatedQueryParams
     * @param {{}} data
     * @param {ExtSpecSavedFragmentState} savedState
     * @param {RouteParams} routeParams
     * @param {boolean} [isServerSide]
     */
    async onQueryParamsDataUpdate(updatedQueryParams, data, savedState, routeParams, isServerSide){

        this.requestViewPanelBuildFromQuery(updatedQueryParams.queries, {
            
            //Data here is of type LaunchViewPanelParamsData<{}, {}>
            //So please, cast then pass if purpose is to invoke a view panel
            data: data,
            routeParams: routeParams,
            savedState: savedState
        });
    }

    /**
     * @typedef {{ data: LaunchViewPanelParamsData<{}, {}>, routeParams: RouteParams, savedState: ExtSpecSavedFragmentState }} ViewPanelBuildArgs
     * New Way to build view panel. Other option by name is deprecated
     * @param {RouteQueryData} updatedRouteQueries 
     * @param {ViewPanelBuildArgs} buildArgs
     */
    requestViewPanelBuildFromQuery(updatedRouteQueries, buildArgs){

        if(this.viewPanelsManager){

            //Pass route params
            return this.viewPanelsManager.openViewPanel({
                
                queries: updatedRouteQueries, 
                data: buildArgs.data,
                routeParams: buildArgs.routeParams, //Work from definition of onUpdate
                savedState: buildArgs.savedState ? buildArgs.savedState.viewPanelSaveState : null
            });
        } else {

            console.warn(`Fragment with viewID ${this.viewID} has no view panels manager initialized`);
        }
    }

    /**
     * Call if you want to open a view panel by panel name
     * @template T, RD
     * @param {string} panelName
     * @param {LaunchViewPanelParams<T, RD>} args 
     * @returns 
    */
    // @param {RouteQueryData} updatedRouteQueries 
    requestViewPanelBuildByName(panelName, args){

        return this.viewPanelsManager.openViewPanelByName(panelName, args);
    }

    /**
     * Call if you want to open a view panel directly given its builder. 
     * 
     * If launched by panel name only, supply it in queries format. Still works
     * @template {BaseViewPanelConstructorArgs} T
     * @template LD, HPD
     * @param {ViewPanelBuilderInstance<T, LD, HPD>} viewPanelBuilder 
     * @param {LaunchViewPanelParams<LD, HPD>} launchViewPanelParams 
     * @returns 
     */
    requestDirectViewPanelBuild(viewPanelBuilder, launchViewPanelParams){

        return this.viewPanelsManager.directOpenViewPanel(viewPanelBuilder, launchViewPanelParams);
    }

    /**
     * Automatic scroll restoration only done for last in node. Done in MainRoutingPipeline. Done in reference to body
     * 
     * Call this if you're doing it on a different parent with a unique id
     * 
     * @param {ExtSpecSavedFragmentState} savedState 
     */
    restoreState(savedState){

        if(savedState){

            //Prioritize scroll position
            if(savedState.scrollPos){

                //Smooth scroll to scroll position
                this.getScrollParent().scroll({

                    top: savedState.scrollPos.y,
                    left: savedState.scrollPos.x,
                    behavior: "smooth"
                });
            } else if(savedState.target){

                //Smooth scroll to target
                try{

                    document.getElementById(`${savedState.target}`).scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                } catch(err){

                    console.error(err);
                }
            }
        }
    }

    /**
     * 
     * @param {string} route 
     */
    triggerViewPanelRouting(route){

        this.mainRouter.routeTO(route, { skipScrollStateRestore: true });
    }

    /**
     * Tell whether the fragment can be destroyed or not
     * 
     * Override and call super if you're okay destroying. Else call maintainFragment()
     * 
     * @param {routingPipelineConsentCb} routingPipelineCb 
     * @param {NewRouteConsentInfo} newRouteInfo
     */
    onFragmentConsent(routingPipelineCb, newRouteInfo){

        console.log(`Asking fragment with viewID ${this.viewID} to consent`);

        //If agrees to destroy in fragment level, ask view panel. Well, NOPE
        /**
         * View Panels must consent after fragment consents (since calling super does this) or before in normal flow
         */
        if(this.viewPanelsManager){

            this.viewPanelsManager.getViewPanelsConsent(newRouteInfo, (consentInfo) => {

                if(consentInfo.consent){
    
                    const savedState = this.saveState();
                    savedState[this.getSaveStateID()].viewPanelSaveState = consentInfo.panelsSavedState;
                    confirmRouteChangeConsent(savedState)
                } else {
    
                    this.maintainFragment(routingPipelineCb);
                }
            });
        } else {

            confirmRouteChangeConsent(this.saveState());
        }

        /**
         * 
         * @param {SavedFragmentState} savedState 
         */
        function confirmRouteChangeConsent(savedState){

            routingPipelineCb({consent: true, savedState: savedState});
        }
    }

    /**
     * Leave implementation as super
     * 
     * Call if you want to maintain the fragment
     * 
     * @param {routingPipelineConsentCb} routingPipelineCb 
     */
    maintainFragment(routingPipelineCb){

        routingPipelineCb({ consent: false, savedState: null });
    }
    
    /**
     * Internal. Do not override
     * @param {fragmentDestroyCb} cb
     */
    destroyFragment(cb){

        //Tell viewpanels manager to destory everything
        if(this.viewPanelsManager){

            this.viewPanelsManager.destroyAllViewPanels(() => {

                this.detachViewFromDOM();
                cb();
            });
        } else {
    
            this.detachViewFromDOM();
            cb();
        }
    }

    /**
     * Override if you want to save state.
     * 
     * return value from defaultSaveState() with your data as the argument
     * @returns {SavedFragmentState}
     */
    saveState(){

        // return null;
        return this.defaultSaveState();
    }

    /**
     * 
     * @param {MyDataFragmentState} myData 
     * @returns {SavedFragmentState}
     */
    defaultSaveState(myData){

        const id = this.getSaveStateID();
        // console.warn("SAVE STATE: RETRIEVING " + this.getScrollY() + " ::: " + ((document.documentElement && document.documentElement.scrollTop) || 
        // document.body.scrollTop));
        return {

            [id]: {

                scrollPos: {

                    x: this.getScrollX(),
                    y: this.getScrollY()
                },
                smoothScroll: true,
                data: myData
            } 
        };
    }

    getSaveStateID(){

        return this.viewID;
    }

    /**
     * @private
     * 
     * Get scroll X in parent
     * 
     * @returns {number}
     */
    getScrollX(){

        return this.getScrollParent().scrollLeft;
    }

    /**
     * @private
     * 
     * Get scroll Y in parent
     * 
     * @returns {number}
     */
    getScrollY(){

        return this.getScrollParent().scrollTop;

        //PLEASE. Call this BEFORE you destroy the view. Anyway, learnt that offsetTop - top from bounding client rect === scrollTop
    }

    /**
     * Override to specify a different scroll parent
     * 
     * @returns {HTMLElement}
     */
    getScrollParent(){

        return document.body;
    }

    /**
     * Removes the view from DOM. 
     * 
     * Override this is if you wish for a different behavior or animate the view before removing it 
     * from DOM by calling super
     */
    detachViewFromDOM(){

        if(this.isViewInitialized()){

            this.getMainFragmentComponent().removeChild(this.getContentNode());
            this.viewListenersAttached = false; //Changing to this because view gone
        }
    }

    /**
     * 
     * @returns {FragmentLifeCycleInstance}
     */
    getLifeCycleObject(){

        return this.localPipelineWorker.getLifeCycleObject();
    }
}


class LocalPipelineWorker{

    /**
     * 
     * @param {AppMainFragment} hostFragment 
     */
    constructor(hostFragment){

        /**
         * @type {AppMainFragment}
         */
        this.hostFragment = hostFragment;
        this.fragmentBuilder = new FragmentBuilder(hostFragment);
        this.currentFragmentState = LocalPipelineWorker._FRAGMENT_STATES.destroyed;
        this.fragmentLifeCycleObject = new FragmentLifeCycleManager();
    }

    static get _FRAGMENT_STATES(){ //Have buildStages too. To help with correct build cancelling....AND, bundle actual build calls in util classes that get fragment instance and update its instance vars? Makes sense. Then not store their instances in frag to keep these methods completely away from programmer. Yes. Can be static classes too btw. Make this the case for routing pipeline btw. Or routing pipeline instance, but rest static class with cb to return operation data that's updated. Makes sense....So store functions only and freeze. OR JUST FREEZE IT...YEA...

        return { destroyed: 0, building: 1, cancellingBuild: 2, running: 3, consenting: 4 };
    }

    /**
     * 
     * @param {number} state 
     * @returns 
     */
    static getNameofFragmentState(state){

        let name;
        for(let key in LocalPipelineWorker._FRAGMENT_STATES){

            if(LocalPipelineWorker._FRAGMENT_STATES[key] === state){

                name = key;
                break;
            }
        }

        return name ? name : "undefined " + state;
    }

    /**
     * Called by MainRoutingPipeline to build the fragment route
     * 
     * Uses localBuildingState to see if route already built and thus only fire param changes check and move on
     * @param {RouteParams} routeParams
     * @param {SavedFragmentState} savedState
     * @param {{}} data
     * @param {genericFunction} cb
     */
    buildFragmentRoute(routeParams, savedState, data, cb){

        /**
         * @type {FragmentPipelineWorkerArgs}
         */
        const args = {

            routeParams: routeParams,
            savedState: savedState,
            data: data,
            mainPipelineCb: cb
        };
        if(!this.isFragmentRunning()){

            //Fragment not running. Doing a full build
            this.transitionFragmentState(LocalPipelineWorker._FRAGMENT_STATES.building, args);
        } else {

            //Fragment is running. This new request only has updated params or data then
            //This MUST run synchronously
            this.fragmentBuilder.updateRunningParamsAndData(args, () => {

                cb();
            });
        }
    }

    /**
     * 
     * @param {genericFunction} cb 
     */
    cancelFragmentRoute(cb){

        //Transition state to cancellingBuild
        this.transitionFragmentState(LocalPipelineWorker._FRAGMENT_STATES.cancellingBuild, { cb: cb });
    }

    /**
     * Called by MainRoutingPipeline to get the destroy consent of the fragment hosting this local pipeline worker
     * @param {routingPipelineConsentCb} cb 
     */
    getRouteChangeConsent(cb, newRouteInfo){

        this.transitionFragmentState(LocalPipelineWorker._FRAGMENT_STATES.consenting, { cb: cb, newRouteInfo: newRouteInfo });
    }

    /**
     * Called by MainRoutingPipeline
     * 
     * Inform a previously consented fragment that the route has been maintained by a parent
     * OR
     * It was consenting to a route where it is not being destroyed, and the consent was either approved or not. Regardless, running state valid
     * Therefore, transition the child's state back to running
     * 
     * RATIONALE FOR THIS STRUCTURE
     * 
     * Imagine a route /newBlog/:blogId/addMedia
     * The addMedia fragment is the last node, but there's the :blogId fragment that probably is
     * rendering and managing the view of WYSIWYG editor. If all consenting powers rest on the last node,
     * the user's unsaved work will get lost. Thus, all in destruction stack MUST consent to destruction
     * This algorithm allows for more flexible architectures
     */
    routeMaintained(){

        this.transitionFragmentState(LocalPipelineWorker._FRAGMENT_STATES.running);
    }

    /**
     * Called by MainRoutingPipeline to destroy the fragment
     * @param {fragmentDestroyCb} cb
     */
    destroyFragment(cb){

        this.transitionFragmentState(LocalPipelineWorker._FRAGMENT_STATES.destroyed, { cb: cb });
    }

    /**
     * 
     * @param {number} newState 
     * @param {{}} args
     */
    transitionFragmentState(newState, args){
        
        //Error handling
        if(newState === this.currentFragmentState){

            throwStateTransitionError(this.currentFragmentState, "valid opposite states");
        }

        else if(this.currentFragmentState === LocalPipelineWorker._FRAGMENT_STATES.destroyed){

            if(newState !== LocalPipelineWorker._FRAGMENT_STATES.building){

                throwStateTransitionError(this.currentFragmentState, LocalPipelineWorker.getNameofFragmentState(LocalPipelineWorker._FRAGMENT_STATES.building));
            }
        } 

        else if(this.currentFragmentState === LocalPipelineWorker._FRAGMENT_STATES.building){

            if(newState !== LocalPipelineWorker._FRAGMENT_STATES.cancellingBuild && newState !== LocalPipelineWorker._FRAGMENT_STATES.running){

                const msg = `${LocalPipelineWorker.getNameofFragmentState(LocalPipelineWorker._FRAGMENT_STATES.destroyed)} or ${LocalPipelineWorker.getNameofFragmentState(LocalPipelineWorker._FRAGMENT_STATES.running)}`;
                throwStateTransitionError(this.currentFragmentState, msg);
            }
        }

        else if(this.currentFragmentState === LocalPipelineWorker._FRAGMENT_STATES.cancellingBuild){

            if(newState !== LocalPipelineWorker._FRAGMENT_STATES.destroyed){

                throwStateTransitionError(this.currentFragmentState, LocalPipelineWorker.getNameofFragmentState(LocalPipelineWorker._FRAGMENT_STATES.destroyed));
            }
        }
        
        else if(this.currentFragmentState === LocalPipelineWorker._FRAGMENT_STATES.running){

            if(newState !== LocalPipelineWorker._FRAGMENT_STATES.consenting && newState !== LocalPipelineWorker._FRAGMENT_STATES.destroyed && newState !== LocalPipelineWorker._FRAGMENT_STATES.cancellingBuild){ //Accepting cancellingBuild cause this fragment might have completed but rest in route not. Thus, eligible for cancelling and won't follow destroy procedure since full route build was never completed

                const msg = `${LocalPipelineWorker.getNameofFragmentState(LocalPipelineWorker._FRAGMENT_STATES.consenting)} or ${LocalPipelineWorker.getNameofFragmentState(LocalPipelineWorker._FRAGMENT_STATES.destroyed)}`;
                throwStateTransitionError(this.currentFragmentState, msg);
            }
        }

        else if(this.currentFragmentState === LocalPipelineWorker._FRAGMENT_STATES.consenting){

            if(newState !== LocalPipelineWorker._FRAGMENT_STATES.running && newState !== LocalPipelineWorker._FRAGMENT_STATES.destroyed){

                const msg = `${LocalPipelineWorker.getNameofFragmentState(LocalPipelineWorker._FRAGMENT_STATES.running)} or ${LocalPipelineWorker.getNameofFragmentState(LocalPipelineWorker._FRAGMENT_STATES.destroyed)}`;
                throwStateTransitionError(this.currentFragmentState, msg);
            }
        }

        //Do actual transitions
        if(newState === LocalPipelineWorker._FRAGMENT_STATES.building){

            this.onStateBuilding(args);
        } else if(newState === LocalPipelineWorker._FRAGMENT_STATES.cancellingBuild){

            this.onStateCancelBuild(args);
        } else if(newState === LocalPipelineWorker._FRAGMENT_STATES.running){

            this.onStateRunning(args);
        } else if(newState === LocalPipelineWorker._FRAGMENT_STATES.consenting){

            this.onStateConsenting(args);
        } else if(newState === LocalPipelineWorker._FRAGMENT_STATES.destroyed){

            this.onStateDestroyed(args);
        } else {

            throw new Error(`Undefined state ${newState}. Cannot make a transition`);
        }

        /**
         * 
         * @param {number} currentState 
         * @param {string} msg 
         */
        function throwStateTransitionError(currentState, msg){

            throw new Error(`Cannot transition fragment from state ${LocalPipelineWorker.getNameofFragmentState(currentState)} to ${LocalPipelineWorker.getNameofFragmentState(newState)}. Only next valid state(s) are ${msg}`);
        }
    }

    /**
     * 
     * @param {FragmentPipelineWorkerArgs} args 
     */
    onStateBuilding(args){

        //Indicate new state
        this.currentFragmentState = LocalPipelineWorker._FRAGMENT_STATES.building;

        //Save mainPipelineCb
        const mainPipelineCb = args.mainPipelineCb;
        //Update mainPipelineCb to a local function that we will use to update state to running then tell main pipeline done
        args.mainPipelineCb = () => {

            //WILL NOT BE CALLED IF BUILD WAS CANCELLED AND FragmentBuilder told
            //Reset to original cb
            args.mainPipelineCb = mainPipelineCb;
            this.transitionFragmentState(LocalPipelineWorker._FRAGMENT_STATES.running, args);
        }

        //Change lifecycle stage to running
        this.fragmentLifeCycleObject.transitionLifeCycle(FragmentLifeCycleManager._LIFECYCLE_STAGES.running);

        //Invoke fragment builder to start building
        this.fragmentBuilder.startFragmentBuild(args);
    }

    /**
     * 
     * @param {{ cb: genericFunction }} args 
     */
    onStateCancelBuild(args){

        this.currentFragmentState = LocalPipelineWorker._FRAGMENT_STATES.cancellingBuild;

        //Tell fragment builder to cancel build
        this.fragmentBuilder.cancelBuild(() => {

            //Take it directly to destroyed. Give args directive that jumpCall
            /**
             * @type {FragmentBuildWorkerDestArgs}
             */
            let destArgs = args;
            destArgs.jumpCall = true;
            this.transitionFragmentState(LocalPipelineWorker._FRAGMENT_STATES.destroyed, destArgs);
            args.cb();
        });
    }

    /**
     * 
     * @param {FragmentPipelineWorkerArgs} args 
     */
    onStateRunning(args){

        this.currentFragmentState = LocalPipelineWorker._FRAGMENT_STATES.running;

        //Tell MainRoutingPipeline we're done, if applicable
        if(args && args.mainPipelineCb){

            args.mainPipelineCb();
        }
    }

    /**
     * 
     * @param { { cb: routingPipelineConsentCb, newRouteInfo: RouteParams } } args 
     */
    onStateConsenting(args){

        this.currentFragmentState = LocalPipelineWorker._FRAGMENT_STATES.consenting;
        this.hostFragment.onFragmentConsent((consentParams) => {

            if(consentParams.consent){

                args.cb(consentParams);
            } else {

                //Denied. Take state back to running
                this.transitionFragmentState(LocalPipelineWorker._FRAGMENT_STATES.running, args);
                args.cb(consentParams);
            }
        }, args.newRouteInfo);
    }

    /**
     * @typedef FragmentBuildWorkerDestArgs
     * @property {fragmentDestroyCb} cb
     * @property {boolean} jumpCall
     * 
     * Continue from here - LocalPipelineWorker and consenting to routes with overrides, potentially
     * @param {FragmentBuildWorkerDestArgs} args 
     */
    onStateDestroyed(args){

        this.currentFragmentState = LocalPipelineWorker._FRAGMENT_STATES.destroyed;

        //Transition fragment lifecycle stage to destroyed
        this.fragmentLifeCycleObject.transitionLifeCycle(FragmentLifeCycleManager._LIFECYCLE_STAGES.destroyed);

        if(!args.jumpCall){

            this.hostFragment.destroyFragment(() => {

                args.cb();
            });
        }
    }

    /**
     * 
     * @returns {FragmentLifeCycleManager}
     */
    getLifeCycleObject(){

        return this.fragmentLifeCycleObject;
    }

    /**
     * To be used by Remote Manager to validate fragment is in the correct state before attempting to change
     * anything in the UI.
     * 
     * All UI calls not in an async "thread."" Handled by callback in main "thread"
     * @returns {boolean}
     */
    isFragmentRunning(){

        return this.currentFragmentState === LocalPipelineWorker._FRAGMENT_STATES.running;
    }
}

/**
 * Does actual building of the fragment, tracking build progress for correct cancelling
 * 
 * Switches state between building and cancelled to prevent further continuation if latter while destroying
 */
/**
 * @template T
 * @typedef {FragmentPipelineWorkerArgs & { buildID: number, stageArgs: T }} GenericFragmentBuilderStageArgs
 * 
 */
/**
 * @typedef {GenericFragmentBuilderStageArgs<null>} FragmentBuilderStageArgs
 * @typedef {GenericFragmentBuilderStageArgs<InitViewResults> } FragmentBuilderStageBindViewArgs
 * @typedef { { uiTemplate: string, isServerSide: boolean } } InitViewResults
 * @typedef {genericParamFunction<InitViewResults>} initViewBuilderCb
 */
class FragmentBuilder{

    /**
     * 
     * @param {AppMainFragment} hostFragment 
     */
    constructor(hostFragment){
        
        /**
         * @type {AppMainFragment}
         */
        this.hostFragment = hostFragment;
        this.currentBuildStage = FragmentBuilder._BUILD_STAGES.launching;
        /**
         * @type {boolean} Tells if build is active. Changed by calls to build or cancel
         */
        this.buildActive = false;
        //Using this to allow cancelling then recalling since was part of next route thus not reinflated
        //However, callbacks with wrong ID will not be reprocessed such as a getView that's responding after this was cancelled
        //To avoid integrity fails. Bound to those calls.
        //Always updated before calls. So, first has ID 0
        this.buildID = -1;
    }

    static get _BUILD_STAGES(){

        return {

            launching: 0,
            initView: 1,
            bindView: 2,
            bindViewUtils: 3,
            updateParams: 4,
            complete: 5
        }
    }

    /**
     * 
     * @param {number} stage 
     */
    static getNameofBuildStage(stage){

        let name = "";
        for(let key in FragmentBuilder._BUILD_STAGES){

            if(FragmentBuilder._BUILD_STAGES[key] === stage){

                name = key;
                break;
            }
        }

        return name !== "" ? name : "undefined stage";
    }

    /**
     * 
     * @param {genericFunction} cb 
     */
    cancelBuild(cb){

        this.buildActive = false;

        //Detach view if had attached
        if(this.currentBuildStage > FragmentBuilder._BUILD_STAGES.bindView){

            this.hostFragment.detachViewFromDOM();
            //Take it back to launching to allow rebuilding route to trigger if part of it and not reinflated
            this.currentBuildStage === FragmentBuilder._BUILD_STAGES.launching;
        }

        cb();
    }

    /**
     * DO NOT RUN THIS CODE OR ANY CALLERS TO IT ASYNCHRONOUSLY
     * 
     * @param {FragmentBuilderStageArgs} args
     * @param {genericFunction} cb 
     */
    updateRunningParamsAndData(args, cb){

        if(this.currentBuildStage === FragmentBuilder._BUILD_STAGES.complete){

            //Do the direct call to data and params update(bundled together)
            this.hostFragment.onUpdateParams(args.routeParams, args.data, args.savedState, () => {

                cb();
            });
        } else {

            throw new Error("Cannot plainly update params and data of running while build never completed. Algorithm error");
        }
    }

    /**
     * 
     * @param {FragmentBuilderStageArgs} args 
     */
    startFragmentBuild(args){

        //Tell build active
        this.buildActive = true;

        //Update buildID
        this.buildID++;

        //Set buildID
        args.buildID = this.buildID;

        this.transitionBuildStage(FragmentBuilder._BUILD_STAGES.initView, args);
    }

    /**
     * 
     * @param {number} newStage 
     * @param {FragmentBuilderStageArgs} args
     */
    transitionBuildStage(newStage, args){

        //Only accept transition requests from an accurate buildID
        if(args.buildID === this.buildID && this.buildActive){

            //Handle errors
            if(newStage === this.currentBuildStage){

                throwBuildStageTransitionError(this.currentBuildStage, "unmatching stage");
            }

            else if(this.currentBuildStage === FragmentBuilder._BUILD_STAGES.initView){

                if(newStage !== FragmentBuilder._BUILD_STAGES.bindView){

                    throwBuildStageTransitionError(this.currentBuildStage, `${FragmentBuilder.getNameofBuildStage(FragmentBuilder._BUILD_STAGES.bindView)}`);
                }
            }

            else if(this.currentBuildStage === FragmentBuilder._BUILD_STAGES.bindView){

                if(newStage !== FragmentBuilder._BUILD_STAGES.bindViewUtils){

                    throwBuildStageTransitionError(this.currentBuildStage, `${FragmentBuilder.getNameofBuildStage(FragmentBuilder._BUILD_STAGES.bindViewUtils)}`);
                }
            }

            else if(this.currentBuildStage === FragmentBuilder._BUILD_STAGES.bindViewUtils){

                if(newStage !== FragmentBuilder._BUILD_STAGES.updateParams){

                    throwBuildStageTransitionError(this.currentBuildStage, `${FragmentBuilder.getNameofBuildStage(FragmentBuilder._BUILD_STAGES.updateParams)}`);
                }
            }

            else if(this.currentBuildStage === FragmentBuilder._BUILD_STAGES.updateParams){

                if(newStage !== FragmentBuilder._BUILD_STAGES.complete){

                    throwBuildStageTransitionError(this.currentBuildStage, `${FragmentBuilder.getNameofBuildStage(FragmentBuilder._BUILD_STAGES.complete)}`);
                }
            }

            else if(this.currentBuildStage === FragmentBuilder._BUILD_STAGES.complete){

                if(newStage !== FragmentBuilder._BUILD_STAGES.initView){

                    throwBuildStageTransitionError(this.currentBuildStage, `${FragmentBuilder.getNameofBuildStage(FragmentBuilder._BUILD_STAGES.initView)}`);
                }
            }

            //Handle transitions
            if(newStage === FragmentBuilder._BUILD_STAGES.initView){

                this.onStageInitView(args);
            } else if(newStage === FragmentBuilder._BUILD_STAGES.bindView){

                this.onStageBindView(args);
            } else if(newStage === FragmentBuilder._BUILD_STAGES.bindViewUtils){

                this.onStageBindViewUtils(args);
            } else if(newStage === FragmentBuilder._BUILD_STAGES.updateParams){

                this.onStageUpdateParams(args);
            } else if(newStage === FragmentBuilder._BUILD_STAGES.complete){

                this.onStageComplete(args);
            }
        } else {

            console.error("Late build stage transition request for fragment with viewID " + this.hostFragment.viewID);
        }

        /**
         * 
         * @param {number} currentStage 
         * @param {string} nextValidStages 
         */
        function throwBuildStageTransitionError(currentStage, nextValidStages){

            const msg = `Cannot transition the fragment internal build stage from ${FragmentBuilder.getNameofBuildStage(currentStage)} to ${FragmentBuilder.getNameofBuildStage(newStage)}. Next valid state is ${nextValidStages}`;
            throw new Error(msg);
        }
    }

    /**
     * 
     * @param {FragmentBuilderStageArgs} args 
     */
    onStageInitView(args){

        //Indicate new stage
        this.currentBuildStage = FragmentBuilder._BUILD_STAGES.initView;

        //Tell fragment to initView
        this.hostFragment.onInitView(args.routeParams.filteredUrl.baseUrl, (params) => {

            args.stageArgs = params;
            this.transitionBuildStage(FragmentBuilder._BUILD_STAGES.bindView, args);
        });
    }

    /**
     * 
     * @param {FragmentBuilderStageBindViewArgs} args 
     */
    onStageBindView(args){

        //Indicate new stage
        this.currentBuildStage = FragmentBuilder._BUILD_STAGES.bindView;

        //Tell fragment to bindView
        this.hostFragment.onBindView(args.stageArgs.uiTemplate, () => {

            this.transitionBuildStage(FragmentBuilder._BUILD_STAGES.bindViewUtils, args);
        });
    }

    /**
     * 
     * @param {FragmentBuilderStageBindViewArgs} args 
     */
    onStageBindViewUtils(args){

        //Indicate new stage
        this.currentBuildStage = FragmentBuilder._BUILD_STAGES.bindViewUtils;

        //Tell fragment to bindViewUtils
        this.hostFragment.onBindViewUtils(args.stageArgs.isServerSide, () => {

            //transition lifecycle to view ready
            //@ts-expect-error
            this.hostFragment.getLifeCycleObject().onViewReady();
            //Transition to updating params
            this.transitionBuildStage(FragmentBuilder._BUILD_STAGES.updateParams, args);
        });
    }

    /**
     * 
     * @param {FragmentBuilderStageBindViewArgs} args 
     */
    onStageUpdateParams(args){

        //Indicate new stage
        this.currentBuildStage = FragmentBuilder._BUILD_STAGES.updateParams;

        this.hostFragment.onUpdateParams(args.routeParams, args.data, args.savedState, () => {

            //This build is done
            this.transitionBuildStage(FragmentBuilder._BUILD_STAGES.complete, args);
        }, args.stageArgs.isServerSide);
    }

    /**
     * 
     * @param {FragmentBuilderStageBindViewArgs} args 
     */
    onStageComplete(args){

        //Indicate new stage
        this.currentBuildStage = FragmentBuilder._BUILD_STAGES.complete;

        //Tell LocalPipelineWorker fragment build is done
        args.mainPipelineCb();
    }
}

if(false){

    /**
     * @type {AppMainFragmentConstructor}
     */
    const check = AppMainFragment;
}

export default AppMainFragment;