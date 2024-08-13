declare module "StandardViewManager" {
  
    /**
     * say, model has checkoutOptions: { ... }
     * and scopedRootView is for changes in checkoutOptions, then SCOPED_MODEL is { ... }
     */
    interface DataComparatorInterfaceInstance<MODEL extends BASE_DATA_MODEL>{

        base(): boolean;
        ofScope(scope: NestedKeyOf<MODEL>): boolean;
    }

    interface DataComparatorInterfaceConstructor<MODEL extends BASE_DATA_MODEL>{

        new(): DataComparatorInterfaceInstance<MODEL>
    }

    //Now, includes scope generic declaration, to make later inferences easier
    interface StandardViewManagerInstance<MODEL extends BASE_DATA_MODEL, GlobalScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']>{

        scope: GlobalScope;
        rootViewOptions: StandardRootViewRegistrationOptions;
        //Watcher child view managers needed because they're not part of getting ordered array indices. They DON'T touch any data in the current data manager and only watch the external one
        
        //Base is value type. Array based on type of manager 
        //NOTE!!! - See value type not being casted to array because SHOULD BE AN ARRAY
        existingModelsList: Partial<ValueTypeOfNested<MODEL, GlobalScope>>;
        attachedModels: QueueInstance<{ modelId: string, itemPosition: number, mappedDataId: string, attachedViewNode: Element, orderedChildViewManagers: QueueInstance<ListViewManagerInstance<MODEL, NestedChildKeysOfArray_ArrayOnly<MODEL, GlobalScope>>>, watcherChildViewManagers: Array<StandardViewManagerInstance<*,*>> }>;
        rootViewDataHooks: RootViewDataHooks<MODEL, GlobalScope>;
        componentViewDataHooks: RootComponentViewHooks<MODEL, GlobalScope>;
        externalWatchDataHooks: ExternalWatchDataHooks<MODEL, GlobalScope>;
        //Child view managers put here. Parent registers itself for the scope. Handles direct calls. 
        //Passes its own cb to it. If build new view, then build new child view manager for ALL
        childViewManagers: Array<{viewManagerConstructor: ListViewManagerConstructor<MODEL, NestedChildKeysOfArray_ArrayOnly<MODEL, GlobalScope>>, scope: NestedChildKeysOfArray_ArrayOnly<MODEL, GlobalScope>, constructorOptions: ListDataManagerViewManagerConstructorOptions<MODEL, NestedChildKeysOfArray_ArrayOnly<MODEL, GlobalScope>>, hooks: ChildViewManagerHooks<MODEL, NestedChildKeyOfArray<MODEL, GlobalScope>>, nestedChildViewManagers: ChildViewManagerBuildOptions<MODEL, NestedChildKeysOfArray_ArrayOnly<MODEL, GlobalScope>>[]}>;
        externalWatchChildViewManagers: Array<{viewManagerConstructor: StandardViewManagerConstructor<*, *>, dataManager: DataManagerInstance<*>, constructorOptions: DataManagerViewManagerConstructorOptions<*, *>, hooks: ExternalWatchDataHooks<*, *> }>
        id: string;
        isChildInfo: IsChildInfo;
        isWatcher: boolean;

        //Make it easier to reference child
        //Set when creating children. Look at that logic 
        //Cascade calls to children as well
        childOptions: StandardViewManagerChildOptions;

        //Initializes view manager. Populates any views based on available data
        initViewManager(childInitArgs: StandardViewManagerChildInitArgs<MODEL, NestedChildKeysOfArray_ArrayOnly<MODEL, GlobalScope>>): void;

        //auto populates views from existing data - called directly (cascades to children, assuming also now in view - automatically based on commit behavior)
        //returns whether we managed to autopopulate or not
        autoPopulateViewsFromExisting(): boolean;

        //Using nestedChildKeyOf to correctly infer only children of scope
        setChildViewManager<ChildScope extends NestedChildKeysOfArray_ArrayOnly<MODEL, GlobalScope>>(args: ChildViewManagerBuildOptions<MODEL, ChildScope>): void;

        //Used to set a child view manager who's for external watch only.
        //Therefore, calls not cascaded to it. Just inflated, and it hooks appropriately as a watcher.
        //If parent-spawned view destroyed, this also destroyed, just like normal one
        //TO BE IMPLEMENTED
        setExternalWatchChildViewManager<ExMODEL, ExScope extends "MODEL_ROOT" | NestedKeyOf<ExMODEL>>(dataManager: DataManagerInstance<ExMODEL>, watchChildViewManagerConstructor: StandardViewManagerConstructor<ExMODEL, ExScope>, constructorOptions: DataManagerViewManagerConstructorOptions<ExMODEL, ExScope>, hooks: ExternalWatchDataHooks<ExMODEL, ExScope>): void;

        //Now, called to self to set the external watch data hook to inform view of commits (changes to watched data)
        //TO BE IMPLEMENTED
        setExternalWatchDataHooks(hook: ExternalWatchDataHooks<MODEL, GlobalScope>): void;
    
        //Now, data manager will invoke special methods here (onCommit etc) and have 
        //view manager fire correct hooks and bind data correctly
    
        //Called when a data mutation is about to happen
        //Manage views based on this. Say, load a new view or delete current one for lists or recyclable
        //DON'T HAVE DEVELOPER CREATE OR REMOVE VIEWS. BEATS LOGIC OF HAVING VIEW MANAGER
        //Using ReqScope cause can be triggered in higher scopes
        onMutate<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']>(mutation: DataManagerMutations, newModel: Partial<ValueTypeOfNested<MODEL, ReqScope>> | Partial<ValueTypeOfNested<MODEL, ReqScope>>[], oldModel: Partial<ValueTypeOfNested<MODEL, ReqScope>> | Partial<ValueTypeOfNested<MODEL, ReqScope>>[], mappedDataId: string, modelID: string | string[], APIScope: ReqScope, completeCb: genericParamFunction<TempMappedDataIdsInfo>, extras: ViewManagerMutationCBExtras<MODEL, ReqScope>): void;
    
        //Called when a mutation fails
        //Pass in a cb for whether to retry
        onError<R, S, B_A, D_G, ReqScope>(mutation: DataManagerMutations, newModel: Partial<ValueTypeOfNested<MODEL, ReqScope>> | Partial<ValueTypeOfNested<MODEL, ReqScope>>[], oldModel: Partial<ValueTypeOfNested<MODEL, ReqScope>> | Partial<ValueTypeOfNested<MODEL, ReqScope>>[], mappedDataId: string, modelID: string | string[], response: R, APIScope: ReqScope, retryCbInterface: DataPipelineConfirmCallbackInterfaceInstance<S, B_A, D_G>, extras: ViewManagerMutationCBExtras<MODEL, ReqScope>): void;
    
        //call this onCommit (commited data changes) - so, successful
        //Now, code will use the mappedDataId to get the related view, hooks.
        //Model scoped to main scope of view manager
        onCommit<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']>(mutation: DataManagerMutations, newData: DataManagerPermittedBulkType<MODEL, ReqScope>, oldData: DataManagerPermittedBulkType<MODEL, ReqScope>, mappedDataId: string, modelID: DataManagerPermittedBulkModelIDs<ReqScope>, APIScope: ReqScope, originalScope: NestedChildKeyOf<MODEL, ReqScope>, completeCb: genericFunction, extras: ViewManagerMutationCBExtras<MODEL, ReqScope>): void;

        //For when operation has been cancelled
        //extra passes the temp we'd set up, if any, since its mutation type dependent
        onCancel<ReqScope>(mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, ReqScope>> | Partial<ValueTypeOfNested<MODEL, ReqScope>>[], oldData: Partial<ValueTypeOfNested<MODEL, ReqScope>> | Partial<ValueTypeOfNested<MODEL, ReqScope>>[], mappedDataId: string, modelID: string | string[], APIScope: ReqScope, res: DataManagerErrResponse, completeCb: genericFunction, extras: ViewManagerMutationCBExtras<MODEL, ReqScope>): void;

        //Called when external watched data has commited. Then calls hooks
        //TO BE IMPLEMENTED
        onExternalWatchCommit<ReqScope>(mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, ReqScope>> | Partial<ValueTypeOfNested<MODEL, ReqScope>>[], oldData: Partial<ValueTypeOfNested<MODEL, ReqScope>> | Partial<ValueTypeOfNested<MODEL, ReqScope>>[]): void
    
        //Called to build the root view.
        //So use your template here
        //THIS FUNCTION MUST return the string of the templated view
        //DO NOT MANUALLY ATTACH YOUR VIEW HERE. DataManager will do it

        //Builds the viewNode for root. Happens for loadNew, uploadNew, and create mutations
        runRootAndViewNodeBuild(mutation: DataManagerMutations, modelId: string, newData: Partial<ValueTypeOfNested<MODEL, GlobalScope>>, overrideSpawnedMappedDataId?: string): NewViewInfo;
        //Detaches a view node from root. Happens when relevant data deleted
        detachViewNodeFromRootParent(mutation: DataManagerMutations, modelId: string, data: Partial<ValueTypeOfNested<MODEL, GlobalScope>>, mappedDataId: string): void;

        registerViewDataHooks(rootHooks: RootViewDataHooks<MODEL, GlobalScope>, componentHooks: RootComponentViewHooks<MODEL, GlobalScope>): boolean; //False if no registered root view - arg solely - StandardViewManagerInstance<MODEL>['scope'] extends "MODEL_ROOT" ? MODEL : ValueTypeOfNested<MODEL, Omit<StandardViewManagerInstance<MODEL>['scope'], "MODEL_ROOT">>>

        getLifeCycleInstance(): FragmentLifeCycleInstance;
        hasMappedDataId(mappedDataId: string): boolean;
        getModelIdForMappedDataId(mappedDataId: string): string;
        getViewNodeForMappedDataId(mappedDataId: string): Element;
        getMappedDataIdThatMatchesProperties(properties: Partial<ValueTypeOfNested<MODEL, GlobalScope>>): string;

        getParentRootViewNode(): Element;

        dataComparator<APIReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(newData: DataManagerPermittedBulkType<MODEL, APIReqScope>, oldData: DataManagerPermittedBulkType<MODEL, APIReqScope>, APIScope: APIReqScope, mappedDataId: string): DataComparatorInterfaceInstance<MODEL>;
        //Get the ordered array of indeces for arrays within the model for correct referencing
        //Needed for lists. Therefore, can refer to correct data item in model for changes based on event
        //So, list maintained by referencing what index of data the mappedDataId references, 
        //model id is to get the right model, then the node for data element in array inside it
        //Scope only to avoid running it if scope of data operation is model root
        getOrderedArrayIndices(scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views'], mappedDataId: string): ViewManagerOrderedArrayIndices;

        //Allows you to spawn a filteredData list.
        //TO BE IMPLEMENTED
        spawnFilteredData(filterFn: genericParamReturnFunction<GlobalScope extends "MODEL_ROOT" ? MODEL : ValueTypeOfNested<MODEL, GlobalScope>, GlobalScope extends "MODEL_ROOT" ? MODEL : ValueTypeOfNested<MODEL, GlobalScope>>): void;

        //Shifts view focus to unfiltered data. Goes back to last shown view in lists
        //TO BE IMPLEMENTED
        clearFilteredData(): void;
    }
    
    export interface StandardViewManagerConstructor<MODEL extends BASE_DATA_MODEL, GlobalScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']>{
    
        new(dataManager: DataManagerInstance<MODEL>, options: DataManagerViewManagerConstructorOptions<MODEL, GlobalScope>): StandardViewManagerInstance<MODEL, GlobalScope>
    }

    type DataManagerViewManagerConstructorOptions<MODEL, GlobalScope> = DataManagerBaseViewOptions & {

        scope: GlobalScope,
        id: string;
        listSize?: number,
        viewOptions: StandardRootViewRegistrationOptions,
        //Whether we have sth server-side to process. View manager doesn't load the data. It just attaches the views to its logic.
        //Good tip is to have this set by isViewInitialized() method in fragment
        serverSide?: boolean,
        lifecycleOptions: {

            instance: FragmentLifeCycleInstance,
            //Invoked to build notification message when activity complete
            //TO BE IMPLEMENTED - place outside view manager
            notificationCb: genericParamFunction<*>,
        },
        isChild?: IsChildInfo,
        //Whether it's a child, but a watcher
        //TO BE IMPLEMENTED
        isWatcherChild?: boolean,
        childOptions?: StandardViewManagerChildOptions,
        //TO BE IMPLEMENTED
        watcher?: boolean
    }

    type IsChildInfo = { 

        isChild: boolean 
    }

    type StandardViewManagerChildOptions = {

        //The index of the data in array held by parent. Useful for nested arrays
        /**
         * @deprecated
         * 
         * prefer mappedDataId - since index moves
         */
        parentDataIndex: number;
        parentMappedDataId: string, //mapped data id of the parent
        parentModelId: string;
        parentRootNode: Element,
        //TODO - UPDATE TO GETTER cause of moving index
        parentOrderedArrayIndices: QueueInstance<number>, //Can use this to simplify getting for child?
    }

    //TO BE IMPLEMENTED
    type ExternalWatchDataHooks<MODEL, BaseScope> = {

        root: {

            inflateRoot: (data: ValueTypeOfNested<MODEL, BaseScope>) => RootViewBuildData;
            onViewAttach: (modelID: string, data: ValueTypeOfNested<MODEL, BaseScope>, viewRootNode: HTMLElement) => void;
        } & {

            [s in BaseScope extends "MODEL_ROOT" ? NestedKeyOf<MODEL> : NestedChildKeyOf<MODEL, BaseScope>]: {

                onCommit: (mutation: DataManagerMutations, newData: ValueTypeOfNested<MODEL, BaseScope>, oldData: ValueTypeOfNested<MODEL, BaseScope>) => void;
            }
        }
    } 

    type StandardViewManagerChildInitArgs<MODEL, ChildScope> = {

        isChildInit: boolean,
        newChild: ListViewManagerConstructor<MODEL, ChildScope>,
        constructorOptions: DataManagerViewManagerConstructorOptions<MODEL, ChildScope>,
        hooks: ChildViewManagerHooks<MODEL, ChildScope>,
        nestedChildViewManagers: ChildViewManagerBuildOptions<MODEL, NestedChildKeysOfArray_ArrayOnly<MODEL, ChildScope>>[]
    }

    type RootViewDataHooks<MODEL, BaseScope> = { 

        root: {

            builder: {

                inflateRoot: (data: Partial<ValueTypeOfNested<MODEL, BaseScope>>) => RootViewBuildData;

                //Get your references here
                //YES....So can attach button click listeners and perform event-driven actions easily
                onViewAttach: (modelID: string, data: Partial<ValueTypeOfNested<MODEL, BaseScope>>, viewRootNode: Element, mappedDataId: string, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void;
                onViewDetach: (modelID: string, data: Partial<ValueTypeOfNested<MODEL, BaseScope>>, viewRootNode: Element, mappedDataId: string, completeCb: genericFunction) => void;
            }
            //These are called often before the root attaches, or after
            //Before, you'll get the call for "uploadNew" - here, a new model has been created and its data being 
            //committed to the network or not. Regardless, view manager is about to spawn a new rootview
            //This will happen after it calls onCommit once the network activity has been completed and data committed
            //to the data manager's master working model
            //So, for uploadNew mutation, view manager will first call onMutate, then onCommit, then infateRoot (if no bypass in standard view manager - lists cannot bypass this stage)
            //then onViewAttach
            //You can these calls to show and remove lazy loading ui's, responsive error messages, before a new rootview is created
            //Thus, pre-post root attach hooks
            //Same above works for loadNew - since creating new model, but this time from network
            prePostRootAttachHooks: {
                
                onMutate: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, parentRootNode: Element, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void;
                onCommit: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, parentRootNode: Element, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void, //Called when mutation has successfully completed
                onError: <S, B_A, D_G>(modelID: string, mutation: DataManagerMutations, data: Partial<ValueTypeOfNested<MODEL, BaseScope>>, failedData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, response: *, parentRootNode: Element, retryCB: DataPipelineConfirmCallbackInterfaceInstance<S, B_A, D_G>['retryCb'], extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void, //Called when mutation fails
                onCancel: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, parentRootNode: Element, response: DataManagerErrResponse, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void; //previously, res was *
            }
        }
    }

    //Can be extended and overriden to suit various view manager APIs
    type RootComponentViewHooks<MODEL, BaseScope> = {

        //Scoped hooks of model for view components in root
        [x in BaseScope extends "MODEL_ROOT" ? _ScopeModelRoot | NestedKeyOf<MODEL> : NestedChildKeyOf<MODEL, BaseScope>]?: {

            hooks: {

                onMutate?: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, value: Partial<ValueTypeOfNested<MODEL, x>>, viewRootNode: Element, mappedDataId: string, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void,
                onCommit?: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, value: Partial<ValueTypeOfNested<MODEL, x>>, viewRootNode: Element, mappedDataId: string, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void, //Called when mutation has successfully completed
                onError?: <S, B_A, D_G>(modelID: string, mutation: DataManagerMutations, data: Partial<ValueTypeOfNested<MODEL, BaseScope>>, failedData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, value: Partial<ValueTypeOfNested<MODEL, x>>, response: *, viewRootNode: Element, mappedDataId: string, retryCB: DataPipelineConfirmCallbackInterfaceInstance<S, B_A, D_G>, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void, //Called when mutation fails
                onCancel?: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, value: Partial<ValueTypeOfNested<MODEL, x>>, viewRootNode: Element, mappedDataId: string, res: DataManagerErrResponse, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void;
            };
        }
    }

    type ViewDataHooks<M, B_S> = {

        root: RootViewDataHooks<M, B_S>,
        components: RootComponentViewHooks<M, B_S>
    };

    type StandardRootViewRegistrationOptions = {
       
        //Need parent node and rootViewClass to polyfill server-side rendered data based on attributes
        //The id of the component views' (list) parent. To help target the views. This is their container
        parentNodeID: string,
        //The content view node id if we are reinflating rootViewNode for every new model
        reinflateContentViewNodeID?: string,
        //Helps standard reinflate the view when a new model is loaded or created, if you desire such behavior
        reinflateRootViewOnNewModel?: boolean,
    }

    type RootViewBuildData = {

        inflatedView: string,
    }

    type ViewManagerOrderedArrayIndices = QueueInstance<number>;

    type NewViewInfo = { viewNode: Element, mappedDataId: string };

    type ChildViewManagerBuildOptions<MODEL, ChildScope> = { 
        
        scope: ChildScope, 
        childViewManagerConstructor: ListViewManagerConstructor<MODEL, ChildScope>, 
        constructorOptions: ListDataManagerViewManagerConstructorOptions<MODEL, ChildScope>, 
        hooks: ChildViewManagerHooks<MODEL, ChildScope>,
        //Might have a scope narrowing issue. Sort it by a FromRoot model option (Array to allow several children per)?**
        nestedChildViewManagers: ChildViewManagerBuildOptions<MODEL, NestedChildKeysOfArray_ArrayOnly<MODEL, ChildScope>>[]
    }

    type ChildViewManagerHooks<M, C_S> = { 

        rootHooks: ListRootViewDataHooks<M, C_S>, 
        componentHooks: ListRootComponentViewHooks<M, C_S> 
    }

    type ViewManagerMutationCBExtras<M, S> = {

        tempMappedDataIdInfo: TempMappedDataIdsInfo,
        paginationInfo?: {

            [x in S extends NestedChildKeysOfArray_ArrayOnly<M, _ScopeModelRoot> ? S | NestedChildKeysOfArray_ArrayOnly<M, S> : NestedChildKeysOfArray_ArrayOnly<M, S>]?: {

                stopPagination: boolean
            }
        },
        isServerSideCreate?: boolean
    }

    type ServerSideAttachedViewInfo = NewViewInfo & { 
        
        modelId: string 
    }
}