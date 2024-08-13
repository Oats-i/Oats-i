import RouteParamsUtil from "../route-params/route_params";

const URL_SEPARATOR = "/";

class RoutingInfoUtils {

    /**
     * Builds the main routing info
     * 
     * Does type checks and converts a null nestedChildFragments value to an 
     * empty array for easier manipulation later
     * 
     * @param {RoutingInfo[]} routingInfos 
     * @param {MainNavigationInfo[]} mainNavInfos The main navigational information for the app (optional)
     * @returns {RoutingInfo[]}
     */
    static buildMainRoutingInfo(routingInfos, mainNavInfos){

        let standardizedRoutingInfos = [];
        let targetNavInfo = null;
        routingInfos.forEach((routingInfo) => {

            //Check for errors
            routeIsValid(routingInfo.route);
            if(!routingInfo.target){

                throw new Error("Routing info for route " + routingInfo.route + " must have a target");
            }

            //Remove last / in route
            routingInfo.route = this.removeLastForwardSlashInUrl(routingInfo.route);

            //Standardize nestedChildFragments to empty array if null or undefined
            if (routingInfo.nestedChildFragments === null || routingInfo.nestedChildFragments === undefined){

                routingInfo.nestedChildFragments = [];
            }

            if(mainNavInfos){

                //Bind baseNavBtn property
                //special consideration for home "/" baseRoutes. Must MATCH
                // Therefore, / can catch-all, but overriden by explicitly defined extensions
                //try a direct match
                targetNavInfo = mainNavInfos.find((info) => routingInfo.route === info.baseActiveRoute);
                //if no direct match found, search for all. Longest string of qualified qualifies - to avoid shorthanding e.g "/" capturing all, even for /myRoute
                if(!targetNavInfo){

                    /**
                     * @type {MainNavigationInfo[]}
                     */
                    let matchingInfos = [];
                    mainNavInfos.forEach((info) => {
    
                        if(routingInfo.route.startsWith(info.baseActiveRoute)){
    
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
                routingInfo.baseNavBtn = targetNavInfo ? targetNavInfo.selector : null;
            }

            standardizedRoutingInfos.push(routingInfo);
        });
        
        return standardizedRoutingInfos;
    }

    /**
     * Builds the local routing info for fragments, triggered by a navigational control button
     * Use only if using buttons for automatic binding
     * 
     * @param {LocalFragmentRoutingInfo[]} localRoutingInfos 
     * @returns {LocalFragmentRoutingInfo[]} Array of standardized local fragment routing infos
     */
    static buildLocalRoutingInfo(localRoutingInfos) {

        let standardizeLocalRoutingInfos = [];
        let parsedNavBtnIds = [];
        localRoutingInfos.forEach((routingInfo) => {

            if(!parsedNavBtnIds.includes(routingInfo.navBtnID)){

                parsedNavBtnIds.push(routingInfo.navBtnID);
                //Route must exist
                routeIsValid(routingInfo.route);
                //Remove last forward slash
                routingInfo.route = this.removeLastForwardSlashInUrl(routingInfo.route);
                standardizeLocalRoutingInfos.push(routingInfo);
            } else {

                throw new Error("A navigation button can only be used once, for one valid route in your main router");
            }
        });

        return standardizeLocalRoutingInfos;
    }

    /**
     * Remove the last forward slash in url. Routing in o-js ignores it
     * @param {string} url 
     * @returns {string}
     */
    static removeLastForwardSlashInUrl(url){

        if(url.length > 1 && url.charAt(url.length - 1) === URL_SEPARATOR){

            url = url.substring(0, url.length - 1);
        }

        return url;
    }

    /**
     * 
     * @param {RoutingInfo[]} routingInfos 
     * @param {string} targetUrl 
     * @returns 
     */
    static findMatchingRoutingInfoForUrl(routingInfos, targetUrl){

        //Do a direct search first
        let targetInfo = routingInfos.find((routingEntry) => routingEntry.route === targetUrl);

        if(!targetInfo){

            //Search for congruent urls
            for(let i = 0; i < routingInfos.length; i++){

                if(RouteParamsUtil.testUrlsCongruent(routingInfos[i].route, targetUrl)){

                    targetInfo = routingInfos[i];
                    break;
                }
            }
        }
        
        return targetInfo;
    }

    /**
     * 
     * @param {RoutingInfo[]} routingInfos 
     * @param {string} targetUrl 
     * @returns {string}
     */
    static findActiveNavIDForUrl(routingInfos, targetUrl){

        const routingInfo = RoutingInfoUtils.findMatchingRoutingInfoForUrl(routingInfos, targetUrl);
        if(routingInfo){

            return routingInfo.baseNavBtn;
        } else {

            throw new Error("No active navigation ID found for url " + targetUrl);
        }
    }

    /**
     * 
     * @param {RoutingInfo[]} routingInfos 
     * @param {string} targetUrl 
     * @param {string} baseNavBtnID 
     */
    static findMatchingRoutingInfoForUrlAndBaseNavBtn(routingInfos, targetUrl, baseNavBtnID){

        //Find matching route info to targetUrl first. Then, MUST match baseNavBtnID
        //Call findMatchingRoutingInfo for url
        let targetInfo = RoutingInfoUtils.findMatchingRoutingInfoForUrl(routingInfos, targetUrl);
        return targetInfo ? targetInfo.baseNavBtn === baseNavBtnID ? targetInfo : undefined : undefined;
    }
}

/**
 * 
 * @param {string} route 
 */
function routeIsValid(route){

    if(!route){

        throw new Error("Please provide a valid route for the routing info");
    }

    if(route.charAt(0) !== URL_SEPARATOR){

        throw new Error("All routes must start with " + URL_SEPARATOR);
    }
}

export default RoutingInfoUtils;