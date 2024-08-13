/**
 * @template T
 * @typedef {{ skipScrollStateRestore?: boolean } & T} routeBuildPipelineDataArgs
 * 
 */

/**
 * @typedef { { stateInfo: { newHistoryState: AppHistoryState, skipPushState: boolean, rootUrl: string } } } HistoryStateInfo
 * 
 * 
 * @typedef BaseRouteBuildPipelineArgs
 * @property {RoutingInfo} targetRouteEntry
 * @property {string} fullURL Complete URL for the route (params and queries included)
 * @property {routeBuildPipelineDataArgs<{}>} routeBuildPipelineDataArgs
 * @property {{ hasPopped: boolean, isBack: boolean }} popEvent
 * @property {boolean} skipConsentFromCancel
 * 
 * @typedef { BaseRouteBuildPipelineArgs & HistoryStateInfo } RouteBuildPipelineArgs
 * 
 * @typedef DiffTargetEntryInfo Use this in actual inflation
 * @property {boolean} inflationOverhaul Whether the whole targetRouteEntry is to be inflated
 * @property {number} childDiffIndex
 * 
 * @typedef { RoutingInfo & { fullURL: string, savedFragmentState: SavedFragmentState } } ExtendedRoutingInfo
 * 
 * @typedef InflatedRoutingInfo Inflated type of routing info with frags created
 * @property {AppMainFragmentInstance} inflatedTarget
 * @property {AppChildFragmentInstance[]} inflatedNestedChildFragments
 * @property {string} fullURL
 * 
 * @typedef RouteBuildInfo
 * @property {InflatedRoutingInfo} inflatedRoutingInfo
 * @property {SavedFragmentState} savedState
 * 
 * 
 */

/**
 * @template T
 * @typedef { RouteBuildPipelineArgs & { extendedData: T } } ExtGenericRouteBuildPipelineArgs
 * 
 */

