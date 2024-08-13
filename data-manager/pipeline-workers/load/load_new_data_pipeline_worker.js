//@ts-check

/**
 * @template M, S
 * @typedef {import("./load_new_data_pipeline_worker.d.ts.js").LoadNewDataPipelineBuildArgs<M, S>} LoadNewDataPipelineBuildArgs
 */

const { default: BaseDataPipelineWorker } = require("../base/base_data_pipeline_worker.js");

/**
 * @template M
 * @extends {BaseDataPipelineWorker<M>}
 */
class LoadNewDataPipelineWorker extends BaseDataPipelineWorker{

    /**
     * @type {import("./load_new_data_pipeline_worker.d.ts.js").LoadNewDataPipelineWorkerInstance<M>['loadNewData']}
     */
    loadNewData(args){

        args.mutationStateUpdate = (mutationState, id, APIScope, model, modelIDCb) => {

            args.loadNewMutationStateCb(mutationState, model, modelIDCb);
        };
        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: null
            },
            targetDFAInfo: {

                dfaGroupKey: "pipelineMutationSuccessDFA"
            },
            failStartCb: () => {

                const err = "Failed to start load new data pipeline for build ID " + args.buildID;
                console.error(err);
                args.loadNewCompleteCb(null, err);
            },
            completeCb: (finalArgs) => {

                args.loadNewCompleteCb(finalArgs?.processedData?.data, finalArgs.err);
            }
        });
    }

    /**
     * Should there be no support for build only since it makes no sense. UI and data not really needed
     * @type {import("./load_new_data_pipeline_worker.d.ts.js").LoadNewDataPipelineWorkerInstance<M>['cancelNewDataLoad']}
     */
    cancelNewDataLoad(modelID, scope, cancelAll, buildOnlyCancel){

        /**
         * 
         * @param {LoadNewDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']> & BaseDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>} cancelArgs 
         */
        const startCancelPipelineBuild = (cancelArgs) => {

            if(buildOnlyCancel){

                cancelArgs.cancelBuildOnly_ByPassNonNetwork = true;
            }
            this.startPipelineBuild({

                myBuildArgs: cancelArgs,
                buildDefinitionParams: {
    
                    buildID: null,
                },
                targetDFAInfo: {
    
                    dfaGroupKey: "pipelineMutationCancelledDFA",
                },
                failStartCb: () => {
    
                    const err = "Failed to start cancel load new data pipeline for build ID " + cancelArgs.buildID;
                    console.error(err);
                    cancelArgs.loadNewCompleteCb(null, err);
                },
                completeCb: (finalArgs) => {
    
                    cancelArgs.loadNewCompleteCb(finalArgs.processedData?.data, finalArgs.err);
                }
            });
        }

        if(cancelAll){

            //Loop through all running builds
            const runningBuildsCopy = this.runningBuilds.copy();
            const length = runningBuildsCopy.size();
            for(let i = 0; i < length; i++){

                startCancelPipelineBuild(runningBuildsCopy.pop().buildArgs);
            }
        } else {

            let origInfo = null;
            if(modelID){

                origInfo = this.runningBuilds.find((info) => info.buildArgs.modelID_s === modelID && info.buildArgs.scope === scope);
            } else {

                origInfo = this.runningBuilds.find((info) => info.buildID === this.buildPipelineBuildID(null, null));
            }
            if(origInfo){

                startCancelPipelineBuild(origInfo.buildArgs);
            } else {

                console.error("Can't cancel load new for " + modelID + " " + scope);
            }
        }
    }
}

if(false){

    /**
     * @type {import("./load_new_data_pipeline_worker.d.ts.js").LoadNewDataPipelineWorkerConstructor<*>}
     */
    const workerTest = LoadNewDataPipelineWorker;
}

export default LoadNewDataPipelineWorker;