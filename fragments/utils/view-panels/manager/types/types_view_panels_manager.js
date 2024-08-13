/**
 * @typedef {import("ViewPanelsManager").ViewPanelsManagerInstance} ViewPanelsManagerInstance
 */
/**
 * @typedef {import("./view_panels_manager_build_pipeline.d.ts.js").ViewPanelsManagerMainBuildPipelineConstructorArgs} ViewPanelsManagerMainBuildPipelineConstructorArgs
 */
/**
 * @typedef { { complete: 0, consenting: 1, consentApproved: 2, consentDenied: 3, building: 4, buildCancelled: 5, destroying: 6 }} ViewPanelsManagerBuildPipelineStates
 * @typedef { { buildStartSuccessDFA: {}, buildStartBuildCancelledDFA: {}, buildFinishedConsentDFA: {}, buildDestroyDFA: {}, consentApprovedNoDestroyRebuild: {} } } ViewPanelsManagerDFAGroups
 */
/**
 * @typedef { import("ViewPanelsManager").ViewPanelsManagerBuildPipelineStartBuildArgs } ViewPanelsManagerBuildPipelineStartBuildArgs //That object notation {} is important to deal with some weird Generics issue with typescrip
 */
/**
 * @template T, RD
 * @typedef { import("ViewPanelsManager").LaunchViewPanelParams<T, RD> } LaunchViewPanelParams
 */
/**
 * @template T, RD
 * @typedef { import("ViewPanelsManager").LaunchViewPanelParamsData<T, RD> } LaunchViewPanelParamsData
 */
/** 
 * @template T
 * @typedef { import("ViewPanelsManager").LaunchViewPanelParams<T> } LaunchViewPanelParams
 */
/**
 * @typedef { import("ViewPanelsManager").OrderedViewPanelsManagerWatchQueries } OrderedViewPanelsManagerWatchQueries
 */
/**
 * @typedef { import("ViewPanelsManager").PanelNameDefinitions } PanelNameDefinitions
 */
/**
 * @typedef { import("ViewPanelsManager").RunningViewPanelInfo } RunningViewPanelInfo
 */
/**
 * @typedef { import("ViewPanelsManager").ViewPanelsManagerConstructorArgs } ViewPanelsManagerConstructorArgs
 */
/**
 * @typedef { import("ViewPanelsManager").getViewPanelConsentCb } getViewPanelConsentCb
 * @typedef { import("ViewPanelsManager").ViewPanelConsentCbParams } ViewPanelConsentCbParams
 */

