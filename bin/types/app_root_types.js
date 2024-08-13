/**
 * This is the view that holds all fragments in the app and controls to operate these fragments
 * Can be dynamically loaded to allow unique views per user class/type
 * Combined with dynamically loading the fragments as needed, only parts of the app the current user class needs will be loaded from the view set at the app root. 
 * Use other access-control methods to ensure zero bypass by an advanced user such as validating requests for views on the server as well before rendering.
 * 
 * @typedef {object} AppRootView
 * @property {string} template Inflated HTML template
 * @property {MainNavigationInfo[]} mainNavInfos Navigation info for the root view to help with navigation state management
 * @property {string} [viewParentID] The parent ID the view will be attached to. If it's not provided, the view will be attached to the body
 */