/**
 * Local routing information based on local navigation controls
 * 
 * Use this to trigger buttons too? YES. Use startsWith to always work
 * 
 * They call triggerNavigationalRouting(navBtnID). Can override to do sth custom. 
 * Calling super does the routing requested
 * 
 * @typedef {object} LocalFragmentRoutingInfo
 * @property {string} route The route the navigation button should request for
 * @property {string} baseActiveRoute The base route the navigation button should always be active for
 * @property {string} navBtnID The navigation button ID that triggers this route. One ID can only trigger one route. Enforced in builder
 */