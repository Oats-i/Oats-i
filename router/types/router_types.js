/**
 * @typedef {import("Oats~i_Router_Types").MainNavigationInfo} MainNavigationInfo Main navigational info for the route. Used by the app's root to handle navigation and state management by the app's state manager
 * 
 * @typedef {object} RoutingInfo Routing information for the app
 * @property {string} route The route valid for this entry
 * @property {AppFragmentBuilder} target The main fragment that starts this route
 * @property {AppFragmentBuilder[]} nestedChildFragments The child fragments targeted for this route, in a nested order
 * @property {string} [baseNavBtn] (Auto-generated - so remove? I think YES) base navigational button for this route. Auto generated from the MainNavigationInfo
 * @property {string} [pageTitle] (Optional) The title of the current routed page. {Allow to pass when requesting routing}
 * 
 * For managing access to a route internally
 * @typedef {object} RoutePipelineAccessValidator
 * @property {boolean} canAccess
 * @property {string} fallbackRoute 
 * 
 * @callback canAccessRoute Optional.
 * @param {string} route
 * @returns {Promise<RoutePipelineAccessValidator>} Whether the route can be accessed or not and fallback route if access denied.
 * 
 */