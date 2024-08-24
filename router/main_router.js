//@ts-check
/**
 * This class manages routing in the app, based on routing information passed to it
 * 
 * Ideally, you should extend it and use it as a singleton
 * 
 * Nope. Now fixed as a singleton. APIs here are critical to the app running well.
 */

import AppStateManager from "../base-history/app_state_manager";
import IndexedRouterHistoryUtils from "./indexed-router-history/indexed_router_history";
import RoutingInfoUtils from "./utils/routing-info/routing_info_utils";
import MainRoutingPipeline from "./utils/routing-pipeline/main_routing_pipeline";

class MainRouter{

    /**
     * initialize the MainRouter with routing info
     * @param {RoutingInfo[]} routingInfos 
     * @param {AppStateManager} appStateManager
     * @param {genericParamFunction<{type: string, message: string}>} errorCallback
     * {({type, message}) => {}} errorCallback
     * @param {string} rootPath (Optional) Defaults to "" Should not have a trailing /.
     * @param {canAccessRoute} routeConsent
     */
    constructor(routingInfos, appStateManager, errorCallback, rootPath = "", routeConsent){

        //@ts-expect-error
        if(!MainRouter.instance){

            this.routingInfos = routingInfos;
            /**
             * @type {AppStateManager}
             */
            this.appStateManager = appStateManager;
            this.errorCallback = errorCallback;
            this.rootPath = RoutingInfoUtils.removeLastForwardSlashInUrl(rootPath);
            this.routingPipeline = new MainRoutingPipeline(this, routeConsent);
            this.indexedRouterHistory = IndexedRouterHistoryUtils.initIndexedRouterHistory();
            this.appRootStateCallback = [];
            this.popIgnoreCallback = [];
            this.queryStartMarker = "?";
            this.targetStartMarker = "#";
            this.URL_SEPARATOR = "/";

            //@ts-expect-error
            MainRouter.instance = this;

            //Will this work?
            //YEEEEES. Now more flexibility defining singletons
            //@ts-expect-error
            Object.freeze(MainRouter.instance);
        }

        //@ts-expect-error
        return MainRouter.instance;
    }

    static get APP_NAVIGATIONAL_LINK_NO_FOLLOW_ATTR(){

        return "app-navigational-no-follow"
    }

    /**
     * Get the routing infos in router
     */
    get _routingInfos(){

        return this.routingInfos;
    }

    get _appRootStateCallback(){

        return this.appRootStateCallback[0];
    }

    set _appRootStateCallback(appRootStateCallback){

        this.appRootStateCallback[0] = appRootStateCallback;
    }

    get _popIgnoreCallback(){

        return this.popIgnoreCallback[0];
    }

    set _popIgnoreCallback(popIgnoreCallback){

        this.popIgnoreCallback[0] = popIgnoreCallback;
    }

    /**
     * Called by AppRoot to launch the default view
     * 
     * @param {AppHistoryState} newHistoryState 
     * @param {boolean} replaceCurrentState 
     */
    routeToAppLaunchRoute(newHistoryState, replaceCurrentState) {

        const routeStateInfo = this.routeToView({ state: newHistoryState }, true);
        if(replaceCurrentState){

            window.history.replaceState(newHistoryState, newHistoryState.pageTitle, this.rootPath + newHistoryState.pageUrl);
        }

        try{

            this.requestRouteBuildFromPipeline({
            
                targetRouteEntry: routeStateInfo.routeEntry, 
                fullURL: newHistoryState.pageUrl,
                stateInfo: {

                    skipPushState: true
                }
            });
        } catch (err) {

            console.warn("Routing denied");
            console.log(err);
        }
    }

    /**
     * Does the final routing to the view, with associated nested fragments
     * 
     * Called internally or by the root app pager when loading the default view using a url. 
     * 
     * Do not override
     * 
     * @param {{ state: AppHistoryState, fullURL: url, data: {}}} args 
     * @param {boolean} byPassRouting
     * @param {genericFunction} failCb
     * @returns {{state: AppHistoryState, routeEntry: RoutingInfo}} (Optional) Only if byPassRouting has been set to true
     */
    routeToView(args, byPassRouting, failCb){

        let fullURL = args.state ? args.state.pageUrl : args.fullURL;
        let targetRouteEntry = this.getTargetRouteEntryForBaseRoute(fullURL);

        if(!targetRouteEntry){

            this.errorCallback({type: "Undefined route for passed base page url", message: "Route undefined for base page url"});
            return;
        }

        //Generate a state if non given. Direct call from routes or fragments help with this
        if(!args.state){

            args.state = this.appStateManager.generateBaseAppState(targetRouteEntry.pageTitle, fullURL);
        }

        //Doing state check cause of direct call to this when loading default or new routes on URL basis only
        if(args.state.stackEntry === null || args.state.stackEntry === undefined){

            args.state = this.appStateManager.normalizeGeneratedAppState(args.state);
        }

        //Adding cause of direct call by app root
        if(!byPassRouting){

            //Do final routing, saving history
            try{

                this.requestRouteBuildFromPipeline({
                    
                    targetRouteEntry: targetRouteEntry,
                    fullURL: fullURL,
                    routeBuildPipelineDataArgs: args.data,
                    stateInfo: {

                        newHistoryState: args.state
                    }
                });
            }catch(err){

                console.warn("Routing denied");
                console.log(err);
                //call the failCb to know of fail
                failCb();
            }
        } else {

            return {

                state: args.state,
                routeEntry: targetRouteEntry
            }
        }
    }

