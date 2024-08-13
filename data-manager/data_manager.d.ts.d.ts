// Type definitions for DataManager
// Project: Oats~i
// Definitions by: Ian Omondi <https://github.com/Ian-Cornelius>
// Definitions: null

declare module "DataManager" {

    interface ScopeComparatorInterfaceInstance<MODEL extends BASE_DATA_MODEL<MODEL>>{

        scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views'];

        ofViews(): StandardViewManagerInstance<MODEL, *>[];
    }

    interface ScopeComparatorInterfaceConstructor<MODEL extends BASE_DATA_MODEL<MODEL>>{

        new(scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views'], scopedOptions: ScopedViewOptions<M>): ScopeComparatorInterfaceInstance<MODEL>;
    }

    //Observer allows you to observe network changes and updates of a given scope you're interested in
    //Therefore, you can perform certain actions based on req starts, errors, and end. 
    //Data hidden thus not for view changes.
    //Good use is batch uploading or loading data. Can batch the calls by observing network activity
    //Anyone with access to the data manager can observe.
    //TO BE IMPLEMENTED
    interface NetworkInterfaceObserver<MODEL>{

        onReqStart?(reqAddr: string, mutation: DataManagerMutations, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;
        onReqErr?(reqAddr: string, mutation: DataManagerMutations, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;
        onReqEnd?(reqAddr: string, mutation: DataManagerMutations, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;
        onReqCancel?(reqAddr: string, mutation: DataManagerMutations, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;
    }

    interface DataOperationsNetworkInterface<SCOPED_MODEL, NetworkScope, FULL_MODEL>{

        //MANAGE NETWORK CALLS, POST-PROCESSING, AND ERRORS HERE.
        //OPTIONAL. CAN MOVE FORWARD WITHOUT
        //Target model will be null if request not originating from a model update
        //Can transform to needed data type for body and have scoped for better working with data manager
        getReqBody: (reqAddr: string, updatedModel: NetworkInterfacePermittedBulkType<SCOPED_MODEL, NetworkScope>, mutation: DataManagerMutations, completeOldModel?: Partial<FULL_MODEL>) => Promise<DataManagerReqOptions>;
        //After this is called, view hooks triggered next based on changed model
        //Before we commit the data
        onDataLoadPostProcess: (reqAddr: string, response: *, newData: NetworkInterfacePermittedBulkType<SCOPED_MODEL, NetworkScope>, oldData: NetworkInterfacePermittedBulkType<SCOPED_MODEL, NetworkScope>, mutation: DataManagerMutations, mappedDataId: string, extra: { reqMethod: "GET" | "POST"}) => Promise<DataLoadResponse<NetworkInterfacePermittedBulkType<SCOPED_MODEL, NetworkScope>, NetworkScope, FULL_MODEL>>; //Post processes loaded data. If using API that's not your own, can update pagination params to supported ones to enable function
        //In case of an error
        onDataLoadError: (reqAddr: string, response: DataManagerErrResponse, newData: NetworkInterfacePermittedBulkType<SCOPED_MODEL, NetworkScope>, oldData: NetworkInterfacePermittedBulkType<SCOPED_MODEL, NetworkScope>, mutation: DataManagerMutations) => DataLoadResponse<NetworkInterfacePermittedBulkType<SCOPED_MODEL, NetworkScope>, NetworkScope, FULL_MODEL>; 
    }

    type NetworkInterfacePermittedBulkType<M, S> = S extends _ScopeModelRoot ? Partial<M> | Partial<M>[] : Partial<M>;
    type DataManagerErrResponse = { res: *, status: number };

    interface DataManagerInstance<MODEL extends BASE_DATA_MODEL<MODEL>>{

        //Members
        masterWorkingModel: DataManagerWorkingModel<MODEL>;
        id: string;
        maintainNetworkOnFlushAll_Global: boolean;
        maintainNetworkOnFlushAll_Specific: DontAbortSpecificNetworkOptions//TF is the type?
        dataRecordsStamp: string

        //VERY IMPORTANT
        //Called to indefinitely suspend data manager and all operations
        //Do this if you suspect code is buggy, and is incorrectly mutating data you're going to commit to the database
        //So, have YOUR SOURCE OF TRUTH, a reference model to match to what data manager has for mutation before committing
        //If fails, suspend. Need to watch for this with lists and recycle views
        //To be safe, always have a recycle bin for recovery. Until sure to delete completely
        //TO BE IMPLEMENTED. Why? Working well so far. But a good switch
        suspendManager(): void;

        //Called internally to initialize data manager with server-side data (hydration)
        initDataManagerServerSide(): Promise<void>;

        //Update the data address 
        //Address for uploading data
        //Use for uploading new data
        setDataUploadAPI(dataSendAPI: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;
        //Address for loading/downloading data
        setDataLoadAPI(dataLoadAPI: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;
        //Address for updating data
        setDataUpdateAPI(dataUpdateAPI: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;
        //Address for deleting data
        setDataDeleteAPI(dataDeleteAPI: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;
        
        //***also, add removeViewManager - id. Removes a view manager with a given id (across all scopes its registered to)
        //***calls its onCommit with delete_FlushAll event. Then removes it.
        //***in view manager, can have it as removeChildViewManager. Thought of it in say, triggering that selection panel
        //***in youtube after video ends. onEnd, set or delete. Autopopulates based on scope (already server-decided)
        /**
         * @todo Good idea above
         */

        //Use this to upload new data after performing necessary error and security checks
        //IMPORTANT: UPDATE SPEC TO loadData. Read comments in implementation (at top)
        //Creates an entirely new model. Otherwise, update
        //Note, this data is not in model
        //Returns a promise with new model given as response from network call, which you might have post-processed
        //If root view is given, it will trigger view hooks to build the UI unless overriden
        //Spawn partial must be scope aware and based on scope
        uploadNewData<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], Ov_ReqScope extends NestedParentKeysOf<MODEL, ReqScope>>(newData: ValueTypeOfNested<MODEL, ReqScope>, options: SendDataOptions, scope: ReqScope, mappedDataId: string, overrideNetworkInterface?: DataOperationsNetworkInterface<ValueTypeOfNested<MODEL, ReqScope>, ReqScope, MODEL>, overrideUploadAddr?: string, overrideNetworkInterfaceScope?: Ov_ReqScope): Promise<DataOperationMsg<ValueTypeOfNested<MODEL, ReqScope>, MODEL, Ov_ReqScope>>;
        //upload data you were working on in model (uncommitted though)
        //Use same pipeline as upload new, start from different DFA
        //Remember, you created this data locally, then want to push it to the server
        //Different semantically from update where we're updating what was sourced from server-side i.e load or existing
        //Can use this for updates if you want, won't break anything. But just know the mutation is "upload" for your hooks
        uploadDataInModel<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], Ov_ReqScope extends NestedParentKeysOf<MODEL, ReqScope>>(modelID: string, options: SendDataOptions, scope: ReqScope, newData: Partial<ValueTypeOfNested<MODEL, ReqScope>>, mappedDataId: string, overrideNetworkInterface?: DataOperationsNetworkInterface<ValueTypeOfNested<MODEL, ReqScope>, ReqScope, MODEL>, overrideUploadAddr?: string, overrideNetworkInterfaceScope?: Ov_ReqScope): Promise<DataOperationMsg<ValueTypeOfNested<MODEL, ReqScope>, MODEL, Ov_ReqScope>>;
        //Call if you want to manually load data.
        //Must have view hooks? YES. 
        //If you post process as an array, will create bulk models
        //Also, if you pass a scope that is not MODEL_ROOT, you must provide a modelID, mappedDataId (null accepted),
        //To ensure data can be targeted
        //Providing override address to avoid race condition with address changes. Better approach
        loadData<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(scope: ReqScope, scopedInfo: ReqScope extends _ScopeModelRoot ? null : { modelID: string, mappedDataId?: string }, options: SendDataOptions, overrideNetworkInterface?: DataOperationsNetworkInterface<ValueTypeOfNested<MODEL, ReqScope>, ReqScope, MODEL>, overrideLoadNewAddr?: string): Promise<DataOperationMsg<DataManagerPermittedBulkType<MODEL, ReqScope>, MODEL, null>>;

        //For deleting data. With "silent" prefix, no network activity
        //Not allowing overriding UI hooks cause user MUST be informed on the view about the delete
        //So, creating good UX practices
        //Return a promise with the deleted model(s)
        //Data deleted in scope thus, of that key
        //Delete takes scope to allow scoped deletions
        //Model root kills everything i.e destroys whole model
        //Added new data to allow contextually deleting data but in network just doing a different action
        //i.e allowing for that bridge between data manager mutations and actual network mutations (context differences)
        //However, once done, the data will be removed
        deleteData<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], Ov_ReqScope extends NestedParentKeysOf<MODEL, ReqScope>>(scope: ReqScope, modelID: string, mappedDataId?: string, options: SendDataOptions, overrideNetworkInterface?: DataOperationsNetworkInterface<ValueTypeOfNested<MODEL, ReqScope>, ReqScope, MODEL>, overrideDeleteAddr?: string, overrideNetworkInterfaceScope?: Ov_ReqScope, newData?: Partial<ValueTypeOfNested<MODEL, ReqScope>>): Promise<DataOperationMsg<ValueTypeOfNested<MODEL, ReqScope>, MODEL, Ov_ReqScope>>;
        //To work this well, run in sequence? Have smart delete. Then can run all at once, if say have one api support it, but want to tell how many affected with success
        deleteBulkData(modelIDs: Set<string>, overrideNetworkInterface?: DataOperationsNetworkInterface<MODEL, _ScopeModelRoot, MODEL>): Promise<DataOperationMsg<MODEL, MODEL, null>>;
        //Silent deletes - no network activity
        silentDeleteData<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(scope: ReqScope, modelID: string, mappedDataId?: string, options: Pick<SendDataOptions, "skipViewHooks">): Promise<DataOperationMsg<ValueTypeOfNested<MODEL, ReqScope>, MODEL, null>>;
        silentDeleteBulkData(modelIDs: Set<string>): Promise<DataOperationMsg<MODEL, MODEL, null>>;

        //Allows you to update a model. However, will **NOT be followed by network activity. Just local - nope. works different. Need to merge
        /**
         * 
         * @todo Merge this and update (now preferring update)
         */
        //FOR NETWORK, Use uploadDataInModel
        //Can override getting UI hooks triggered if need be. By default, not doing so
        //Returns the new model. Can wait for the update
        //if new data null, no changes to model, but network activity can be made if purgeOverride true
        //FIND A WAY TO INFER VALUES OF A GIVEN OBJECT IN TYPES. So, infer provided api scopes
        //Needed to add mutation start callback to know when its started and coordinate other things such as flushing data after triggering a network-only call
        //Can be used in complex use cases to know if a data op has actually started in pipeline, and allow flush all to cleverly poll, delete, and provide references
        //YEAH
        updateModel<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], Ov_ReqScope extends NestedParentKeysOf<MODEL, ReqScope>>(scope: ReqScope, modelID: string, newData: ValueTypeOfNested<MODEL, ReqScope>, mappedDataId?: string, options: SendDataOptions, overrideNetworkInterface?: DataOperationsNetworkInterface<ValueTypeOfNested<MODEL, ReqScope>, ReqScope, MODEL>, overrideUpdateAddr?: string, overrideNetworkInterfaceScope?: Ov_ReqScope, mutationStartCb?: genericFunction): Promise<DataOperationMsg<ValueTypeOfNested<MODEL, ReqScope>, MODEL, Ov_ReqScope>>;
        //Practically useless with how the one above works?
        //Or just have it as the default one since we understand what silent means
        //Need to merge update with uploadInModel. Thinking of uploadToModel and silentUploadToModel
        silentUpdateModel<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']>(scope: ReqScope, modelID: string, newData: ValueTypeOfNested<MODEL, ReqScope>, updateUI?: boolean, mappedDataId?: string): Promise<DataOperationMsg<ValueTypeOfNested<MODEL, ReqScope>, MODEL, null>>;

        //Completely clear the data
        //To delete on network, just call delete method, skip hooks, then flushAllData
        flushAllData(options?: { cancelAllPendingOperations: boolean }): Array<MODEL>;
        flushScopedData(modelId: string, scope: NestedKeyOf<MODEL>, mappedDataId?: string): boolean;

        //USING model ID helps avoid direct and maybe, unintended data corruption.
        //SO, ALL DATA PASSED AROUND AS COPIES UNTIL DATA MANAGER COMMITS WHAT IS FINAL

        //Creates a model and returns the model ID which you can use for subsequent. NO UI HOOKS
        //However, DOES NOT COMMIT
        createModel(newModel: Partial<MODEL>, options: Pick<SendDataOptions, "skipViewHooks">): string;
        //Creates models but in bulk.
        bulkCreateModels(newModels: Array<Partial<MODEL>>, options: Pick<SendDataOptions, "skipViewHooks">): Array<string>;
        //Creates and commits a model
        createAndCommitModel(newModel: Partial<MODEL>, options: Pick<SendDataOptions, "skipViewHooks">): string;
        //Get the model held in that model ID. Always passed as copies.
        getModel(modelID: string): Partial<MODEL>;
        //Returns the model at a given scope
        getScopedModel<RefScope extends NestedKeyOf<MODEL>>(scope: RefScope, mappedDataId: string, modelID: string, stopAtNodeForRef: boolean): ValueTypeOfNested<MODEL, RefScope>;
        //Returns the model at a given scope, with a given ref
        //The ref model is scoped, at a dataspacescope, that extends the nested keys of original model
        //Then, the req scope is a nested relative child key of the data space scope
        //returning the value of type in ref model to req scope
        getScopedModelFromRef<RefModel extends ValueTypeOfNested<MODEL, DataSpaceScope>, DataSpaceScope extends NestedKeyOf<MODEL>, ReqScope extends NestedRelativeChildKeyOf<MODEL, DataSpaceScope>>(scope: ReqScope, orderedArrayIndices: ViewManagerOrderedArrayIndices, model: RefModel, stopAtNodeForRef: boolean): ValueTypeOfNested<RefModel, ReqScope>;
        //If it returns undefined, this property doesn't exist in target model
        //unused. 
        reduceModelToProperties<T extends object>(baseModel: T, targetModel: T): T;

        getNewDataScopedToRequest<ReqScope extends keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis'], OverrideScope extends NestedParentKeysOf<M, ReqScope>>(targetScope: OverrideScope, currentScope: ReqScope, newData: ValueTypeOfNested<M, ReqScope>, mappedDataId: string): ValueTypeOfNested<M, ReqScope> | ValueTypeOfNested<M, OverrideScope>;

        //Spawns a shell partial shell model for the scope
        //Help avoid "undefined" errors by spawning for required scope, which you can spread to your empty object
        spawnPartialShellModel<ReqScope extends NestedKeyOf<MODEL>>(scope: ReqScope, value?: Partial<ValueTypeOfNested<MODEL, ReqScope>>, referenceModel: Partial<PartialTypeOfNested<MODEL, ReqScope>>, mappedDataId?: string): void;


        //To set the view manager instance
        //Use view manager's getLifeCycleInstance() to get the instance of the lifecycle object to set and delete it
        setViewManager<ExScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']>(scope: ExScope, viewManager: import("StandardViewManager").StandardViewManagerInstance<MODEL, ExScope>, initArgs: import("StandardViewManager").StandardViewManagerChildInitArgs<MODEL, ExScope>): void; //USE LIFECYCLE TO AUTO REMOVE LATER
        
        //To get the view manager instance
        getViewManager(scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views'], id: string): import("StandardViewManager").StandardViewManagerInstance<MODEL, *>;

        //used by recycle view manager to build
        //on scroll movement and bypass new or load calls if not pagination or within focus
        getModelsInRange(startIndex: number, endIndex: number): Array<MODEL>;
        //Get the model at a given index
        getModelInIndex(index: number): Partial<MODEL>;
        //Not using model since array not a set
        getModelId(index: number): string;
        //Check if you have data
        hasData(): boolean;
        //Get the length of the data or models stored
        dataLength(): number;

        //Commits mutation to a model. So, temp copied to committed. bulk does in bulk. However, temp is NOT set to null
        commitModel(modelID: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], orderedArrayIndices: ViewManagerOrderedArrayIndices): void;
        commitBulkModels(options: CommitBulkModelOptions<MODEL>[]): void;

        //Overwrite existing model. MUST COMMIT ONCE DONE
        overwriteModel<DataScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(modelID: string, data: Partial<ValueTypeOfNested<MODEL, DataScope>>, scope: DataScope): void;

        mergeScopedDataToModel<DataScope extends NestedKeyOf<MODEL>>(model: MODEL, scope: DataScope, value: Partial<ValueTypeOfNested<MODEL, DataScope>>, orderedArrayIndices: ViewManagerOrderedArrayIndices): MODEL;

        //Flushes temp in model to null. Must have a value set as committed else fail
        //Needed so UI updates can be called based on comparator
        flushModelTemp(modelID: string,  scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): void;

        //Determine whether data can be operated on. 
        //Updates status if can do, returns new status and continue from here
        //Doing so so that we avoid race condition if changes not made here
        //Otherwise, return operable in status as false
        preProcessDataOperation<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(recordsStamp: string, modelID: string, mutation: DataManagerMutations, scope: ReqScope, newData: ValueTypeOfNested<MODEL, ReqScope>, skipUI: boolean, mappedDataId: string): Promise<DataOperationsStatus<MODEL>>;
        //cleans up after data operation
        onPostDataOperation(recordsStamp: string, modelID: string, scope: keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis'], mappedDataId: string): void;

        //Sets everything scoped API at once except observers. Individual scoped calls left just to make sure you can update later.
        setScopedAPIOptions<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(scope: ReqScope, scopedAPIOptions: Pick<ScopedAPIOptions<MODEL>, ReqScope>): void;
        //Set the interface for observing scoped network operations. Ensure you're matching the available scopes
        setScopedAPIDataOpInterfaceObserver(scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], networkInterfaceObserver: NetworkInterfaceObserver<MODEL>, lifecycleInstance: FragmentLifeCycleInstance): void;

        setDataWatcher<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']>(scope: ReqScope, viewManager: StandardViewManagerInstance<MODEL, ReqScope>): void;

        /**
         * @todo
         */
        //sets a notifications channel for a given scope. Invoked only if no view manager to handle views
        //View manager must change policy on init to !byPass to avoid notifs being sent.
        //Kinda redundant though if you think about it. Data Manager's pipeline automatically decides.
        setNotificationChannel(scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], notificationInterface: AnonymousNotificationInterface_BuildsViewAndCallbacksToSayRequestRouteOrJustClose): void;
        setNotificationPolicy(scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], byPass: boolean): void;

        comparator(scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']): ScopeComparatorInterfaceInstance<MODEL>;
    }

    export interface DataManagerConstructor<MODEL extends BASE_DATA_MODEL<MODEL>>{

        new<E>(args: DataManagerConstructorArgs<MODEL, E>): DataManagerInstance<MODEL>;

        get _HYDRATOR_SCRIPT_ID(): "data-manager-hydrator";
        get _SERVER_SIDE_PASSED(): "SERVER_SIDE_PASSED";
        get _SCOPED_ARRAY_LITERAL(): _NestedScopedArrayLiteral;
        get _ARRAY_SELF_TYPE(): _NestedArraySelfType;
        get _NESTED_SCOPE_KEY_SPLITTER(): _NestedScopeKeySplitter;
        get _MODEL_ROOT_SCOPE(): _ScopeModelRoot;
        get _CANCELLED_DATA_OP(): "Cancelled"
    }

    type BASE_DATA_MODEL<TestModel> = TestModel extends (infer U)[] ? U extends object ? "Model should be an object" : {} : {};

    //Constructor can get defaultData? Yes. Makes sense. Or, have overrideData() call to load base data
    type DataManagerConstructorArgs<MODEL, E> = {

        primaryLifeCycleObject: FragmentLifeCycleInstance,
        masterAPIOptions: DataManagerAPIOptions<MODEL>,
        //THINKING OF HAVING SCOPE OR MUTATION SCPECIFIC OVERRIDE BEHAVIOR. 
        dataOperationsOverrideBehavior?: DataOperationsOverride,
        id?: string;
        //Add mutation specific cancel behavior in constructor. YES.
        flushAllNetworkPolicy?: {

            dontAbortGlobal?: boolean,
            dontAbortMutationSpecific?: Omit<DontAbortSpecificNetworkOptions, "loadNew">
        };
        //NEW SERVER-SIDE OPTIONS
        serverSide?: {

            hydrateFromServerSide: boolean,
            //Used to read the straight raw data first.
            dataKey: string,
            overrideScriptId?: string,
            canHydrateData: (info: Partial<MODEL>[]) => boolean,
            preProcessHydrationInfo?: <T>(info: Partial<T>[]) => Partial<MODEL>[],
            onHydrateComplete: (info: Partial<MODEL>[], extras: E) => void,
            networkOptions: {

                runNetworkStep: boolean,
                overrideNetworkInterface?: DataOperationsNetworkInterface<MODEL, "MODEL_ROOT", MODEL>
            },
            deleteScriptOnComplete?: boolean
        }
    }

    type DontAbortSpecificNetworkOptions = {

        [x in keyof APICRUDOps]?: boolean
    }

    type DataManagerAPIOptions<MODEL> = {

        reqUtils: LifeCycleRemoteRequestUtils
    }

    type DataManagerHydrationInfo = {

        [x: string]: {

            info: JSON | *,
            extras: JSON | *
        }
    }

    /**
     * @deprecated
     */
    type ServerSideBuildOptions<M> = {
                
        targetView: {

            parentID?: string, //Just to help with targeting. not necessary
            rootViewClass?: string, //Class of the views with the server-side attributes. What we'll loop over when loading
        },
        scope: NestedKeyOf<M>,
        viewManagerOptions: DataManagerBaseViewOptions,
        paginationEnabled: boolean,
        buildCbs: {

            onServerSideLoad: onServerSideLoadCb<M> //Called to populate the actual data based on given attributes in rootNode. Extract attributes from it,
        }
    }

    type onServerSideLoadCb<M> = (rootNode: Element, reqUtils: LifeCycleRemoteRequestUtils, modelsArray: Array<M>) => Promise<Array<MODEL>>; //Use the passed reqUtils cause its lifecycle managed.

    type DataManagerBaseViewOptions = {

        //either option makes the otehr redundant. Lol. Fix this
        viewAppendOrder?: "stack" | "list", //Same to appendedToTop: boolean If stack, data manager assumes new data has the view appended to top
        createItemPos?: "top" | "bottom"
    }

    /**
     * @deprecated
     */
    type SERVER_SIDE_DATA_ATTRIBUTES = {

        pagination: {

            attrPaginationEnd: string,
            attrNextPageMarker: string,
        },
        loadImmediatelyOverride: {

            attrLoadMoreImmediatelyAfterServerSide: string,
        },
        values: {

            true: string,
            false: string
        }
    };

    type SendDataOptions = {

        //Skip all view hooks or not
        skipViewHooks?: boolean,
        autoCancelOnError?: boolean //default false, but inverted to true by pipeline unless explicitly provided
    }

    type CommitBulkModelOptions<MODEL> = { 
        modelID: string, 
        scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'],
        orderedArrayIndices: QueueInstance<number>
    }

    type DataManagerPermittedBulkType<M, S> = S extends _ScopeModelRoot ? Partial<ValueTypeOfNested<M, S>> | Partial<ValueTypeOfNested<M, S>>[] : Partial<ValueTypeOfNested<M,S>>
    type DataManagerPermittedBulkModelIDs<S> = S extends _ScopeModelRoot ? string | string[] : string

    type DataLoadResponse<P_M, ReqScope, F_M> = {

        data?: P_M,
        response?: *,
        extras?: {
            
            paginationInfo: ViewManagerMutationCBExtras<F_M, ReqScope>['paginationInfo']
        }
    }


    /**
     * IMPORTANT
     * 
     * Operated as an array in implementation
     * The big boy
     */
    type DataManagerMasterModel<MODEL> = {

        modelID: string,
        data: {

            temp: {

                //Omitting targetRef to avoid cyclic point to self
                master: Omit<DataManagerMutationsState<Partial<MODEL>>, "targetRef">,
                //Partials of data above
                scoped: {

                    [s in keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']]?: DataManagerMutationsState<ValueTypeOfNested<MODEL, s>>
                }
            },
            committed: MODEL,
        }
    }

    type DataManagerReqOptions = Omit<RequestOptions, 'reqAddress'> & Partial<Pick<RequestOptions, "reqAddress">>

    type DataManagerMutationsState<M> = {

        //This is the reference to the target model being changed. Can be array or object. 
        //Allow, by reference, to directly change value without reconstruction, which is expensive.
        /**
         * @todo check if algo above used or is working directly with commmitted (working directly with currently committed)
         */
        targetRef: M, 
        data: M,
        mutation: DataManagerMutations,
        state: MutationStates,
        uiSkipped: boolean,
    }

    type MutationStates = "onMutate" | "onCommit" | "onError" | "onCancel" | "complete"

    // loadNew, uploadNew, and create represent mutations that add to the model or scope of the model
    // create, however, goes direct to commit because of how it works
    // for the rest, model or data in model scope ALREADY exists
    type DataManagerMutations = "loadNew" | "update" | "delete" | "delete_FlushAll" | "upload" | "uploadNew" | "create";

    type DataManagerWorkingModel<MODEL> = {

        masterModels: Array<DataManagerMasterModel<MODEL>>,
        scopedOptions: {

            apis: ScopedAPIOptions<MODEL>,
            views: ScopedViewOptions<MODEL>
        },
        //FOR THE WATCHERS
        //NEW APPROACH FOR WATCHERS
        /**
         * Have external view manager attach itself as a watcher. Better. Lifecyle managed
         * States the scope, and gets notifs on changes. However, cannot make changes to the data as that's 
         * controlled separately. So, just reactive to its changes.
         * 
         * Set in view manager by calling setExternalWatchDataManager(dataManager, hooks)
         * Can watch in several data managers
         * 
         * actually, put in constructor as externalWatchOptions
         * ORRR, just complicated. To a view manager, set its data manager. Determine that
         * But, that means it would be in full cycle of changes
         * Want to have this for commits only. Watchers are for COMMITS only
         * Makes more sense that way. Can 
         * 
         * So, now specify data manager, and watchingOnly flag, default false, to determine attachment behavior
         * THESE CALLED AT THE END OF THE PIPELINE. Have only onWatchCommit(). So, change constructor args
         * 
         * Can pass option in constructor to, to allow setting up for child view managers (say a drop down to categories, maintained and changed in real time separately)
         * Or auth status. List obtained in real time too
         * 
         * IMPORTANT - LIFECYCLE DEPENDENT PIPELINE? WITH LIFECYCLE DESTROY PROTOCOL (MAINTAIN PIPELINE OR KILL)
         * Okay, can do this externally by cancelling calls. But quite a job. Just hook to listeners
         */
        dataWatchers: {

            [x in keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['views']]?: ScopedViewManager<MODEL>
        }
    }

    type ScopedAPIOptions<MODEL> = {

        MODEL_ROOT?: DataManagerScopedAPIOptions<MODEL, _ScopeModelRoot, MODEL> 
    } & {

        [s in NestedKeyOf<MODEL> | NestedKeyOf_InclArr<MODEL>]?: DataManagerScopedAPIOptions<ValueTypeOfNested<MODEL, s>, s, MODEL>
    }

    type APICRUDOps = {

        //upload mutation (Used for uploadNew as well. uploadNew just semantically states that data manager creates a new model before triggering upload)
        upload?: string, 
        //new mutation
        loadNew?: string,
        //update mutation
        update?: string,
        //delete mutation
        delete?: string,
    }

    type DataManagerScopedAPIOptions<SCOPED_MODEL, SCOPE, FULL_MODEL> = APICRUDOps & {

        networkInterface: DataOperationsNetworkInterface<SCOPED_MODEL, SCOPE, FULL_MODEL> //apiInterface: DataManagerAPIInterface<MODEL>,
        observers?: Array<NetworkInterfaceObserver<SCOPED_MODEL>>
    }

    type ScopedViewOptions<M> = {

        MODEL_ROOT?: ScopedViewManager<M> 
    } & {

        [s in NestedKeyOf<M>]?: ScopedViewManager<M>
    }

    type ScopedViewManager<M> = {

        //Changed to array to allow multiple view managers per scope for more complex UIs
        viewManagers?: Array<StandardViewManagerInstance<M, *>>
    }

    type DataOperationsInfo<MODEL> = { 
        
        modelID: string, 
        operations: OperationInfo<MODEL>[];
    }

    type OperationInfo<MODEL> = {
            
        mutation: DataManagerMutations,
        scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']
    }

    type DataOperationsStatus<MODEL> = { 
        
        operable: boolean, 
        info: DataOperationsInfo<MODEL>,
        previousMutation: DataManagerMutations
        msg: string
    }

    type DataOperationMsg<M, O_M, O_S> = {

        requestedMutation: DataManagerMutations,
        previousMutation: DataManagerMutations,
        status: "invoked" | "denied",
        msg: string,
        committedModel?: M,
        overrideScopeCommitModel?: ValueTypeOfNested<O_M, O_S>,
        modelId?: string,
        mappedDataId?: string
    }

    type DataOperationsOverride = "wait" | "cancel"

    type DataOperationMessages = "Mutation invoked" 
                | "Mutation invoked. Previous mutation cancelled" 
                | "Mutation denied. Waiting for ongoing mutation on this model to complete"

    type runDataMutation<MODEL> = <ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], Ov_ReqScope extends NestedParentKeysOf<MODEL, ReqScope>>(mutation: DataManagerMutations, scope: ReqScope, modelID: string, newData: ValueTypeOfNested<MODEL, ReqScope>, options: SendDataOptions, mappedDataId: string, mutationRunner: mutationRunnerFunc<MODEL, ReqScope, Ov_ReqScope>) => Promise<DataOperationMsg<ValueTypeOfNested<MODEL, ReqScope>, MODEL, Ov_ReqScope>>;

    type mutationRunnerFunc<MODEL, ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], Ov_ReqScope extends NestedParentKeysOf<MODEL, ReqScope>> = (operationStatus: DataOperationsStatus<MODEL>, runNonNetworkCancel: boolean, comparator: ScopeComparatorInterfaceInstance<MODEL>) => Promise<DataOperationMsg<ValueTypeOfNested<MODEL, ReqScope>, MODEL, Ov_ReqScope>>;
}
