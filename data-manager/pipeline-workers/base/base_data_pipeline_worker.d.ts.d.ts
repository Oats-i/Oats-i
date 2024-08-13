import { GenericBuildPipelineWorkerInstance, PipelineStateActionCallbackArgs } from "GenericBuildPipelineWorker";
import Stack from "../../../utils/abstract-data-types/stack/stack_adt";
import ExclusiveStack from "../../../utils/abstract-data-types/exclusive-stack/exclusive_stack_adt";
import { UploadNewDataPipelineArgs } from "../upload/upload_data_pipeline_worker.d.ts";
import { DataLoadResponse } from "DataManager";

interface DataPipelineConfirmCallbackInterfaceInstance<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS>{

    cbArgs: PipelineStateActionCallbackArgs<BUILD_ARGS, STATES, DFA_GROUPS>;

    retryCb(retry: boolean): void;
}

interface DataPipelineConfirmCallbackInterfaceConstructor<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS>{

    new(): DataPipelineConfirmCallbackInterfaceInstance<STATES, BUILD_ARGS, DFA_GROUPS>;
}

interface BaseDataPipelineWorkerInstance<MODEL extends BASE_DATA_MODEL> extends GenericBuildPipelineWorkerInstance<BaseDataPipelineWorkerStates, BaseDataPipelineBuildArgs<MODEL, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis'], NestedChildKeyOf<MODEL, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>>, BaseDataPipelineWorkerDFAGroups, null>{

    //Members
    //This stack keeps track of ALL running builds
    runningBuilds: ExclusiveStack<{ buildID: string, buildArgs: BaseDataPipelineBuildArgs<MODEL, keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], NestedChildKeyOf<MODEL, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>>}>;
    //This as stack to help just log order of requests
    runningRequests: ExclusiveStack<string>;
    //Hold info for pending confirmations
    pipelineHoldInfo: ExclusiveStack<DataPipelineHoldInfo<BaseDataPipelineWorkerStates, BaseDataPipelineBuildArgs<MODEL, keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], NestedChildKeyOf<MODEL, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>>, BaseDataPipelineWorkerDFAGroups>>; 
    dataManager: DataManagerInstance<MODEL>

    buildPipelineBuildID(modelID: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']): string;

    //To replace above. Can run any update
    recursiveUpdateViewManagers(managers: StandardViewManagerInstance<MODEL, *>[], left: number, action: (viewManager: StandardViewManagerInstance<MODEL, *>, completeCb: genericFunction ) => void, completeCb: genericFunction, comparatorFn: BaseDataPipelineBuildArgs<MODEL, *, *>['_get_not_orderedViewManagers']): void;

    //To get the right error callback for a build on hold (pending retry or cancel confirmation)
    //Asked when a view manager reattaches to a view with pending mutation that's on cancel
    //Behavior based on sending options
    getErrorCallbackForBuild(buildID: string): PipelineErrorCallbackInfo<STATES, BUILD_ARGS, DFA_GROUPS>;
}

export declare interface BaseDataPipelineWorkerConstructor<MODEL extends BASE_DATA_MODEL> implements GenericBuildPipelineWorkerConstructor<BaseDataPipelineWorkerStates, BaseDataPipelineBuildArgs<MODEL, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis'], NestedChildKeyOf<MODEL, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>>, BaseDataPipelineWorkerDFAGroups, null>{

    new(args: BaseDataPipelineWorkerConstructorArgs<MODEL>): BaseDataPipelineWorkerInstance<MODEL>;
}

//Generics here. And continue
type BaseDataPipelineWorkerConstructorArgs<M> = {

    dataManager: DataManagerInstance<M>
};