    /**
     * 
     * @param {string} basePageUrl The page url we're routing to
     * @returns {RoutingInfo} The route information for the provided basePageUrl
     */
    getTargetRouteEntryForBaseRoute(basePageUrl){

        //consider the rootpath
        basePageUrl = this.getPathURLWithQueryFromUrl(basePageUrl);
        //Filter to get url before query start marker (?), inclusive of the marker
        basePageUrl = basePageUrl.split(`${this.queryStartMarker}`)[0];
        //Filter out target marker
        basePageUrl = basePageUrl.split(`${this.targetStartMarker}`)[0];
        //Remove last / if not a home indicator
        basePageUrl = RoutingInfoUtils.removeLastForwardSlashInUrl(basePageUrl);

        //Get the target route entry
        const targetRouteEntry = RoutingInfoUtils.findMatchingRoutingInfoForUrl(this.routingInfos, basePageUrl);

        if(!targetRouteEntry){

            console.log("Route undefined for base page url " + basePageUrl);
            return null;
        }

        return targetRouteEntry;
    }
    
    /**
     * 
     * @param {boolean} movingBack 
     * @returns 
     */
    routeToPoppedView(movingBack){

        if(movingBack){

            this.appStateManager.polyfillPreviousState();
        }
        let targetRouteEntry = this.getTargetRouteEntryForBaseRoute(this.getPurePathURL());
        if(!targetRouteEntry){

            this.errorCallback({type: "Undefined route for passed page url", message: "Route undefined for page url"});
            return;
        }

        try{

            this.requestRouteBuildFromPipeline({

                targetRouteEntry: targetRouteEntry,
                fullURL: this.getPathURLWithQuery(),
                stateInfo: {

                    skipPushState: true
                },
                popEvent: {

                    hasPopped: true,
                    isBack: movingBack
                }
            });
        } catch(err){

            console.error("Pop denied");
            console.log(err);
            //Just go back forward ya pleb!
            this._popIgnoreCallback();
            if(movingBack){
                
                window.history.forward();
            } else {

                window.history.back();
            }
        }
    }

    /**
     * Called by fragment or method wanting to route to a certain url and pass a certain data
     * 
     * @param {string} url 
     * @param {routeBuildPipelineDataArgs<{}>} [buildData]
     * @param {genericFunction} [failCb]
     */
    routeTO(url, buildData, failCb){

        this.routeToView({ fullURL: url, data: buildData }, false, failCb);
    }

    /**
     * Do final routing, saving history. 
     * 
     * Throws an error if build denied. Catch the error
     * @param {RouteBuildPipelineArgs & HistoryStateInfo} args
     */
    requestRouteBuildFromPipeline(args){

        if(args.stateInfo.newHistoryState){

            args.stateInfo.rootUrl = this.rootPath + args.stateInfo.newHistoryState.pageUrl;
        }
        this.routingPipeline.startRoutingBuildPipeline(args);
    }

    /**
     * Called by main routing pipeline when state has been updated
     */
    onStateUpdate(){

        //Inform the root app pager of the change in state. It uses this callback to update the nav buttons
        this._appRootStateCallback(window.history.state);
    }

    /**
     * Replace the current state with a new url with a query
     * @param {string} newURL 
     */
    replaceStateWithURL(newURL){

        window.history.state.pageUrl = newURL;
        //First arg is the new state (important to reflect new url here). Second arg new title, third new route displayed in browser
        window.history.replaceState(window.history.state, window.history.state.pageTitle, this.rootPath + newURL);
    }

    /**
     * Get the current url post fixed with the specified query(ies)
     * @param {string} query 
     * @returns {string} new url with query
     */
    getCurrentURLWithQuery(query){

        return `${this.getPurePathURL()}${this.getStandardizedQuery(query)}`;
    }

    /**
     * Get the full query part of the url
     * 
     * Previously getQueryBasedUrl
     * 
     * Internal
     * @param {string} query(ies)
     * @returns {string} full query with start marker (?)
     */
    getStandardizedQuery(url){

        return `${this.queryStartMarker}${url}`;
    }

    /**
     * Get path url with query, but root path filtered out
     * @returns {string}
     */
    getPathURLWithQuery(){

        // return window.location.pathname.replace(this.rootPath, "");
        if(this.rootPath){
            
            return window.location.href.split(this.rootPath)[1];
        } else {

            return window.location.href.split(window.location.origin).join("");
        }
    }

    /**
     * Get path url with query, but root path filtered out
     * @param {string} url 
     * @returns {string}
     */
    getPathURLWithQueryFromUrl(url){

        //Modify to account for no rootPath given
        if(this.rootPath && url.startsWith(this.rootPath)){

            return url.split(this.rootPath)[1];
        } else {

            return url;
        }
    }

    /**
     * Get the path URL without any queries and root path
     */
    getPurePathURL(){

        return RoutingInfoUtils.removeLastForwardSlashInUrl(window.location.pathname.replace(window.location.search, "").replace(this.rootPath, ""));
    }

}

export default MainRouter;