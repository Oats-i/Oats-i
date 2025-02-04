//@ts-check
/**
 * This singleton class is responsible for paging the main views in the site, inserted at the app's root
 * It does this with the help of the base history manager that contains the base history model that provides
 * the new state of the window plus the active main navigation control
 * 
 * It will provide an interface to know when the nav buttons need to be updated correctly. Then, calls the 
 * MainRouter to trigger routing functions
 * 
 * It should NOT update the state. This should only be done by the MainRouter, once routing is done.
 * 
 * Listens to pop state however, to trigger router to do routing again, and auto update nav buttons/links
 */

/**
 * @typedef AppExtraOptions
 * @property {{ interceptNonLocal: boolean, interceptorCb: genericParamReturnFunction<string, boolean> }} linkInterceptor
 * 
 */

//For ui-components
import AppRootComponent from "./ui-components/app_root_component";
import MainFragmentComponent from "../fragments/utils/ui-components/main-fragment/main_fragment";
import ChildFragmentComponent from "../fragments/utils/ui-components/child-fragment/child_fragment";
import FragmentContentComponent from "../fragments/utils/ui-components/fragment-content/fragment_content";

import AppStateManager from "../base-history/app_state_manager";
import MainRouter from "../router/main_router";
import RoutingInfoUtils from "../router/utils/routing-info/routing_info_utils";

class AppRoot{

    constructor(){

        //@ts-ignore
        if (!AppRoot.instance){

            this.appStateManager = [];
            /**
             * @type {[MainNavigationInfo[]]}
             */
            //@ts-ignore
            this.mainNavInfos = [];
            /**
             * @type {MainRouter[]}
             */
            this.mainRouter = [];
            /**
             * @type {[AppHistoryState]}
             */
            //@ts-ignore
            //Keep track of old state on pop. Weird API doesn't return it. So have to use it this way
            this.oldState = [];
            this.ignorePopEvent = [];
            //@ts-ignore
            AppRoot.instance = this;
        }

        //@ts-ignore
        return AppRoot.instance;
    }

    get _appStateManager(){

        return this.appStateManager[0];
    }

    get _mainNavInfos(){

        return this.mainNavInfos[0];
    }

    get _mainRouter(){

        return this.mainRouter[0];
    }

    get _oldState(){

        return this.oldState[0];
    }

    get _ignorePopEvent(){

        return this.ignorePopEvent[0];
    }

    set _oldState(currentState){

        this.oldState[0] = currentState;
    }

    set _ignorePopEvent(ignore){

        this.ignorePopEvent[0] = ignore;
    }

    /**
     * This function initializes the App, and should only be called once - in the app's index.js or root file.
     * 
     * It receives the appStateManager, who we'll use to know if app state is different, thus tell
     * router to update with correct state values
     * 
     * @param {AppStateManager} appStateManager
     * @param {MainRouter} mainRouter
     * @param {AppRootView} rootView
     * @param {string} defaultRoute
     * @param {AppExtraOptions} [options]
     */
    initApp(appStateManager, mainRouter, rootView, defaultRoute, options){

        this.appStateManager.push(appStateManager);
        this.mainRouter.push(mainRouter);
        if(rootView){

            this.inspectRootView(rootView);
            this.mainNavInfos.push(rootView.mainNavInfos);
            this.loadRootView(rootView);
            this.bindListenersToNavigation(rootView.mainNavInfos);
        }
        //Set to true until default/current route loads. Help prevent older browsers popStateFiring on page load
        this._ignorePopEvent = true;

        this.setStateChangeCallback();
        this.bindPopStateListener();
        this.setupLinkInterceptor(options?.linkInterceptor);
        this.loadApp(defaultRoute);
    }

    /**
     * Check whether the root view object is valid.
     * @param {AppRootView} rootView
     */
    inspectRootView(rootView){

        if(!rootView.template && rootView.mainNavInfos){

            console.warn("Your rootView object has no template but you've provided mainNavInfos. Please ensure your view is already bound before initializing the app");
        } 
    }

    setStateChangeCallback(){

        this._mainRouter._appRootStateCallback = this.onMainRouterStateChange.bind(this);
    }

