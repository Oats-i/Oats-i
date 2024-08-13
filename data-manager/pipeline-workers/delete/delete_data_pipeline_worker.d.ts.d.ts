import { BaseDataPipelineWorkerConstructor, BaseDataPipelineWorkerInstance } from "../base/base_data_pipeline_worker.d.ts.js";

interface DeleteDataPipelineWorkerInstance<MODEL extends BASE_DATA_MODEL> extends BaseDataPipelineWorkerInstance<MODEL>{

    deleteData<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(args: BaseDataPipelineBuildArgs<MODEL, ReqScope>): void;
    cancelDataDelete(modelID: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], cancelAll?: boolean, buildOnlyCancel?: boolean): void;
}

export declare interface DeleteDataPipelineWorkerConstructor<MODEL extends BASE_DATA_MODEL> implements BaseDataPipelineWorkerConstructor<MODEL>{

    new(): DeleteDataPipelineWorkerInstance<MODEL>;
}