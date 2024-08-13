//@ts-check

const { default: BaseDataPipelineWorker } = require("../base/base_data_pipeline_worker");

/**
 * @template M
 * @extends {BaseDataPipelineWorker<M>}
 */
class UpdateDataPipelineWorker extends BaseDataPipelineWorker{

    /**
     * 
     * @type {import("./update_data_pipeline_worker.d.ts").UpdateDataPipelineWorkerInstance<M>['updateData']}
     */
    updateData(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: args.buildID
            },
            targetDFAInfo: {

                dfaGroupKey: "pipelineMutationSuccessDFA"
            },
            failStartCb: () => {

                const err = "Failed to start update data pipeline for build ID " + args.buildID;
                console.error(err);
                args.completeCb(args.modelID_s, args.originalScope, null, err, null);
            },
            completeCb: (finalArgs) => {

                args.completeCb(finalArgs.modelID_s, finalArgs.originalScope, this.dataManager.getNewDataScopedToRequest(finalArgs.originalScope, finalArgs.scope, finalArgs.processedData?.data, finalArgs.mappedDataId), finalArgs.err, finalArgs.processedData?.data);
            }
        });
    }

    /**
     * 
     * @type {import("./update_data_pipeline_worker.d.ts").UpdateDataPipelineWorkerInstance<M>['cancelDataUpdate']}
     */
    cancelDataUpdate(modelID, scope, cancelAll, buildOnlyCancel){

        /**
         * 
         * @param {BaseDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>} cancelArgs 
         */
        const startCancelPipelineBuild = (cancelArgs) => {

            if(buildOnlyCancel){

                cancelArgs.cancelBuildOnly_ByPassNonNetwork = true;
            } else {

                this.startPipelineBuild({
    
                    myBuildArgs: cancelArgs,
                    buildDefinitionParams: {
        
                        buildID: null,
                    },
                    targetDFAInfo: {
        
                        dfaGroupKey: "pipelineMutationCancelledDFA",
                    },
                    failStartCb: () => {
        
                        const err = "Failed to start cancel update data pipeline for build ID " + cancelArgs.buildID;
                        console.error(err);
                        cancelArgs.completeCb(cancelArgs.modelID_s, cancelArgs.originalScope, null, err, null);
                    },
                    completeCb: (finalArgs) => {
        
                        cancelArgs.completeCb(finalArgs.modelID_s, finalArgs.originalScope, this.dataManager.getNewDataScopedToRequest(finalArgs.originalScope, finalArgs.scope, finalArgs.processedData?.data, finalArgs.mappedDataId), finalArgs.err, finalArgs.processedData?.data);
                    }
                });
            }
        }

        if(cancelAll){

            //Loop through all running builds
            const runningBuildsCopy = this.runningBuilds.copy();
            const length = runningBuildsCopy.size();
            for(let i = 0; i < length; i++){

                startCancelPipelineBuild(runningBuildsCopy.pop().buildArgs);
            }
        } else {

            const origInfo = this.runningBuilds.find((info) => info.buildArgs.modelID_s === modelID && info.buildArgs.scope === scope);
            if(origInfo){

                startCancelPipelineBuild(origInfo.buildArgs);
            } else {

                console.error("Can't cancel upload for " + modelID + " " + scope);
            }
        }
    }
}

if(false){

    /**
     * @type {import("./update_data_pipeline_worker.d.ts").UpdateDataPipelineWorkerInstance<*>}
     */
    const check = new UpdateDataPipelineWorker(null);
}

export default UpdateDataPipelineWorker;