    /**
     * Adds the template as the innerHTML of the view parent with the given ID. Concatenates with existing HTML in the parent view
     * Does this if not server-side rendered
     * @param {AppRootView} rootView 
     */
    loadRootView(rootView){

        if(rootView.template){

            if(document.getElementsByTagName("app-root").length === 0){

                let parentView = rootView.viewParentID ? document.getElementById(rootView.viewParentID) : document.body;
                parentView.innerHTML = rootView.template + parentView.innerHTML;
            } else {

                console.warn("Root view not initialized because it's been server side rendered (<app-root> component exists)");
            }
        }

        if(!this.isRootViewStructureValid()){

            console.warn("App Root view structure invalid");
            throw new Error(`The app root view structure is invalid. <app-root> components ${document.getElementsByTagName("app-root").length} instead of 1`);
        }
    }

    isRootViewStructureValid(){

        return document.getElementsByTagName("app-root").length === 1;
    }

    /**
     * Use mainNavInfos
     * Are <app-root> children
     * 
     * Also, avoid adding listener if tagName is A. That is handled by interceptor. See how that works
     * And, for buttons, listener added to ALL matching selector (dot selector used, not to interfere with how ids work)
     * So, this info still allows for you to style active and inactive states using attributes
     * 
     * UPDATE THIS ALGO IN Local Nav Infos for fragments and view panels* as well
     * 
     * @param {MainNavigationInfo[]} mainNavInfos
     */
    bindListenersToNavigation(mainNavInfos){

        if(mainNavInfos){

            mainNavInfos.forEach((info) => {

                //Get the elements per selector
                const elements = this.getAppRootComponent().querySelectorAll(`.${info.selector}`);
                elements.forEach((el) => {

                    if(el.tagName !== "A"){

                        try {
    
                            el.addEventListener("click", this.navigateApp.bind(this, info));
                        } catch (err){
        
                            throw new Error(`Can't set up navigation controls for navigation with dot (class) selector ${info.selector}. Ensure it's inside the <app-root> component\n\n ${err}`);
                        }
                    }
                });
            });
        }
    }

    /**
     * 
     * @returns 
     */
    getAppRootComponent(){

        return document.getElementsByTagName("app-root")[0]
    }

