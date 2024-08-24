/**
 * This manages the base history that runs from the app's root. 
 * 
 * It starts the loading of a main fragment, which is the starting point of any function in the app
 * 
 * It thus helps in main app navigation through the navigational controls
 * The base history manager however allows the toggling of the nav buttons/links of the main navigation controls only
 * That is to allow fragments to manage their own nav buttons/links individually
 * 
 * Also, it assigns states to the window history state manager API providing page, title, and url.
 * page and title can be shared but not url. Should be unique and point to an entire path traceable in routing info
 */

import RoutingInfoUtils from "../router/utils/routing-info/routing_info_utils";
import "./types/type_app_history_state"

class AppStateManager{

    /**
     * 
     * @param {RoutingInfo[]} mainRoutingInfo 
     */
    constructor(mainRoutingInfo){

        this.mainRoutingInfo = mainRoutingInfo;
        this.currentStackEntry = -1;

        this.normalizeCurrentStackEntry();
    }

    /**
     * WORKED WITH IMPLEMENTATION WHERE THIS WAS YET TO BE DEFINED.
     * 
     * Otherwise, will never do anything.
     * 
     * NOTE. If implementation ever changes, then deal with the bug of currentStackEntry never being updated
     * thus polyfilling next back pop with same value, making back determination difficult.
     * 
     * Call when state has been popped (moved back)
     * Help to polyfill in case previous (back state records) have no stack entry
     * Only possible for back movements (cause state was yet to be set with new method)
     */
    polyfillPreviousState(){

        /**
         * @type {AppHistoryState}
         */
        //This should be okay since it was pushed with stackEntry
        let currentBackState = window.history.state;
        if(!currentBackState){

            //This needs polyfilling
            currentBackState = this.generateBaseAppState(document.title, window.location.pathname);
        }
        if(currentBackState.stackEntry === undefined || currentBackState.stackEntry === null){

            //can get to negatives to polyfill
            currentBackState.stackEntry = this.currentStackEntry - 1;
            window.history.replaceState(currentBackState, currentBackState.pageTitle, window.location.pathname);
        }
    }

    
    /**
     * Gets the base page history state for the window history state API using a combination of the 
     * navBtnLinkSelector and basePageUrl
     * 
     * The generated app state's stack entry has not been normalized
     * 
     * Use targetBaseUrl cause of queries
     * 
     * @param {string} navBtnLinkSelector 
     * @param {string} targetBaseUrl
     * @param {string} fullUrl targetBaseUrl with queries
     * 
     * @returns {AppHistoryState}
     */
    getBaseAppStateFromMainNavID(navBtnLinkSelector, targetBaseUrl, fullUrl){

        const targetRouteInfo = RoutingInfoUtils.findMatchingRoutingInfoForUrlAndBaseNavBtn(this.mainRoutingInfo, targetBaseUrl, navBtnLinkSelector);
        if(!targetRouteInfo){

            throw new Error("No routing info found with this main navigation selector " + navBtnLinkSelector + " and route " + targetBaseUrl);
        }

        return this.generateBaseAppState(targetRouteInfo.pageTitle, fullUrl);
    }

    /**
     * Generate the base app state (without stack entry)
     * 
     * @param {string} pageTitle 
     * @param {string} url Must be the full url with queries (shown in address bar)
     * @returns {AppHistoryState}
     */
    generateBaseAppState(pageTitle, url){

        return {

            pageTitle: pageTitle,
            pageUrl: url
        };
    }

    /**
     * Normalize generated app state
     * 
     * Call if routing to new url thus forward records will be trashed by browser
     * 
     * @param {AppHistoryState} generatedState 
     */
    normalizeGeneratedAppState(generatedState){

        this.normalizeCurrentStackEntry();
        generatedState.stackEntry = ++this.currentStackEntry;
        return generatedState;
    }

    /**
     * @private
     * 
     * WARNING
     * 
     * Called internally. 
     * 
     * Overriding this will lead to unwanted App behaviour
     * 
     * Normalizes the current stack entry to what the browser has. At this point, there's no forward record 
     * or its about to be erased because of a full page reload or routing not triggered by a pop event
     */
    normalizeCurrentStackEntry(){

        /**
         * @type {AppHistoryState}
         */
        let currentState = window.history.state;
        if(!currentState){

            currentState = this.generateBaseAppState(document.title, window.location.pathname);
        }
        if(currentState.stackEntry !== null && currentState.stackEntry !== undefined){

            this.currentStackEntry = currentState.stackEntry;
        } //otherwise, default -1. Should only be so if app is yet to page, working with old API
    }
}

export default AppStateManager;