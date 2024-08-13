
declare module "ListViewManager" {
    
    import { DataManagerViewManagerConstructorOptions, RootViewBuildData } from "StandardViewManager";
    interface ListViewManagerInstance<MODEL extends BASE_DATA_MODEL, GlobalScope extends ArrayOnlyNestedKeys<MODEL>> extends StandardViewManagerInstance<MODEL, GlobalScope>{

        /**
         * Value scope MUST be an array or model root
         * 
         * Hooks get the self type value. So, when making hooks, refer to selfType
         */
        rootViewOptions: ListRootViewRegistrationOptions;
        //Used ONCE to get if we have an existing models list. Cleared first 
        //so, on init, we just autopopulate and continue through onViewReady call
        existingModelsList: ValueTypeOfNested<MODEL, GlobalScope>;
        filteredInternalModelsList: ValueTypeOfNested<MODEL, GlobalScope>[];
        rootViewDataHooks: ListRootViewDataHooks<MODEL, GlobalScope>;
        componentViewDataHooks: ListRootComponentViewHooks<MODEL, GlobalScope>;

        registerViewDataHooks(rootHooks: ListRootViewDataHooks<MODEL, GlobalScope>, componentHooks: ListRootComponentViewHooks<MODEL, GlobalScope>): boolean;
        getViewNodeAtDataPos(index: number): Element;
        dataLength(): number;

        setUpPaginator(options: BaseListDataPaginatorOptions<MODEL, GlobalScope>): boolean;
        getListDataPaginator(): ListDataPaginatorInstance<MODEL, GlobalScope>;
        getIntersectionObserverViewPort(): Element;
    }

    export interface ListViewManagerConstructor<MODEL extends BASE_DATA_MODEL, GlobalScope extends ArrayOnlyNestedKeys<MODEL>> implements StandardViewManagerConstructor<MODEL, GlobalScope>{

        new(dataManager: DataManagerInstance<MODEL>, options: ListDataManagerViewManagerConstructorOptions<MODEL, GlobalScope>): ListViewManagerInstance<MODEL, GlobalScope>
    }

    type ListDataManagerViewManagerConstructorOptions<MODEL, ArrayOnlyScope extends ArrayOnlyNestedKeys<MODEL>> = DataManagerViewManagerConstructorOptions<MODEL, ArrayOnlyScope> & {

        scope: ArrayOnlyScope,
        pagination?: BaseListDataPaginatorOptions<MODEL, ArrayOnlyScope>, //This used by view managers. So fix there
        viewOptions: ListRootViewRegistrationOptions,
        continuePaginationForExisting?: (existingModels: ValueTypeOfNested<MODEL, ArrayOnlyScope>, modelId_s: string | string[]) => boolean
    };

    type ListRootViewRegistrationOptions = {

        //Need parent node and rootViewClass to polyfill server-side rendered data based on attributes
        parentNodeID: string, //The id of the component views' (list) parent. To help target the views. This is their container
        parentNodeClass_AsChild?: string, //the class of the component views's parent. Same as parentNodeID, except used to get it as a child, considering list view manager can be a child to its own (so multiple parent node instances) 
        componentViewClass: string, //The class name of the root view (list item[s]). Each "module" in the view. This is what we inflate. They also contain server-side attributes. What we'll loop over when loading from server side
    }

