declare module "AppMainFragment" {

    export declare interface AppMainFragmentInstance{

        //Make declaration file for main router
        mainRouter: MainRouter;
        localPipelineWorker: LocalPipelineWorkerInstance;
        viewID: string,

        getLifeCycleObject(): FragmentLifeCycleInstance;
    }

    export declare interface AppMainFragmentConstructor{

        new(args: AppMainFragmentConstructorArgs): AppMainFragmentInstance;
    }

    export declare interface LocalPipelineWorkerInstance {

        buildFragmentRoute(routeParams: RouteParams, savedState: SavedFragmentState, data: *, cb: genericFunction): void;
        ////HAVE THIS (New route consent info) Hold transitions info too? Each transition worker has unique label for data, with per target labelled (transition-target property in markup). And if fragment being completely destroyed? Yes
        getRouteChangeConsent(routingPipelineCb: routingPipelineConsentCb, newRouteInfo: NewRouteConsentInfo): void;
        routeMaintained: genericFunction;
        destroyFragment(fragmentDestroyCb: fragmentDestroyCb): void;
        buildFragmentRoute(routeParams: RouteParams, savedState: ExtendedSavedFragmentState, data: *, cb: genericFunction): void;
        cancelFragmentRoute(cb: genericFunction): void;
    }

    type AppMainFragmentConstructorArgs = {

        mainRouter?: MainRouter,
        localRoutingInfos: LocalFragmentRoutingInfo[],
        viewID: string,
        queryParams: UpdatedQueryParams,
        //I think with latest developments below is irrelevant
        viewLoadingAnimationView?: ViewLoadingAnimationView
    }
    
    type routingPipelineConsentCb = genericParamFunction<ConsentCbParams>;
    
    type ConsentCbParams = {

        consent: boolean,
        savedState: SavedFragmentState
    }

    type fragmentDestroyCb = genericFunction;
    
    type NewRouteConsentInfo = {
        
        newRouteParams: RouteParams,
        fragToBeDestroyed: boolean
    }
    
    type SavedFragmentState = {
        
        [x: string]: SpecSavedFragmentState
    }
    
    type SpecSavedFragmentState = {
        
        scrollPos: { 
            x: number, 
            y: number 
        }, 
        smoothScroll: boolean, 
        viewPanelSaveState?: SavedFragmentState 
    } & MyDataFragmentState;
    
    type MyDataFragmentState = {
        
        data: *;
    }
    
    type ExtSpecSavedFragmentState = SpecSavedFragmentState & {
        
        target: string 
    }
    
    //I think you are redundant given how we're running in new blog
    type ViewLoadingAnimationView = {
        
        loading: { 
            
            view?: string, 
            id: string
        },
        fail: { 
            view: string, 
            id: string, 
            retryBtnId: string 
        }
    }
    
    //I don't think you should be existing. Just Ext (same)
    type ExtendedSavedFragmentState = SavedFragmentState & { 
        
        overrideTarget: string 
    }
    
    //Replaces old RouteQueryData, allowing easy definition of unique using generics
    type GenericRouteQueryData<T extends RouteQueryData> = {
        
        [x in keyof T]: string
    }

    type UpdatedQueryParams = GenericUpdatedQueryParams<RouteParamsData, RouteQueryData>

    type GenericUpdatedQueryParams<P, Q> = {

        params?: P,
        queries?: Q
    }
    
    /**
     * FOR LOCAL PIPELINE WORKER
     */
    type FragmentPipelineWorkerArgs = {

        routeParams: RouteParams,
        savedState: SavedFragmentState,
        data: *,
        mainPipelineCb: genericFunction
    }
}