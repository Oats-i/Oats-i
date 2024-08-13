import { DataLoadResponse, DataOperationsNetworkInterfaceInstance, MutationStates } from "DataManager";
import { BASE_PIPELINE_BUILD_ARGS, BASE_PIPELINE_DFA_GROUPS, BASE_PIPELINE_PSEUDO_STATE, BASE_PIPELINE_STATE } from "GenericBuildPipelineWorker";
import { BaseDataPipelineBuildArgs, BaseDataPipelineWorkerConstructor, BaseDataPipelineWorkerInstance } from "../base/base_data_pipeline_worker.d.ts.js";

interface LoadNewDataPipelineWorkerInstance<MODEL extends BASE_DATA_MODEL> extends BaseDataPipelineWorkerInstance<MODEL>{

    //If no model ID provided, uses MODEL_ROOT as id and scope as MODEL_ROOT
    loadNewData<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(args: LoadNewDataPipelineBuildArgs<MODEL, ReqScope>): void;
    cancelNewDataLoad(modelID: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], cancelAll?: boolean, buildOnly_Cancel?: boolean): void;
}

export declare interface LoadNewDataPipelineWorkerConstructor<MODEL extends BASE_DATA_MODEL> implements BaseDataPipelineWorkerConstructor<MODEL>{

    new(): LoadNewDataPipelineWorkerInstance<MODEL>;
}

type LoadNewDataPipelineBuildArgs<M, S> = Omit<BaseDataPipelineBuildArgs<M, S>, "mutationStateUpdate" | "completeCb" | "newData"> & Partial<Pick<BaseDataPipelineBuildArgs<M, S>, "mutationStateUpdate" | "completeCb">> & {

    loadNewMutationStateCb: (mutationState: MutationStates, finalData: DataManagerPermittedBulkType<M, S>, commitCompleteCb?: genericParamFunction<DataManagerPermittedBulkModelIDs<S>>) => void,
    loadNewCompleteCb: (loadedData: DataManagerPermittedBulkType<M, S>, err: string | object) => void,
}