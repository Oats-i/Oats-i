import { BaseDataPipelineWorkerConstructor, BaseDataPipelineWorkerInstance } from "../base/base_data_pipeline_worker.d.ts.js";

interface UploadDataPipelineWorkerInstance<MODEL extends BASE_DATA_MODEL> extends BaseDataPipelineWorkerInstance<MODEL>{

    uploadNewData<ReqScope extends keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis']>(args: BaseDataPipelineBuildArgs<MODEL, ReqScope>): void;
    cancelDataUpload(modelID: string, scope: keyof DataManagerInstance<MODEL>['masterWorkingModel']['scopedOptions']['apis'], cancelAll?: boolean, buildOnlyCancel?: boolean): void;
}

export declare interface UploadDataPipelineWorkerConstructor<MODEL extends BASE_DATA_MODEL> implements BaseDataPipelineWorkerConstructor<MODEL>{

    new(): UploadDataPipelineWorkerInstance<MODEL>;
}