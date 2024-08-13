/**
 * @typedef {object} IndexedRouterHistory The immediate history of the router
 * @property {AppHistoryState} lastHistoryState The last page history state
 * @property {RoutingInfo} lastRouteEntry The last routing info
 * @property {number} deadHistoryNodeStartIndex
 */

class IndexedRouterHistoryUtils {

    /**
     * 
     * @returns {IndexedRouterHistory} a null indexed router history object
     */
    static initIndexedRouterHistory(){

        return {

            lastHistoryState: null,
            lastRouteEntry: null,
            deadHistoryNodeStartIndex: null
        }
    }
}

export default IndexedRouterHistoryUtils;