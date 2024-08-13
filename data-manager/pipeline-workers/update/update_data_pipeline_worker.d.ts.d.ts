import { BaseDataPipelineWorkerConstructor, BaseDataPipelineWorkerInstance } from "../base/base_data_pipeline_worker.d.ts.js";

interface UpdateDataPipelineWorkerInstance<MODEL extends BASE_DATA_MODEL> extends BaseDataPipelineWorkerInstance<MODEL>{

    updateData<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(args: BaseDataPipelineBuildArgs<MODEL, ReqScope>): void;
    cancelDataUpdate(modelID: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], cancelAll?: boolean, buildOnlyCancel?: boolean): void;
}

export declare interface UpdateDataPipelineWorkerConstructor<MODEL extends BASE_DATA_MODEL> implements BaseDataPipelineWorkerConstructor<MODEL>{

    new(): UpdateDataPipelineWorkerInstance<MODEL>;
}