//@ts-check
import ExclusiveStack from "../../../utils/abstract-data-types/exclusive-stack/exclusive_stack_adt";
import Stack from "../../../utils/abstract-data-types/stack/stack_adt";


import GenericBuildPipelineWorker from "../../../utils/generic-pipeline-worker/generic_build_pipeline_worker";
import DataManager from "../../data_manager";

/**
 * @template M, S
 * @typedef { import("./base_data_pipeline_worker.d.ts").BaseDataPipelineBuildArgs<M, S, NestedChildKeyOf<M, S>> } BaseDataPipelineBuildArgs
 */
/**
 * @typedef { import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerStates } BaseDataPipelineWorkerStates
 * @typedef { import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerDFAGroups } BaseDataPipelineWorkerDFAGroups //With retry option for fail 
 */

/**
 * @extends {GenericBuildPipelineWorker<BaseDataPipelineWorkerStates, BaseDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>, BaseDataPipelineWorkerDFAGroups, null>}
 * @template M
 */
class BaseDataPipelineWorker extends GenericBuildPipelineWorker{

    /**
     * 
     * @param {import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerConstructorArgs<M>} args 
     */
    constructor(args){

        /**
         * @type {GenericBuildPipelineWorkerConstructorArgs<BaseDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>, BaseDataPipelineWorkerStates, BaseDataPipelineWorkerDFAGroups, null>}
         */
        const superArgs = {

            asynchronousBuildDefinition: {

                defaultPipelineState: "done",
                runAsynchronous: true,
            },
            pseudoStates: null,
            stateTransitionDefinition: {

                pipelineMutationSuccessDFA: {

                    autoTriggerState: "done",
                    root: "onViewPrePipelineMutation",

                    onViewPrePipelineMutation: {

                        prev: "done",
                        next: "getReqBody", //Have this also return a custom model described by you. A JSON.parse? Do it yourself kindly
                        cb: (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            if(!myBuildArgs.cancelBuildOnly_ByPassNonNetwork){

                                if(myBuildArgs.options.skipViewHooks){
    
                                    cbArgs.failNextCb({
    
                                        goToNext: true,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                } else {
    
                                    //Using original scope. Because that is the scope for data in temp
                                    //Reducing data to that scope
                                    myBuildArgs.mutationStateUpdate("onMutate", myBuildArgs.modelID_s, myBuildArgs.originalScope, this.dataManager.getNewDataScopedToRequest(myBuildArgs.originalScope, myBuildArgs.scope, myBuildArgs.newData, myBuildArgs.mappedDataId));
                                    //Inform view managers of upload mutation
                                    this.recursiveUpdateViewManagers(myBuildArgs._get_not_orderedViewManagers(), myBuildArgs._get_not_orderedViewManagers().length, (viewManager, cb) => {
    
                                        viewManager.onMutate(myBuildArgs.dataMutation, myBuildArgs.newData, myBuildArgs.oldData, myBuildArgs.mappedDataId, myBuildArgs.modelID_s, myBuildArgs.scope, (tempMappedDataIdInfo) => {
                        
                                            //save per id, in this 
                                            tempMappedDataIdInfo ? myBuildArgs.tempMappedDataIdsInfo.push(tempMappedDataIdInfo) : null;
                                            cb();
                                        }, { tempMappedDataIdInfo: myBuildArgs.tempMappedDataIdsInfo.find((info) => info.viewManagerId === viewManager.id) });
                                    }, () => {
    
                                        //Done. Move to next
                                        cbArgs.failNextCb({
        
                                            goToNext: true,
                                            buildArgs: cbArgs.buildArgs
                                        });
                                    }, myBuildArgs._get_not_orderedViewManagers);
                                }
                            } else {

                                //Cancelling, but build only. Network allowed to complete
                                cbArgs.failNextCb({
    
                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: null
                    },
                    getReqBody: {

                        prev: "onViewPrePipelineMutation",
                        next: "runPipelineMutation",
                        cb: async (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            //Call the get reqbody cb
                            try{

                                myBuildArgs.reqOptions = await myBuildArgs.networkInterface.getReqBody(myBuildArgs.dataMutationAPI, myBuildArgs.newData, myBuildArgs.dataMutation, myBuildArgs.oldCompleteModel);
    
                                //Move on
                                cbArgs.failNextCb({
    
                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            } catch(err){

                                myBuildArgs.err = err;
                                cbArgs.failNextCb({

                                    goToNext: false,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: "pipelineMutationFailedDFA" //Moving here cause a request body fail is a code error for developer side. Cancel
                    },
                    runPipelineMutation: {

                        prev: "getReqBody",
                        next: "postProcessResponse",
                        cb: (cbArgs) => {

                            //Make the request
                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            //To support cache bursting
                            const addr = myBuildArgs.reqOptions?.reqAddress ? myBuildArgs.reqOptions.reqAddress : myBuildArgs.dataMutationAPI;
                            myBuildArgs.apiOptions.reqUtils.makeRemoteRequest({

                                ...myBuildArgs.reqOptions,
                                reqAddress: addr,
                            }, (status, res) => {
                                
                                //Remove the request id from storage
                                this.runningRequests.sortDelete(myBuildArgs.buildID);

                                //Handle status and response. Add response to args
                                if(status === 200 || status === 304){

                                    //Add response to args
                                    myBuildArgs.res = res;
                                    myBuildArgs.status = status;
                                    cbArgs.failNextCb({

                                        goToNext: true,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                } else {

                                    myBuildArgs.res = res;
                                    myBuildArgs.err = res;
                                    myBuildArgs.status = status;
                                    cbArgs.failNextCb({

                                        goToNext: false,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                }
                            }, (err) => {

                                myBuildArgs.err = err;
                                cbArgs.failNextCb({

                                    goToNext: false,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }, null, null, myBuildArgs.buildID);

                            this.runningRequests.push(myBuildArgs.buildID);
                        },
                        fail: "pipelineMutationFailedDFA"
                    },
                    postProcessResponse: {

                        prev: "runPipelineMutation",
                        next: "commitResponse",
                        cb: async (cbArgs) => {

                            //Call the postprocessor
                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;

                            //Remove previous successfull request id from storage
                            this.runningRequests.sortDelete(myBuildArgs.buildID);

                            //clear all errors, even from previous retries
                            myBuildArgs.err = null;
                            myBuildArgs.processedData = await myBuildArgs.networkInterface.onDataLoadPostProcess(myBuildArgs.dataMutationAPI, myBuildArgs.res, myBuildArgs.newData, null, myBuildArgs.dataMutation, myBuildArgs.mappedDataId, { reqMethod: myBuildArgs.reqOptions.reqMethod });
                            
                            //Go to next
                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    },
                    commitResponse: {

                        prev: "postProcessResponse",
                        next: "onViewCommitResponse",
                        cb: (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            if(!myBuildArgs.cancelBuildOnly_ByPassNonNetwork){

                                myBuildArgs.mutationStateUpdate("onCommit", myBuildArgs.modelID_s, myBuildArgs.originalScope, this.dataManager.getNewDataScopedToRequest(myBuildArgs.originalScope, myBuildArgs.scope, myBuildArgs.processedData?.data, myBuildArgs.mappedDataId), (modelIDs) => {
    
                                    myBuildArgs.modelID_s = modelIDs;
                                });
                                
                                //Move to next
                                cbArgs.failNextCb({
    
                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            } else {

                                //Move to next. Build being cancelled but network allowed. Non-network bypassed
                                cbArgs.failNextCb({
    
                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: null
                    },
                    onViewCommitResponse: {

                        prev: "commitResponse",
                        next: "done",
                        cb: (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            if(!myBuildArgs.cancelBuildOnly_ByPassNonNetwork){

                                if(myBuildArgs.options.skipViewHooks){
                                    
                                    cbArgs.failNextCb({
                                        
                                        goToNext: true,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                } else {
                                    
                                    this.recursiveUpdateViewManagers(myBuildArgs._get_not_orderedViewManagers(), myBuildArgs._get_not_orderedViewManagers().length, (viewManager, completeCb) => {
                                        
                                        viewManager.onCommit(myBuildArgs.dataMutation, structuredClone(myBuildArgs.processedData?.data), myBuildArgs.oldData, myBuildArgs.mappedDataId, myBuildArgs.modelID_s, myBuildArgs.scope, myBuildArgs.originalScope, () => {
        
                                            completeCb();
                                        }, { tempMappedDataIdInfo: myBuildArgs.tempMappedDataIdsInfo.find((info) => info.viewManagerId === viewManager.id), paginationInfo: myBuildArgs.processedData.extras?.paginationInfo });
                                    }, () => {
        
                                        //Move to next
                                        cbArgs.failNextCb({
        
                                            goToNext: true,
                                            buildArgs: cbArgs.buildArgs
                                        });
                                    }, myBuildArgs._get_not_orderedViewManagers);
                                }
                            } else {

                                //Move to next
                                cbArgs.failNextCb({
        
                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: null
                    },
                    done: {

                        prev: "onViewCommitResponse",
                        next: null,
                        cb: (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            if(!myBuildArgs.cancelBuildOnly_ByPassNonNetwork){

                                //Tell mutation state update
                                myBuildArgs.mutationStateUpdate("complete", myBuildArgs.modelID_s, myBuildArgs.originalScope, this.dataManager.getNewDataScopedToRequest(myBuildArgs.originalScope, myBuildArgs.scope, myBuildArgs.processedData?.data, myBuildArgs.mappedDataId));
                                cbArgs.failNextCb({
    
                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            } else {

                                cbArgs.failNextCb({
    
                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: null
                    }
                },
                pipelineMutationFailedDFA: {

                    autoTriggerState: null,
                    root: "onViewFailedPipelineMutation",

                    onViewFailedPipelineMutation: {

                        prev: "pipelineMutationSuccessDFA", //Specifically, getReqBody or uploadData
                        next: "retryPipelineMutation",
                        cb: (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            //Get the error msg from interface
                            const resData = myBuildArgs.networkInterface.onDataLoadError(myBuildArgs.dataMutationAPI, myBuildArgs.res, myBuildArgs.newData, null, myBuildArgs.dataMutation);

                            //Remove previous failed request id from storage
                            this.runningRequests.sortDelete(myBuildArgs.buildID);

                            if(!myBuildArgs.cancelBuildOnly_ByPassNonNetwork){

                                //Tell mutation state update
                                myBuildArgs.mutationStateUpdate("onError", myBuildArgs.modelID_s, myBuildArgs.originalScope, this.dataManager.getNewDataScopedToRequest(myBuildArgs.originalScope, myBuildArgs.scope, myBuildArgs.newData, myBuildArgs.mappedDataId));
                                //Making autoCancelOnError default behavior
                                if(myBuildArgs.options.autoCancelOnError !== undefined && !myBuildArgs.options.autoCancelOnError){
    
                                    if(myBuildArgs.options.skipViewHooks){
    
                                        console.error(`DATA PIPELINE ERROR: Skipping view hooks while data activity not set to auto cancel. Overriding to auto cancel`);
                                        cbArgs.failNextCb({
        
                                            goToNext: false, //Setting to false to avoid a loop of unattended ui calls to confirm. Tell in error
                                            buildArgs: cbArgs.buildArgs
                                        });
                                    } else {
    
                                        const pipeline = this;
                                        //Tell the views of failed
                                        //Create the interface
                                        /**
                                         * @type {DataPipelineConfirmCallbackInterfaceInstance<BaseDataPipelineWorkerStates, BaseDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>, BaseDataPipelineWorkerDFAGroups>}
                                         */
                                        const cbInterface = new class{
            
                                            constructor(){
            
                                                /**
                                                 * @type {DataPipelineConfirmCallbackInterfaceInstance<BaseDataPipelineWorkerStates, BaseDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>, BaseDataPipelineWorkerDFAGroups>['cbArgs']}
                                                 */
                                                this.cbArgs = cbArgs;
                                            }
            
                                            /**
                                             * @type {DataPipelineConfirmCallbackInterfaceInstance<BaseDataPipelineWorkerStates, BaseDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>, BaseDataPipelineWorkerDFAGroups>['retryCb']}
                                             */
                                            retryCb(retry){
            
                                                //Remove from hold info
                                                pipeline.pipelineHoldInfo.sortDelete({
        
                                                    buildID: myBuildArgs.buildID,
                                                    confirmCBInterface: this,
                                                    res: resData
                                                });
        
                                                //Now move
                                                if(retry){
            
                                                    this.cbArgs.failNextCb({
            
                                                        goToNext: true,
                                                        buildArgs: cbArgs.buildArgs
                                                    });
                                                } else {
        
                                                    this.cbArgs.failNextCb({
        
                                                        goToNext: false,
                                                        buildArgs: cbArgs.buildArgs
                                                    })
                                                }
                                            }
                                        };
            
                                        //Save it to hold
                                        this.pipelineHoldInfo.push({
            
                                            buildID: cbArgs.buildArgs.myBuildArgs.buildID,
                                            confirmCBInterface: cbInterface,
                                            res: resData
                                        });
        
                                        //Inform the view managers
                                        this.recursiveUpdateViewManagers(myBuildArgs._get_not_orderedViewManagers(), myBuildArgs._get_not_orderedViewManagers().length, (viewManager, cb) => {
        
                                            viewManager.onError(myBuildArgs.dataMutation, myBuildArgs.newData, myBuildArgs.oldData, myBuildArgs.mappedDataId, myBuildArgs.modelID_s, resData, myBuildArgs.scope, cbInterface, { tempMappedDataIdInfo: myBuildArgs.tempMappedDataIdsInfo.find((info) => info.viewManagerId === viewManager.id) });
                                            //Directly calling cb to propagate to others
                                            //NOW, TO AVOID PIPELINE CRASHING DUE TO MULTIPLE DEMANDING PROGRESSION
                                            //HAVE VIEW MANAGER LIMIT ERROR HOOKS TO ONLY ONE. DEVELOPER BE SMART
                                            //But will be reset by view reset if one consents or denies.
                                            //Solved above by new logic for valid build check for pipeline
                                            //Current states must match state in args. Else, late cb in a spread call 
                                            cb();
                                        }, () => {
        
                                            //Do nothing
                                        }, myBuildArgs._get_not_orderedViewManagers);
                                    }
                                } else {
 
                                    //Set to auto cancel failed requests
                                    //Updating views handled in cancel
                                    cbArgs.failNextCb({
            
                                        goToNext: false,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                }
                            } else {

                                cbArgs.failNextCb({
        
                                    goToNext: false,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: "requestCancelPipelineMutation"
                    },
                    retryPipelineMutation: {

                        prev: "onViewFailedPipelineMutation",
                        next: "pipelineMutationSuccessDFA",
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    },
                    requestCancelPipelineMutation: {

                        prev: "onViewFailedPipelineMutation",
                        next: "pipelineMutationCancelledDFA",
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                },
                pipelineMutationCancelledDFA: {

                    autoTriggerState: null,
                    root: "onViewCancelledPipelineMutation",

                    onViewCancelledPipelineMutation: {

                        prev: null, //However, can be uploadFailedDFA
                        next: "cancelPipelineMutation",
                        cb: (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            if(!myBuildArgs.cancelBuildOnly_ByPassNonNetwork){

                                //Set err. It's technically failed
                                myBuildArgs.err ? null : myBuildArgs.err = DataManager._CANCELLED_DATA_OP;
                                //Tell mutation state update
                                myBuildArgs.mutationStateUpdate("onCancel", myBuildArgs.modelID_s, myBuildArgs.originalScope, this.dataManager.getNewDataScopedToRequest(myBuildArgs.originalScope, myBuildArgs.scope, myBuildArgs.processedData?.data, myBuildArgs.mappedDataId));
                                if(myBuildArgs.options.skipViewHooks){
    
                                    cbArgs.failNextCb({
    
                                        goToNext: true,
                                        buildArgs: cbArgs.buildArgs
                                    });
                                } else {
    
                                    //Tell view managers
                                    this.recursiveUpdateViewManagers(myBuildArgs._get_not_orderedViewManagers(), myBuildArgs._get_not_orderedViewManagers().length, (viewManager, cb) => {
        
                                        //Pass an err object, with err and status
                                        viewManager.onCancel(myBuildArgs.dataMutation, myBuildArgs.newData, myBuildArgs.oldData, myBuildArgs.mappedDataId, myBuildArgs.modelID_s, myBuildArgs.scope, { res: myBuildArgs.err, status: myBuildArgs.status }, () => {
        
                                            cb();
                                        }, { tempMappedDataIdInfo: myBuildArgs.tempMappedDataIdsInfo.find((info) => info.viewManagerId === viewManager.id) })
                                    }, () => {
        
                                        cbArgs.failNextCb({
        
                                            goToNext: true,
                                            buildArgs: cbArgs.buildArgs
                                        });
                                    }, myBuildArgs._get_not_orderedViewManagers);
                                }
                            } else {

                                cbArgs.failNextCb({
    
                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: null
                    },
                    cancelPipelineMutation: {

                        prev: "onViewCancelledPipelineMutation",
                        next: null,
                        cb: (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            myBuildArgs.apiOptions.reqUtils.abortRequest(myBuildArgs.buildID);
                            this.runningRequests.sortDelete(myBuildArgs.buildID);
                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                },
            }
        }

        super(superArgs);

        /**
         * @type {import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerInstance<M>['runningBuilds']}
         */
        this.runningBuilds = new ExclusiveStack();
        /**
         * @type {import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerInstance<M>['runningRequests']}
         */
        this.runningRequests = new ExclusiveStack();
        /**
         * @type {import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerInstance<M>['pipelineHoldInfo']}
         */
        this.pipelineHoldInfo = new ExclusiveStack();
        this.dataManager = args.dataManager;
    }

    /**
     * 
     * @type {import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerInstance<M>['buildPipelineBuildID']}
     */
    buildPipelineBuildID(modelID, scope){

        return modelID ? `${modelID}_FOR_SCOPE_${scope}` : `${DataManager._MODEL_ROOT_SCOPE}_FOR_SCOPE_${DataManager._MODEL_ROOT_SCOPE}`;
    }

    /**
     * Can CANCEL A PIPELINE WITHOUT CANCELLING THE DATA CALLS. Perfect option
     * 
     * So, flush all data will take the option of cancelDataNetworkCalls
     * By pipeline design, the returns will not continue the pipeline because of new build start time stamp
     * @type {import("GenericBuildPipelineWorker").GenericBuildPipelineWorkerInstance<BaseDataPipelineWorkerStates, BaseDataPipelineBuildArgs<M, keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']>, BaseDataPipelineWorkerDFAGroups, null>['startPipelineBuild']}
     */
    startPipelineBuild(args){

        //Generate buildID
        args.myBuildArgs.buildID = this.buildPipelineBuildID(args.myBuildArgs.modelID_s, args.myBuildArgs.scope);
        //init temps array
        args.myBuildArgs.tempMappedDataIdsInfo = [];
        args.buildDefinitionParams.buildID = args.myBuildArgs.buildID;
        const buildInfo = { buildID: args.myBuildArgs.buildID, buildArgs: args.myBuildArgs };
        this.runningBuilds.push(buildInfo);
        const origFailCb = args.failStartCb;
        args.failStartCb = () => {

            this.runningBuilds.sortDelete(buildInfo);
            origFailCb();
        };
        const origCompleteCb = args.completeCb;
        args.completeCb = (buildArgs) => {

            this.runningBuilds.sortDelete(buildInfo);
            origCompleteCb(buildArgs);
        }
        super.startPipelineBuild(args);
    }

    /**
     * @type {import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerInstance<M>['recursiveUpdateViewManagers']}
     */
    recursiveUpdateViewManagers(managers, left, action, completeCb, comparatorFn){

        if(left > 0){
            
            //Now, view managers get full model then pass the value type based on scope to hooks
            //Pass previous model and new one
            const viewManager = managers[managers.length - left];
            //Comparator ensures did not remove itself before cb from last view manager
            if(viewManager && comparatorFn().includes(viewManager)){

                action(viewManager, () => {

                    this.recursiveUpdateViewManagers(managers, --left, action, completeCb, comparatorFn);
                });
            } else {

                this.recursiveUpdateViewManagers(managers, --left, action, completeCb, comparatorFn);
            }
        } else {

            completeCb();
        }
    }

    /**
     * View manager checks last mutation state. 
     * If error, requests data manager for callback in regards to the running data mutation, passing
     * scope as buildId. Data manager queries appropriate pipeline worker and returns with interface and msg
     * @type {import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerInstance<M>['getErrorCallbackForBuild']}
     */
    getErrorCallbackForBuild(buildId){

        const info = this.pipelineHoldInfo.find((info) => info.buildID === buildId);
        if(info){

            return {
                
                cb: info.confirmCBInterface,
                res: info.res
            }
        }

        return null;
    }
}

if(false){

    /**
     * SPECIFYING TYPE AGAIN IS VERY IMPORTANT
     * @type {import("./base_data_pipeline_worker.d.ts").BaseDataPipelineWorkerConstructor<*>}
     */
    const baseCheck = BaseDataPipelineWorker;
}

export default BaseDataPipelineWorker;