type BaseDataPipelineWorkerStates = { 
    
    //Basically, tell view what we're about to do, do it, commit, then tell view we're done
    //Also tell of error (to view, with common error handling callback)
    //Can retry and start whole pipeline/dfa again. Makes more sense. Just fire the whole thing again

    //For success
    onViewPrePipelineMutation: 0, 
    getReqBody: 1, 
    runPipelineMutation: 2, 
    postProcessResponse: 3, 
    commitResponse: 4, 
    onViewCommitResponse: 5, 
    done: 6,

    //For failed
    onViewFailedPipelineMutation: 7,
    //Just restart the success DFA, I know, lengthy probably. But better now. Can help if some params were off
    retryPipelineMutation: 8,
    //Trigger cancel DFA
    requestCancelPipelineMutation: 9

    //For cancel
    onViewCancelledPipelineMutation: 10,
    cancelPipelineMutation: 11,

    //For build only cancel dfa
    //Invalidates the pipeline by creating a new build start stamp, but network activities are left to complete if was at that running stage
    //However, no post processing done since build already invalidated on return
    cancelPipelineBuildOnly: 12
}

type BaseDataPipelineWorkerDFAGroups = { 
    
    pipelineMutationSuccessDFA: {}, 
    pipelineMutationFailedDFA: {},
    pipelineMutationCancelledDFA: {},
    // pipelineMutationBuildOnlyCancelDFA: {}
}

type BaseDataPipelineBuildArgs<M, S, O_S extends NestedChildKeyOf<M, S>> = {

    apiOptions: Omit<DataManagerAPIOptions<M>, 'serverSide'>,
    //For the modelID. Array for when loading new and committed a bulk model list
    modelID_s: DataManagerPermittedBulkModelIDs<S>,
    scope: S,
    //Update for correct scoping using original when override
    originalScope: O_S,
    //Don't pass. Will be inferred from within //Will be inferred from the scope (not model ID. A model can have multiple mutations at unrelated scopes happening), so network calls appropriately handled by override ID (SILENT ABORT FEATURE FOR DIRECT ABORTS)
    buildID?: string,
    dataMutation: DataManagerMutations,
    //Array for APIs that support bulk uploads? But data manager API doesn't allow for this. Not unless we have bulk upload existing models
    newData: DataManagerPermittedBulkType<M, S>,
    oldData: ValueTypeOfNested<M, S>,
    oldCompleteModel: Partial<M>,
    dataMutationAPI: string,
    options: SendDataOptions,
    mappedDataId: string,
    _get_not_orderedViewManagers: genericReturnFunction<StandardViewManagerInstance<M, *>[]>, //Provided as a function to allow to always get an updated list for callbacks and avoid nulls. View Manager knows correct state on init by checking any pending mutations in attached model ID. DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['views'],
    networkInterface: DataManagerDataOperationsNetworkInterface<M, S>,
    //Invoke cb for new model ids if new models created. useful for load new
    //Update for correct scoping using original when override
    mutationStateUpdate: (mutationState: MutationStates, modelID_s: string | string[], scope: O_S, data: DataManagerPermittedBulkType<M, O_S>, newModelIdsCB?: genericParamFunction<DataManagerPermittedBulkModelIDs<O_S>>) => void,
    //Update for correct scoping using original when override
    completeCb: (modelID: string | string[], scope: O_S, finalModel: DataManagerPermittedBulkType<M, O_S>, err: string | object, overrideScopeCommitModel: DataManagerPermittedBulkType<M, S>) => void,

    //Used internally
    reqOptions?: DataManagerRequestOptions,
    reqID?: string,
    err?: string | object,
    res?: any,
    status?: number,
    processedData?: DataLoadResponse<DataManagerPermittedBulkType<M, S>, S, M>,
    //For scope of cancellation. SHOWS IMPORTANCE OF HAVING ONLY ONE reqUtils GIVEN IN CONSTRUCTOR
    cancelAllRequests?: boolean,
    cancelBuildOnly_ByPassNonNetwork: boolean,
    tempMappedDataIdsInfo?: TempMappedDataIdsInfo[]
}

type DataPipelineHoldInfo<S, B_A, D_G> = {

    buildID: string,
    confirmCBInterface: DataPipelineConfirmCallbackInterfaceInstance<S, B_A, D_G>,
    res: *
}

type PipelineErrorCallbackInfo<STATES, BUILD_ARGS, DFA_GROUPS> = {

    cb: DataPipelineConfirmCallbackInterfaceInstance<STATES, BUILD_ARGS, DFA_GROUPS>,
    res: *
}

type TempMappedDataIdsInfo = { 
    
    viewManagerId: string, 
    tempMappedDataId: string,
    childrenInfo: TempMappedDataIdsInfo[]
}