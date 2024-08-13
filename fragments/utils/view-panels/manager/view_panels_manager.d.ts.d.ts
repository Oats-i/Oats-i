declare module "ViewPanelsManager"{

    interface ViewPanelsManagerInstance{

        //class stuff here

        //Members
        routeWatchQueries: OrderedViewPanelsManagerWatchQueries,
        panelNameDefinitions: PanelNameDefinitions,
        masterViewPanelInfoUtils: MasterViewPanelInfoUtils,
        fragmentLifeCycleObject: FragmentLifeCycleObjectType,
        mainViewPanelBuildPipeline: import("./types/view_panels_manager_build_pipeline.d.ts.js").ViewPanelsManagerMainBuildPipelineInstance<ViewPanelsManagerBuildPipelineStates, ViewPanelsManagerBuildPipelineStartBuildArgs>,
        mainRouterInstance: import("../../../../router/main_router.js").default

        //Methods
        openViewPanel(args: LaunchViewPanelParams<{}, {}> & { overrideMatchingPanelRootInfo?: MatchingRootViewPanelInfo }): string;
        openViewPanelByName(panelName: string, args: LaunchViewPanelParams<{}, {}>): string;
        directOpenViewPanel<T extends BaseViewPanelConstructorArgs, LD, HPD>(panelBuilder: ViewPanelBuilderInstance<T, LD, HPD>, args: LaunchViewPanelParams<LD, HPD>): string;
        closeViewPanel(inflationID: string, cb: genericParamFunction<boolean>): void;
        getViewPanelsConsent(newRouteInfo: NewRouteConsentInfo, consentCb: getViewPanelConsentCb): void;
        destroyAllViewPanels(cb: genericFunction): void;
        
        /**
         * Open routes from a view panel. Called by a view panel
         * */
        //Open a new route from current route with new queries
        //Consequently can trigger a view panel build
        requestRouteToQuery(query: string, dataAndArgs: routeBuildPipelineDataArgs<{}>, failCb: genericFunction): void;
        requestFullRoute(fullRoute: string, dataAndArgs: routeBuildPipelineDataArgs<{}>, failCb: genericFunction): void;
    }

    export interface ViewPanelsManagerConstructor{

        new(args: ViewPanelsManagerConstructorArgs): ViewPanelsManagerInstance

        //static methods
        //PUT HERE BECAUSE THIS IS THE STATIC SIDE OF THE CLASS
        get ViewPanelsManagerSavedStateKey(): string;
    }

    type ViewPanelsManagerConstructorArgs = {

        routeWatchQueries?: OrderedViewPanelsManagerWatchQueries,
        panelNameDefinitions?: PanelNameDefinitions,
        fragmentLifeCycleObject: FragmentLifeCycleInstance,
        mainRouterInstance: import("../../../../router/main_router.js").default
    }

    type MasterViewPanelInfoUtils = {

        activeViewPanels: ActiveViewPanelsMap,
        exclusiveMapKeyStack: ExclusiveMapKeyStackType,
        addMasterViewPanelInfo: genericParamFunction<{ key: string, runningViewPanelInfo: RunningViewPanelInfo }>,
        deleteMasterViewPanelInfo: genericParamFunction<string>,
        updateMasterViewPanelInfoState: (key: string, state: import("ViewPanelsManager").RunningViewPanelInfoStates) => void
    }

    type ActiveViewPanelsMap = Map<string, RunningViewPanelInfo>

    type ExclusiveMapKeyStackType = import("../../../../utils/abstract-data-types/exclusive-stack/exclusive_stack_adt.js").default<string>;

    type FragmentLifeCycleObjectType = FragmentLifeCycleInstance;

    type ViewPanelsManagerBuildPipelineStartBuildArgs = BasePipelineGenericBuildArgs & {

        //Implement declaration files for these imports as a module
        panelStacks: {

            buildStack: import("Stack").StackInstance<import("ViewPanel").ViewPanelInstance<*, *>>,
        }
        launchViewPanelParams: LaunchViewPanelParams<{}>,
        buildID: string,
        failStartCb: genericFunction, 
        successCb: genericFunction
    }
    
    type LaunchViewPanelParams<T, RD> = {
    
        routeParams?: RouteParams 
        queries: RouteQueryData,
        data?: LaunchViewPanelParamsData<T, RD>,
        savedState: SavedFragmentState
    }

    type LaunchViewPanelParamsData<T, RD> = {

        transitionsDataCollection?: TransitionsDataCollection<{}>,
        myData?: T,
        dataResponseHostPipeline?: genericParamFunction<RD>
    }

    type RunningViewPanelInfo = {

        runningViewPanels: import("../../../../utils/abstract-data-types/stack/stack_adt.js").default<import("ViewPanel").ViewPanelInstance<*, *>>,
        rootQuery_PanelName: string,
        runningQuery_PanelName_Stack: import("../../../../utils/abstract-data-types/stack/stack_adt.js").default<string>,
        currentState?: RunningViewPanelInfoStates
    }

    type RunningViewPanelInfoStates = "building" | "running" | "consenting" | "consented" | "destroying";

    //Use ONLY for view panels opened by route i.e are route built
    type OrderedViewPanelsManagerWatchQueries = {

        [key: string]: ViewPanelRootQueryTree
    }

    type ViewPanelRootQueryTree = ViewPanelChildQueryTree & {

        context?: string, //Used internally to provide ID for the rootquerytree and key for its position in map. SAME VALUE FOR ALL for routeBuilt i.e defined in OrderedViewPanelsManagerWatchQueries
    }

    type ViewPanelChildQueryTree = {

        viewPanelBuilder: ViewPanelBuilderInstance, 
        childrenWatchQueries?: ViewPanelsManagerChildrenWatchQueries
    }

    type ViewPanelsManagerChildrenWatchQueries = {

        [key: string]: ViewPanelChildQueryTree
    }

    //Same as OrderedViewPanelsManagerWatchQueries but only used for panels opened by name
    //However, children watch queries doesn't count. Only one level nest, panelName, works
    type PanelNameDefinitions = OrderedViewPanelsManagerWatchQueries;

    type MatchingRootViewPanelInfo = {

        rootQueryTree_Panel: ViewPanelRootQueryTree, 
        matchingQuery_Name: string
    }

    type getViewPanelConsentCb = genericParamFunction<ViewPanelConsentCbParams>;
    type ViewPanelConsentCbParams = {consent: boolean, panelsSavedState: SavedFragmentState};
}