    /**
     * The link click interceptor to naturally route A tags
     * 
     * @param {AppExtraOptions['linkInterceptor']} opts 
     */
    setupLinkInterceptor(opts){

        document.addEventListener("click", (e) => {

            /**
             * @type {string}
             */
            let href = null;
            /**
             * @type {HTMLLinkElement}
             */
            //@ts-expect-error
            const target = e.target;

            /**
             * IMPORTANT
             * 
             * export the styling a *:not([click-override=true]){ pointer-events: none } to ensure this also works
             * with children. Children can only intercept pointer events if set click-override property to true
             * 
             * Allows nested A tags to work well.
             * 
             */
            if(target.tagName === "A"){
                
                href = target.getAttribute("href");
                if(href){

                    //check if href local
                    if(href.startsWith("/")){ //|| href.startsWith("./") Removed this, to support absolute routes ONLY, as per routing info spec
    
                        //local. Route to
                        //Let default action happen if set to open local link in new tab. Else, navigate internally
                        if(target.getAttribute("target") !== "_blank"){
    
                            e.preventDefault();
                            //Can provide an attribute to prevent click interception for A tags
                            if(!target.getAttribute(MainRouter.APP_NAVIGATIONAL_LINK_NO_FOLLOW_ATTR)){

                                /**
                                 * TODO: Know when it fails, and then pop backwards. 
                                 * 
                                 * Implemented. TEST
                                 */
                                this._mainRouter.routeTO(this._mainRouter.getPathURLWithQueryFromUrl(href), null, () => {

                                    this._ignorePopEvent = true
                                    //move back - above value will be reset by listener to pop events
                                    window.history.back();
                                });
                            }
                        }
                    } else {

                        //non-local. Process
                        if(opts?.interceptNonLocal){
    
                            if(!opts.interceptorCb(href)){
    
                                //prevent opening link cause client denied
                                e.preventDefault();
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * 
     * @param {MainNavigationInfo} info 
     * @param {*} e 
     */
    navigateApp(info, e){

        this._mainRouter.routeToView({ state: this._appStateManager.getBaseAppStateFromMainNavID(info.selector, info.defaultRoute, info.defaultRoute)});
    }

    bindPopStateListener(){

        this._mainRouter._popIgnoreCallback = () => {

            this._ignorePopEvent = true;
        };
        window.onpopstate = this.handleStatePop.bind(this);
    }
    
    /**
     * Handles history pop events
     * @param {PopStateEvent} e 
     */
    handleStatePop(e){
    
        if(!this._ignorePopEvent){
            
            let isBack = true; //Assume we are going back by default
            if(e.state){

                /**
                 * @type {AppHistoryState}
                 */
                const newState = e.state;
                isBack = newState.stackEntry ? newState.stackEntry < this._oldState.stackEntry : true; //Support API before this
            }
            this._mainRouter.routeToPoppedView(isBack);
        } else {

            this._ignorePopEvent = false;
        }
    }

    /**
     * Loads the Oats~i app. 
     * @param {string} defaultRoute 
     */
    loadApp(defaultRoute){

        const currentBaseUrl = this._mainRouter.getPurePathURL();
        let currentUrl = this._mainRouter.getPathURLWithQuery();
        let targetID;
        try {

            targetID = RoutingInfoUtils.findActiveNavIDForUrl(this._mainRouter._routingInfos, currentBaseUrl);
        } catch(err){

            console.warn(err);
            targetID = null;
        }
        if(targetID !== null) {

            //Use the state stored in the browser, if any. Else, default to base one (it may be a new direct load, eg)
            const baseStateAvailable = window.history.state !== null && window.history.state !== undefined;
            this._oldState = baseStateAvailable ? window.history.state : this._appStateManager.getBaseAppStateFromMainNavID(targetID, currentBaseUrl, currentUrl);
            this._mainRouter.routeToAppLaunchRoute(this._oldState, !baseStateAvailable);
        } else {

            //Route undefined. Load default route. Happens if loading root first
            //CORRECT THIS. IT IS LIMITING
            const targetRouteInfo = RoutingInfoUtils.findMatchingRoutingInfoForUrl(this._mainRouter.routingInfos, defaultRoute);
            if(!targetRouteInfo){

                throw new Error("The default route passed could not be found in main nav (routing) infos");
            }
            this._oldState = this._appStateManager.getBaseAppStateFromMainNavID(targetRouteInfo.baseNavBtn, targetRouteInfo.route, targetRouteInfo.route);
            this._mainRouter.routeToAppLaunchRoute(this._oldState, true);
        }
        this._ignorePopEvent = false; //Now can listen to pop event
    }

    /**
     * 
     * @param {AppHistoryState} newState 
     */
    onMainRouterStateChange(newState){

        if(this._mainNavInfos){

            this.updateNavButtons(newState);
        }
        this._oldState = newState;
    }

    /**
     * Updates links as well. Just maintaining original nomenclature
     * 
     * @param {AppHistoryState} newState 
     */
    updateNavButtons(newState){

        const oldActiveNavSelector = this.findMatchingMainNavInfoForState(this._oldState).selector;
        const newActiveNavSelector = this.findMatchingMainNavInfoForState(newState).selector;
        const oldNavEls = this.getAppRootComponent().querySelectorAll(`.${oldActiveNavSelector}`);
        oldNavEls.forEach((el) => {

            el.setAttribute("navigation-state", "inactive");
        });
        const newNavEls = this.getAppRootComponent().querySelectorAll(`.${newActiveNavSelector}`);
        newNavEls.forEach((el) => {

            el.setAttribute("navigation-state", "active");
        });
    }

    /**
     * 
     * @param {AppHistoryState} state 
     */
    findMatchingMainNavInfoForState(state){

        //try a direct match
        let targetNavInfo = this._mainNavInfos.find((info) => state.pageUrl === info.baseActiveRoute)
        //if no direct match found, search for all. Longest string of qualified qualifies
        if(!targetNavInfo){

            /**
             * @type {MainNavigationInfo[]}
             */
            let matchingInfos = [];
            this._mainNavInfos.forEach((info) => {

                if(state.pageUrl.startsWith(info.baseActiveRoute)){

                    matchingInfos.push(info)
                }
            });
            /**
             * @type {MainNavigationInfo}
             */
            let bestQualified = null;
            matchingInfos.forEach((info) => {

                if(!bestQualified){

                    bestQualified = info;
                } else {

                    if(bestQualified.baseActiveRoute.length < info.baseActiveRoute.length){

                        bestQualified = info;
                    }
                }
            });
            if(bestQualified){

                targetNavInfo = bestQualified;
            }
        }

        return targetNavInfo;
    }
}

const appRoot = new AppRoot();
Object.freeze(appRoot);

export default appRoot;