    type ListRootViewDataHooks<MODEL, BaseScope> = { 

        //Scoped hook for root
        root: {

            builder: {

                inflateRoot: (data: Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>) => RootViewBuildData;

                //Get your references here
                //So can attach button click listeners and perform event-driven actions easily
                onViewAttach: (modelID: string, data: Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, viewRootNode: Element, mappedDataId: string, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void;
                onViewDetach: (modelID: string, data: Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, viewRootNode: Element, mappedDataId: string, completeCb: genericFunction) => void;
            }
            //These are called often before the root attaches and after, for the parent view node scope (canvas)
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
                
                
                //Showing data as array or self type of array. WHERE, WHY, HOW?
                //Self type targets using orderedIndices.
                //Add selfType to front when comparing scopes.
                //Used to set scopedAPIOptions. But NOT view options
                //However, self types cannot work with bulk i.e array, because its broken down
                //For simplicity, don't allow this. Push a single item to that array if only working with one
                onMutate: (modelID: DataManagerPermittedBulkModelIDs<BaseScope>, mutation: DataManagerMutations, newData: BaseScope extends _ScopeModelRoot ? Partial<MODEL> | Partial<MODEL>[] : Partial<ValueTypeOfNested<MODEL, BaseScope>> | Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, oldData: BaseScope extends _ScopeModelRoot ? Partial<MODEL> | Partial<MODEL>[] : Partial<ValueTypeOfNested<MODEL, BaseScope>> | Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, viewRootNode: Element, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void;
                onCommit: (modelID: DataManagerPermittedBulkModelIDs<BaseScope>, mutation: DataManagerMutations, newData: BaseScope extends _ScopeModelRoot ? Partial<MODEL> | Partial<MODEL>[] : Partial<ValueTypeOfNested<MODEL, BaseScope>> | Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, oldData: BaseScope extends _ScopeModelRoot ? Partial<MODEL> | Partial<MODEL>[] : Partial<ValueTypeOfNested<MODEL, BaseScope>> | Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, viewRootNode: Element, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void, //Called when mutation has successfully completed
                onError: <S, B_A, D_G>(modelID: DataManagerPermittedBulkModelIDs<BaseScope>, mutation: DataManagerMutations, data: BaseScope extends _ScopeModelRoot ? Partial<MODEL> | Partial<MODEL>[] : Partial<ValueTypeOfNested<MODEL, BaseScope>> | Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, failedData: BaseScope extends _ScopeModelRoot ? Partial<MODEL> | Partial<MODEL>[] : Partial<ValueTypeOfNested<MODEL, BaseScope>> | Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, response: *, viewRootNode: Element, retryCB: DataPipelineConfirmCallbackInterfaceInstance<S, B_A, D_G>['retryCb'], extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void, //Called when mutation fails
                onCancel: (modelID: DataManagerPermittedBulkModelIDs<BaseScope>, mutation: DataManagerMutations, newData: BaseScope extends _ScopeModelRoot ? Partial<MODEL> | Partial<MODEL>[] : Partial<ValueTypeOfNested<MODEL, BaseScope>> | Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, oldData: BaseScope extends _ScopeModelRoot ? Partial<MODEL> | Partial<MODEL>[] : Partial<ValueTypeOfNested<MODEL, BaseScope>> | Partial<ValueTypeOfArrayOnly<MODEL, BaseScope>>, viewRootNode: Element, response: DataManagerErrResponse, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void;
            }

            //Scope. View Manager scoped to a hook as well. Allow different view types to scope themselves to a model with a manager for the view
        }
    }

    type ListRootComponentViewHooks<MODEL, BaseScope> = {

        //Scoped hooks of model for view components in root
        [x in BaseScope extends "MODEL_ROOT" ? _ScopeModelRoot | NestedKeyOf<MODEL> : NestedChildKeyOfArray<MODEL, BaseScope>]?: {

            hooks: {

                onMutate?: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, value: Partial<ValueTypeOfNested<MODEL, x>>, viewRootNode: Element, mappedDataId: string, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void,
                onCommit?: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, value: Partial<ValueTypeOfNested<MODEL, x>>, viewRootNode: Element, mappedDataId: string, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void, //Called when mutation has successfully completed
                onError?: <S, B_A, D_G>(modelID: string, mutation: DataManagerMutations, data: Partial<ValueTypeOfNested<MODEL, BaseScope>>, failedData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, value: Partial<ValueTypeOfNested<MODEL, x>>, response: *, viewRootNode: Element, mappedDataId: string, retryCB: DataPipelineConfirmCallbackInterfaceInstance<S, B_A, D_G>['retryCb'], extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void, //Called when mutation fails
                onCancel?: (modelID: string, mutation: DataManagerMutations, newData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, oldData: Partial<ValueTypeOfNested<MODEL, BaseScope>>, value: Partial<ValueTypeOfNested<MODEL, x>>, viewRootNode: Element, mappedDataId: string, res: DataManagerErrResponse, extraArgs: ViewManagerExtraHookArgs<MODEL, BaseScope>) => void;
            };
        }
    }

    type ListDataManagerPermittedBulkType<M, S> = S extends _ScopeModelRoot ? Partial<ValueTypeOfArrayOnly<M, S>> | Partial<ValueTypeOfArrayOnly<M, S>>[] : Partial<ValueTypeOfArrayOnly<M,S>>

    type ViewManagerExtraHookArgs<M, B_S> = {

        viewManagerRef: ListViewManagerInstance<M, B_S>,
        parentMappedDataId: string
    }
}