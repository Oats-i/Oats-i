declare module "ViewPanel" {

    declare interface ViewPanelInstance<LAUNCH_DATA, HOST_PIPELINE_DATA>{

        //Members
        viewPanelsManager: ViewPanelsManagerInstance;
        panelQuery: string; //The query to read value from. Also, one to read savedState from?
        globalInflationID: string;
        viewPanelLocalPipelineWorker: import("./types/view_panel_local_pipeline_worker.d.ts.js").ViewPanelLocalPipelineWorkerInstance<S, B, D_G, P_S>;
        panelRootViewID: string;
        contentRootViewID: string;
        panelRootViewNode: HTMLElement;
        contentRootViewNode: HTMLElement;
        remoteUILoader: import("../../remote-ui-loader/remote_ui_loader_script.js").default;
        localRoutingInfos: LocalViewPanelRoutingInfo[];
        currentlyActiveFullQuery: string;
        currentlyActiveBaseRoute: string;
        currentlyActivePanelNavId: string;
        dataResponseHostPipeline: genericParamFunction<HOST_PIPELINE_DATA>

        //Methods
        //Pipeline method
        onViewPanelBuildStart(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs, localPipelineCb: genericParamFunction<ViewPanelBuildStagesArgs>): void;
        onInitPanelView(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs, localPipelineCb: genericParamFunction<ViewPanelBuildStagesArgs>): void;
        //Support method
        initializePanelView(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs, localPipelineCb: genericParamFunction<ViewPanelBuildStagesArgs>): Promise<void>;
        onViewInitSuccess(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs, localPipelineCb: genericParamFunction<ViewPanelBuildStagesArgs>): void;
        onBindPanelView(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs, localPipelineCb: genericParamFunction<ViewPanelBuildStagesArgs>): void;
        setWrapperAttributes(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs, wrapper: HTMLDivElement): void;
        onBindPanelViewUtils(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs, localPipelineCb: genericParamFunction<ViewPanelBuildStagesArgs>): void;
        bindPanelViewUIToListeners(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs): void;
        onViewPanelUIBind(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs): void;
        bindLocalRoutingInfoToNavigation(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs): void;
        triggerViewPanelNavigationalRouting(info: LocalViewPanelRoutingInfo, dataAndArgs: routeBuildPipelineDataArgs<{}>, failCb: genericFunction): void;
        onViewPanelUpdateParams(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs, localPipelineCb: genericParamFunction<ViewPanelBuildStagesArgs>): void;
        onQueryDataUpdate(updatedQueries: RouteQueryData, data: LaunchViewPanelParamsData<LAUNCH_DATA, HOST_PIPELINE_DATA>, specSavedState: ExtSpecSavedFragmentState): Promise<void>;
        onViewPanelConsent(pipelineCb: getViewPanelConsentCb): void;
        maintainViewPanel(pipelineCb: getViewPanelConsentCb): void;
        getViewPanelState(): SavedFragmentState;
        getSaveStateID(): string;
        destroyViewPanel(cb: genericFunction): void;
        detachPanelViewFromDOM(localPipelineCb: genericFunction): void;

        isViewPanelRootViewInitialized(): boolean;
        isViewPanelContentViewInitialized(): boolean;
        getLifeCycleObject(): FragmentLifeCycleInstance;

        //For transitions
        getLaunchTransitionsData_Workers_Queue(launchParams: LaunchViewPanelParams<LAUNCH_DATA, HOST_PIPELINE_DATA>, buildStageArgs: ViewPanelBuildStagesArgs): TransitionsManagerRunArgs<{}>
        getCloseTransitionsData_Workers_Queue(): TransitionsManagerRunArgs<{}>
    }

    declare interface ViewPanelConstructor<LAUNCH_DATA, HOST_PIPELINE_DATA> {
        
        new(args: ExtViewPanelConstructorArgs): ViewPanelInstance<LAUNCH_DATA, HOST_PIPELINE_DATA>
    }

    type ViewPanelBuildStagesArgs = {

        viewTemplate?: string,
        isContentViewPreRendered: boolean,
    }

    type ViewPanelConstructorArgs = {

        panelQuery: string,
        globalInflationID?: string,
        viewPanelsManager: import("ViewPanelsManager").ViewPanelsManagerInstance,
        hostFragmentLifeCycleObject: FragmentLifeCycleInstance,
    }

    type BaseViewPanelConstructorArgs = {

        panelRootViewID: string,
        //Tells whether the root view of the view panel is fixed to DOM. Help decide how to detach view
        panelRootViewDOMFixed: boolean, //Can do this if don't want anchored under body, default behavior
        contentRootViewID: string, //ID of the root view where the content markup starts. Helps to determine if view has been initialized, if root panel view ID is manually fixed in the DOM by developer. Ensure this matches what you have in DOM
        panelUpdateQueryList?: RouteQueryData,
        localRoutingInfos?: LocalViewPanelRoutingInfo[] //Provide this ONLY if you'll be navigating the panel using routes
    }

    type ExtViewPanelConstructorArgs = BaseViewPanelConstructorArgs & ViewPanelConstructorArgs;

    type LocalViewPanelRoutingInfo = {

        routeQuery: string; //The route the navigation button should request for
        baseActiveRouteQuery: string; //The base route the navigation button should always be active for
        navBtnID: string; //The navigation button ID that triggers this route. One ID can only trigger one route. Enforced in builder
    }
}