/**
 * Start here. Implement ViewPanelManager.buildFromParams. Cascades to children. Children passed resolved on inflation to maintain tree-context params
 * Can sort of implement dynamic bundling here. Pass controller as link to bundle and use fragment logic
 * Ordered by first finding matching in top of nest. MUST find. If inflated, send with childrenWatchQueries passed as watch params for the panel to build next from from routeQueries. Filter the same way. Found order.
 * Above means, if { "save" : { controllerClass: SaveViewPanelController, childrenWatchQueries: ... }}, SaveViewController will trigger its child by matching with appropriate routeQueries entry in top keys of object
 * Remember, this is a nested object
 * Looks more like routing info object
 * Makes sense to get context of queryName, queryValue, with similarQueryName replacement policy of destroy?
 * What role is routing playing with this?
 * Used to destroy routes before...
 * ROUTES lead to views, representing frags or view panels. REMEMBER THAT. So, MUST link a queryName to queryValue. 
 * How many ViewPanelsManager can a frag have?
 * What's the ViewPanelsManager view management policy?
 * How can we trigger consent seeking when trying to destroy a view panel? Treat it like a full route build? Might have to... Thus consent
 * Example of above, say the shopping view panel is up. It's checking out and you want to prevent user navigation out of it. How can you handle it if say the previous view panel was view cart?
 * Is this making it too complex? What will we sacrifice in terms of architectural flexibility of Oats~i sites?
 * It means view panels should NOT be in consent flow?
 * What of changing it based on changing queries and confirming if that can change?
 * And at will adding routable pop ups via queries to make say, checking out quickly from any page easy. Interesting...
 * This can be less complex if view panels become views not strongly bounded to routes. This means, they can be popped at route invocation or not, anywhere, and destroyed at user will, not unless it was popped through a fragment.
 * That leaves management of their appearance on view to the developer.
 * I think this is actually a more powerful framework
 * For instance, while say, browsing an e-commerce site and you get a message from the seller, you can trigger a view panel to show 
 * their message and allow you to respond to it and have it persist on screen while browsing other areas to keep the chat active
 * THIS IS A MUCH BETTER DESIGN. Follow with this. Have view panels optionally bound to the route. Only so if triggered by internal ViewPanelsManager
 * internal ViewPanelsManager instance only set once. 
 * Look at extensible singletons idea I had. Or, call Object.freeze() on the instance. Override passed as argument to fragment to inflate super with it
 * External ViewPanelManager instance (also frozen) in MainRouter services?
 * Access a service pipeline by id (predefined services)
 * SO, IT IS A HYBRID. That means, consent still needed, performed by those bound to frag.
 * Consent while getting state...or some other way....
 * Continue with this....
 * 
 * RESOLUTION SO FAR
 * Use a map, with key value, or just object. Keys used to match with context
 * Or, can use value exclusion (object works like that anyway). So, if inflated of same tree, and requesting different one, ask if delete
 * 
 * Can provide nonExclusionKeys, containing keys that can stack on top of each other - in a Set of strings (so naturally no-repeat elements). BETTER
 * alert there by default. Thus, managed differently
 * These parents stacked. So consent first parent with tree, then next if no deny
 * This ONLY works top level.
 * This tree should be two-level for simplicity. So, parent and stacked children
 * Therefore, non-exclusion list only valid for parents
 * And, consent for state only also includes new queryParams. Use to destroy necessary viewPanels. Fragments already directly handled.
 * nonExclusive and exclusive view panels exist in different stack maps. Direct to latest how? exclusives destroy current
 * so, destroy current only works if fragment destroying or state change changing params of exclusive to exclusive being added there. Look up to determine replacement policy
 * All children just stack. So, no mutual exclusiveness. Just look at who's dropped in latest query structure and stack consent from target
 * Stack object with target and inflationQuery
 * Can't get stack order based on query depth of children loop? So children no longer flat. YES. Better
 * So, can close a panel directly if pass parent query and id of panel. Looped to find child. MUST be top of stack
 * Actually, doing this creates the order I was looking for. So, inflate next looking at tree and confirming passed query has value
 * Searches tree to find panel ID to close. 
 * Can reduce algorithmic complexity by providing children of parent as orderedMap of <string, childrenWatchQueries> type, string being query, BETTER for populating consent list?
 * Naaaa...actually ask value based on key of next nest. If not there, then destruction starting at that point. Retrive consent list from stack of parent (root) (remember root maintains a stack of all children)
 * YES
 * Pass value of query from passed and use to run actual data queries or make other decisions if needed
 * 
 * Context can be left when defining ViewPanelsManagerWatchQueries. Random string used. Thus, non-exclusive.
 * Same contexts are mutually exclusive
 * 
 * panelID redundant? context more unique as changes with nonExclusive inflations, unlike predefined panelID that
 * can't uniquely target a viewpanel. YES
 * Actually, NO. context can be repeated for an exclusive one. But only one exists. So, still OK as an ID?
 * Can pass flag for uniqueID (boolean) to specify if uniqueID should be generated that's not same to context, if context provided. REDUNDANT. Never will two same context exist. They are mutually exclusive.
 * id targets root. So, calls only for destroying whole tree. (implement transition animation hijacking)
 * Use context. Call what's returned the inflationID during openViewPanel //panelID: string,
 * 
 * By being ordered, it means the watch queries also give order of inflation based on query nesting
 * 
 * THIS NEEDS A VIEW PANEL RETHINK, IN THIS WAY
 * string in the object is the queryName. Value affects viewpanel functions. So, avoid panels where action=attach and action=detach are different panels
 * For such, change to attach=true, detach=true, so maintain different trees as should with "filler" values (true)
 * 
 * Can still relate the two above in the following way: share the same context. Thus, cannot show attach and detach panel at the same time
 * Context is the key to the activeViewPanels map. Thus, expressed by different queries with values extractable, but made mutually exclusive by context
 * @typedef { import("ViewPanelsManager").ViewPanelsManagerChildrenWatchQueries } ViewPanelsManagerChildrenWatchQueries
 * @typedef { import("ViewPanelsManager").ViewPanelChildQueryTree } ViewPanelChildQueryTree
 * @typedef { import("ViewPanelsManager").ViewPanelRootQueryTree } ViewPanelRootQueryTree
 * 
 * @typedef { import("ViewPanelsManager").MatchingRootViewPanelInfo } MatchingRootViewPanelInfo
 */