//@ts-check
/**
 * Data Manager class
 * 
 * Forms the glue that connects the view to the model and server resource.
 * 
 * Data Manager class is responsible for loading data, allowing model transformations into appropriate view model,
 * and allowing for the templating of loaded or uploaded data automatically into the views
 * 
 * Function is fine grained, using scopes
 * A view can hook itself to a data cycle, getting notifications of updates and responding appropriately, through its view manager
 * 
 * The data manager is lifecycle aware, so it will not update views that have been destroyed. HOWEVER, this
 * lifecycle is in the general context of the fragment or view panel. If you remove a view, it's your responsibility
 * to avoid making any changes to it while its reference is null, if you're extending some self-managed listeners or timed events
 * 
 * Main lifecycle object controls data requests which are also lifecycle aware. i.e. if host is destroyed,
 * data updates will be deferred.
 * 
 * So, what of stuff you want to run on the background, always? Attach the data manager to an AppService (not an AppWindowService which is AppWindow dependent) - @todo more on these later
 * and it will always run and update views based on registered hooks, which are automatically deregistered on lifecycle changes
 * of the view's host, observed via the lifecycle object.
 * 
 * YOU CAN HAVE MULTIPLE DATA MANAGERS TO ALLOW FOR MORE COMPLEX DATA HANDLING AND VIEW MANIPULATION
 * 
 * You can also possibly pass a data manager to another function or component that wants to temporarily manipulate some data
 * HOWEVER, ensure you passed the model ID because that external code will not be able to reference the model correctly in updates
 * 
 * 
 */

import GenericBuildPipelineWorker from "../utils/generic-pipeline-worker/generic_build_pipeline_worker";
import ExclusiveStack from "../utils/abstract-data-types/exclusive-stack/exclusive_stack_adt";
import Queue from "../utils/abstract-data-types/queue/queue";
import Stack from "../utils/abstract-data-types/stack/stack_adt";
import RandomNumberCharGenUtils from "../utils/random-number-generator/random_number_char_generator";
import LifecycleRemoteRequestUtils from "../utils/remote-requests/lifecycle/lifecycle_remote_request_utils";
import ListReverser from "../utils/lists/list_reverser";
import DeleteDataPipelineWorker from "./pipeline-workers/delete/delete_data_pipeline_worker";
import LoadNewDataPipelineWorker from "./pipeline-workers/load/load_new_data_pipeline_worker";
import LoadServerSidePipelineWorker from "./pipeline-workers/server-side/load_server_side_pipeline_worker";
import UpdateDataPipelineWorker from "./pipeline-workers/update/update_data_pipeline_worker";
import UploadDataPipelineWorker from "./pipeline-workers/upload/upload_data_pipeline_worker";

/**
 * SOLVED A BIG PROBLEM I HAD HERE. DON'T PROVIDE A GENERIC TYPE. WILL ALLOW OTHERS TO OVERRIDE WITHOUT ISSUES
 * So, leave as <>.
 * 
 * Correct in generic build pipeline worker
 * 
 * Or, pass any (*). BETTER. Allows generic templating in jsdocs.
 * @template {{}} M
 */
class DataManager{

    /**
     * @template E
     * @param {DataManagerConstructorArgs<M, E>} args 
     */
    constructor(args){

        this.primaryLifecycleObject = args.primaryLifeCycleObject;
        //First binds itself to the main lifecycle object
        this.bindLifecycleObject();
        this.masterAPIOptions = args.masterAPIOptions;
        this.maintainNetworkOnFlushAll_Global = args.flushAllNetworkPolicy?.dontAbortGlobal;
        this.maintainNetworkOnFlushAll_Specific = args.flushAllNetworkPolicy?.dontAbortMutationSpecific;
        this.dataRecordsStamp = null;
        this.generateDataRecordsStamp();
        /**
         * @type {import("DataManager").DataManagerWorkingModel<M>}
         */
        this.masterWorkingModel = {

            masterModels: [],
            scopedOptions: {

                apis: {},
                views: {}
            },
            dataWatchers: {}
        }

        /***
         * AUTO-GENERATE?
         * @type {DataManagerInstance<M>['id']}
         */
        this.id = args.id ? args.id : RandomNumberCharGenUtils.generateRandomNumChar(9);

        /**
         * Working pipelines
         * Managed by main lifecycle object provided in constructor
         */
        /**
         * @deprecated - new hydration logic
         * @type {import("./pipeline-workers/server-side/load_server_side_pipeline_worker.d.ts").LoadServerSidePipelineWorkerInstance<import("./pipeline-workers/server-side/load_server_side_pipeline_worker.d.ts").LoadServerSideDataPipelineStates, import("./pipeline-workers/server-side/load_server_side_pipeline_worker").LoadServerSideBuildArgs<M>, import("./pipeline-workers/server-side/load_server_side_pipeline_worker.d.ts").LoadServerSidePipelineDFAGroups, null>}
         */
        this.serverSideDataLoadPipeline = null;

        /**
         * @type {UploadDataPipelineWorker<M>}
         */
        this.uploadDataPipeline = new UploadDataPipelineWorker({dataManager: this});
        /**
         * @type {LoadNewDataPipelineWorker<M>}
         */
        this.loadNewDataPipeline = new LoadNewDataPipelineWorker({dataManager: this});
        /**
         * @type {UpdateDataPipelineWorker<M>}
         */
        this.updateDataPipeline = new UpdateDataPipelineWorker({dataManager: this});
        /**
         * @type {DeleteDataPipelineWorker<M>}
         */
        this.deleteDataPipeline = new DeleteDataPipelineWorker({dataManager: this});

        /**
         * Using stack so later can debug order of requests
         * @type { Map<string, Stack<import("DataManager").DataOperationsInfo<M>>> }
         */
        this.dataOperationsRecords = new Map();

        /**
         * @type {import("DataManager").DataOperationsOverride}
         */
        this.dataOperationsOverrideBehavior = args.dataOperationsOverrideBehavior ? args.dataOperationsOverrideBehavior : "wait";

        this.dataManagerInit = false;
        /**
         * @type {QueueInstance<{manager: StandardViewManagerInstance<M, *>, initArgs: import("StandardViewManager").StandardViewManagerInitArgs<M, *>}>}
         */
        this.viewManagersPendingInit = new Queue();

        /**
         * @type {DataManagerConstructorArgs<M, E>['serverSide']}
         */
        this.serverSideOptions = args.serverSide;

        if(this.serverSideOptions?.hydrateFromServerSide){

            this.initDataManagerServerSide()
        }
    }

    generateDataRecordsStamp(){

        this.dataRecordsStamp = RandomNumberCharGenUtils.generateRandomNumChar(12)
    }

    /**
     * Called to initialize server-side data for the data manager
     * @type {DataManagerInstance<M>['initDataManagerServerSide']}
     */
    async initDataManagerServerSide(){

        /**
         * DATA MANAGER HYDRATION - WORKS LIKE THIS
         */

        /**
         * Use clientJavaScriptHydrator
         * 
         * This is a script added by the server that you can invoke to hydrate your data model as needed
         * 
         * The script exposes an object DataManagerHydrator, which contains unique members with data (array<Partial<model>>) that is used to hydrate your
         * data manager
         * 
         * Now, this MUST conform to Partial<model>, model being the data type actually used by your data manager, but, you can hide crucial information by just providing say,
         * a public data ID as the only server-side hydrated data
         * 
         * How?
         * 
         * Data manager will run a hydration cycle.
         * 
         * First, it will read the raw data and use that as standOn data from the server
         * Then, if you need to (pass a flag: finalNetworkHydration: true), it will call a couple of 
         * network hydration calls, using scope "MODEL_ROOT", but skipping viewManagerHooks.
         * 
         * You should provide an override networkInterface for the network operation
         * 
         * Once the two cycles are complete, any view manager attached will be told of a possible 
         * serverSide render during it's init. This way, it will look to see if the views of its class 
         * are already attached, and spawn the necessary additionals correctly, so it can continue 
         * to work correctly (as many view managers per scope. However, ensure you have unique controlling per class or id [for standard])
         * 
         * The latter ensures we don't worry about attachment order or the details of the view manager's view operations.
         * It just carries out the init in its known way
         * 
         * FORMAT FOR HYDRATOR
         * <script id="data-manager-hydrator">
         *      const DataManagerHydrationInfo = {
         *          
         *          "info_name": {
         *                          info: "info_array",
         *                          extras: "extra_info" //(e.g, pagination end or markers). Also, seemingly non-json using my server-side hydration algo
         *          }
         *      }
         *      window.DataManagerHydrationInfo = DataManagerHydrationInfo;
         * </script>
         * 
         * Data manager deletes the hydration script immediately it reads it, if you set it so. 
         * Then, goes through the network cycle
         * if needed, and proceeds with the rest of the init
         * 
         * Add a completeCb which we can use to read what came from the server as well and set values
         * such as telling the view manager's paginator that pagination is complete, when setting itself up (done with a different flag though)
         * 
         * initDataManagerServerSide being used in ONE place only. So, override
         */

        //read the hydration script
        const hydrationScript = document.head.querySelector(`#${this.serverSideOptions.overrideScriptId || DataManager._HYDRATOR_SCRIPT_ID}`);
        if(hydrationScript){

            //get the info under key
            /**
             * @type {DataManagerHydrationInfo}
             */
            const hydrationInfo = window.DataManagerHydrationInfo;
            const fullInfoForKey = hydrationInfo[this.serverSideOptions.dataKey];
            if(fullInfoForKey){

                try{

                    /**
                     * @type {Partial<M>[]}
                     */
                    let info = fullInfoForKey.info;
                    if(!Array.isArray(info)){

                        throw new Error("Your hydrated data should be an array of model type");
                    }

                    if(this.serverSideOptions.canHydrateData(info)){

                        //Now, do preProcessing, if necessary
                        if(this.serverSideOptions.preProcessHydrationInfo){

                            info = this.serverSideOptions.preProcessHydrationInfo(info);
                        }
                        /**
                         * @type {string[]}
                         */
                        const modelIds = [];
                        //Now, run through this array. Create and commit models based on these values
                        info.forEach((model) => {
                            
                            modelIds.push(this.createAndCommitModel(model, { skipViewHooks: true }));
                        });
                        //now, callback that we're done with this
                        const extras = fullInfoForKey.extras;
                        //Can use extras to, say, tell paginator if end of list
                        this.serverSideOptions.onHydrateComplete(info, extras);
    
                        //Now, process network, if provided - CONTINUE FROM HERE
                        if(this.serverSideOptions.networkOptions.runNetworkStep){
    
                            //run the network calls
                            //They don't provide a mapped data id. Therefore, do not update anything on the ui
                            //So, ensure first hydration includes ui-necessary data
                            modelIds.forEach((id) => {
    
                                this.updateModel("MODEL_ROOT", id, null, null, { skipViewHooks: true }, this.serverSideOptions.networkOptions.overrideNetworkInterface);
                            });
                        }
    
                        //AND, WE ARE DONE
                        //Remove this record - so, in accessible, if developer wants
    
                        if(this.serverSideOptions.deleteScriptOnComplete){
                            
                            document.head.removeChild(hydrationScript);
                        }
                    } else {

                        console.error("You rejected this server side hydration data being parsed");
                    }
                } catch(err){

                    console.error(err);
                    console.error(`Ran into an issue parsing info for data key: ${this.serverSideOptions.dataKey}`);
                    console.log("Confirm the structure is okay.");
                }
            } else {
                
                console.error(`Failed to read full info from hydration script for data key: ${this.serverSideOptions.dataKey}`)
                console.warn(`Confirm info was provided and already processed server-side data for the data manager ${this.id}`);
            }
        } else {

            console.error("DATA MANAGER: Initializing server-side data but no hydration script provided");
        }
    }

    bindLifecycleObject(){

        //Cancels all calls if destroyed. Otherwise, runs
        //FOR VIEWS, will have "destroyNetworkPolicy. Add later"
        //No longer needed tbh. i.e for cancelling remote requests. Just cancels pipelines. YES.
        //TRIGGER ALL PIPELINES TO CANCEL
        //Server load in pipeline as well now
        this.primaryLifecycleObject.registerLifeCycleListeners({

            onFragmentRunning: () => { /* Redundant. Fragment will be running when this happens */ },
            onFragmentCancelled: () => { /* Also redundant */ },
            onFragmentDestroyed: () => {

                //DO NOT CLEAR CURRENT MODELS LIST
                //Allow asynchronous mutations permitted to run network only to run and complete (especially getting oldModel)
                //Then, all resources freed
                this.cancelAllDataOperations(true);
            }
        });
    }

    cancelAllDataOperations(overrideBuildOnlyOnDestroy){

        if(this.serverSideDataLoadPipeline){

            this.serverSideDataLoadPipeline.cancelServerSideLoad({ apiOptions: this.masterAPIOptions });
            this.serverSideDataLoadPipeline = null;
        } else {

            //Cancel all other pipelines
            //Doing this cause serverSideDataLoad pipeline mutually excludes the rest
            //Trigger pipelines based on running activities or buildIds.

            //Upload
            if(this.uploadDataPipeline){
                
                this.uploadDataPipeline.cancelDataUpload(null, null, true, overrideBuildOnlyOnDestroy ? overrideBuildOnlyOnDestroy : this.maintainNetworkOnFlushAll_Global ? this.maintainNetworkOnFlushAll_Global : this.maintainNetworkOnFlushAll_Specific?.upload);
            }
            
            //Load new
            if(this.loadNewDataPipeline){
                
                this.loadNewDataPipeline.cancelNewDataLoad(null, null, true, overrideBuildOnlyOnDestroy);
            }
            
            //Update
            if(this.updateDataPipeline){
                
                this.updateDataPipeline.cancelDataUpdate(null, null, true, overrideBuildOnlyOnDestroy ? overrideBuildOnlyOnDestroy : this.maintainNetworkOnFlushAll_Global ? this.maintainNetworkOnFlushAll_Global : this.maintainNetworkOnFlushAll_Specific?.update);
            }

            //Delete
            if(this.deleteDataPipeline){
                
                this.deleteDataPipeline.cancelDataDelete(null, null, true, overrideBuildOnlyOnDestroy ? overrideBuildOnlyOnDestroy : this.maintainNetworkOnFlushAll_Global ? this.maintainNetworkOnFlushAll_Global : this.maintainNetworkOnFlushAll_Specific?.delete);
            }
        }

        //data records stamp should NOT be DataManager._RECORDS_AFTER_LIFECYCLE_DETACH_OR_FLUSH_ALL before this operation
        //Otherwise, expect errors
        const clearDataOperationsRecords = () => {

            if(!this.getValidDataOperationsStack(this.dataRecordsStamp).isEmpty()){

                //Merge any existing in this stamp to flushAll or lifecycle entries
                this.getValidDataOperationsStack(DataManager._RECORDS_AFTER_LIFECYCLE_DETACH_OR_FLUSH_ALL).mergeWith(this.getValidDataOperationsStack(this.dataRecordsStamp));
            }

            //Delete the entry to this stamp completely
            this.dataOperationsRecords.delete(this.dataRecordsStamp);

            //By default, set stamp to this value. Flush all will generate a new one
            this.dataRecordsStamp = DataManager._RECORDS_AFTER_LIFECYCLE_DETACH_OR_FLUSH_ALL;
        }

        clearDataOperationsRecords();
    }

    /**
     * @deprecated
     * PUT IN PIPELINE THAT CAN BE CANCELLED
     * @returns {Promise<void>}
     */
    async loadServerSideData(){

        return new Promise((resolve, reject) => {

            if(this.masterAPIOptions.serverSide && this.masterAPIOptions.serverSide.buildFromServerSide){

                
                this.serverSideDataLoadPipeline = new LoadServerSidePipelineWorker(null);
                this.serverSideDataLoadPipeline.initServerSideLoad({
    
                    apiOptions: this.masterAPIOptions,
                    setScopedAPIOption: (scope, paginationOptions) => {
    
                        this.masterWorkingModel.scopedOptions.apis[scope] = {
    
                            ...this.masterWorkingModel.scopedOptions.apis[scope],
                            pagination: paginationOptions
                        }
                    },
                    createModelsCb: (models) => {
        
                        const newModelIDs = this.bulkCreateModels(models, { skipViewHooks: true });
                        /**
                         * @type {import("DataManager").CommitBulkModelOptions<M>[]}
                         */
                        const commitOptions = [];
                        newModelIDs.forEach((id) => {
    
                            commitOptions.push({
    
                                modelID: id,
                                scope: "MODEL_ROOT",
                                orderedArrayIndices: null
                            });
                        });
                        this.commitBulkModels(commitOptions);
                    },
                    mainCb: () => {
    
                        //No longer needed
                        this.serverSideDataLoadPipeline = null;
                        resolve();
                    }
                });
            } else {

                resolve();
            }
        });

    }

    /**
     * @deprecated
     */
    initViewManagersInWait(){

        if(this.viewManagersPendingInit.length > 0){

            this.viewManagersPendingInit.forEach((managerInfo) => {

                managerInfo.manager.initViewManager(managerInfo.initArgs);
            });

            this.viewManagersPendingInit.clear();
        }
    }

    static get _HYDRATOR_SCRIPT_ID(){

        return "data-manager-hydrator";
    }

    /**
     * @type {import("DataManager").DataManagerConstructor<*>['_SERVER_SIDE_PASSED']}
     */
    static get _SERVER_SIDE_PASSED(){
        
        return "SERVER_SIDE_PASSED";
    }

    /**
     * @deprecated
     */
    static get _SERVER_SIDE_DATA_ATTRS(){

        return {

            pagination: {

                attrPaginationEnd: "pgn-e",
                attrNextPageMarker: "pgn-c",
            },
            loadImmediatelyOverride: {

                attrLoadMoreImmediatelyAfterServerSide: "load_more_immediately_after"
            },
            values: {

                true: "1",
                false: "0"
            }
        }
    }

    /**
     * @type {import("DataManager").DataManagerConstructor<*>['_SCOPED_ARRAY_LITERAL']}
     */
    static get _SCOPED_ARRAY_LITERAL(){

        return "array";
    }

    /**
     * @type {import("DataManager").DataManagerConstructor<*>['_ARRAY_SELF_TYPE']}
     */
    static get _ARRAY_SELF_TYPE(){

        return "selfType";
    }

    /**
     * @type {import("DataManager").DataManagerConstructor<*>['_NESTED_SCOPE_KEY_SPLITTER']}
     */
    static get _NESTED_SCOPE_KEY_SPLITTER(){

        return ".";
    }

    /**
     * @type {import("DataManager").DataManagerConstructor<*>['_MODEL_ROOT_SCOPE']}
     */
    static get _MODEL_ROOT_SCOPE(){

        return "MODEL_ROOT";
    }

    /**
     * @type {import("DataManager").DataManagerConstructor<*>['_CANCELLED_DATA_OP']}
     */
    static get _CANCELLED_DATA_OP(){

        return "Cancelled";
    }

    static get _RECORDS_AFTER_LIFECYCLE_DETACH_OR_FLUSH_ALL(){

        return "_LIFECYCLE_DETACHED_OR_FLUSH_ALL_RECORDS";
    }
    
    /**
     * For data uploads
     * 
     * @type {DataManagerInstance<M>['setDataLoadAPI']}
     */
    setDataUploadAPI(addr, scope){

        this.masterWorkingModel.scopedOptions.apis[scope].upload = addr;
    }

    /**
     * For data loads
     * 
     * @type {DataManagerInstance<M>['setDataLoadAPI']}
     */
    setDataLoadAPI(addr, scope){

        this.masterWorkingModel.scopedOptions.apis[scope].loadNew = addr;
    }

    /**
     * For data updates
     * 
     * @type {DataManagerInstance<M>['setDataUpdateAPI']}
     */
    setDataUpdateAPI(addr, scope){

        this.masterWorkingModel.scopedOptions.apis[scope].update = addr;
    }

    /**
     * For data deletes
     * 
     * @type {DataManagerInstance<M>['setDataDeleteAPI']}
     */
    setDataDeleteAPI(addr, scope){

        this.masterWorkingModel.scopedOptions.apis[scope].delete = addr;
    }

    /**
     * 
     * @type {DataManagerInstance<M>['setDataWatcher']} 
     */
    setDataWatcher(scope, viewManager){

        viewManager.getLifeCycleInstance().registerLifeCycleListeners({

            onFragmentCancelled: () => {},
            onFragmentRunning: () => {},
            onFragmentDestroyed: () => {

                if(this.masterWorkingModel.dataWatchers[scope]){

                    this.masterWorkingModel.dataWatchers[scope].viewManagers.splice(
                        this.masterWorkingModel.dataWatchers[scope].viewManagers.findIndex((manager) => manager.id === viewManager.id),
                        1
                    );
                }
            }
        });

        this.masterWorkingModel.dataWatchers[scope] = {

            viewManagers: this.masterWorkingModel.dataWatchers[scope] && this.masterWorkingModel.dataWatchers[scope].viewManagers ? this.masterWorkingModel.dataWatchers[scope].viewManagers.concat([viewManager]) : [viewManager]
        }
    }

    /**
     * Uploading data NOT in model using the upload data API address - READ MORE
     * 
     * Update spec to loadData, such that for scope lower than MODEL_ROOT, we don't create a new model.
     * instead, we'll just update the existing
     * 
     * @type {DataManagerInstance<M>['uploadNewData']}
     * 
     */
    uploadNewData(newData, options, scope, mappedDataId, overrideNetworkInterface, overrideUploadAddr, overrideNetworkInterfaceScope){

        //Add data to model
        let modelID = "";
        if(scope === "MODEL_ROOT"){

            modelID = this.createModel(newData, { skipViewHooks: true }); //Skipping to use normal flow
        } else {

            const partialModel = {};
            this.spawnPartialShellModel(scope, newData, partialModel, mappedDataId); //partial model was literal {}
            modelID = this.createModel(partialModel, { skipViewHooks: true });
        }
        const reqAddr = overrideUploadAddr ? overrideUploadAddr : this.masterWorkingModel.scopedOptions.apis[scope].upload;

        return new Promise((resolve, reject) => {

            this.requestDataUpload(modelID, options, scope, newData, mappedDataId, reqAddr, "uploadNew", overrideNetworkInterface, overrideNetworkInterfaceScope).then((success) => {

                resolve(success);
            }).catch((err) => {

                //Delete from model. Direct cause viewManagers already told
                this.deleteCompleteModel(modelID);
                reject(err);
            });
        });
    }

    /**
     * 
     * @type {DataManagerInstance<M>['uploadDataInModel']} 
     */
    uploadDataInModel(modelID, options, scope, newData, mappedDataId, overrideNetworkInterface, overrideUploadAddr, overrideNetworkInterfaceScope){

        return this.requestDataUpload(modelID, options, scope, newData, mappedDataId, overrideUploadAddr ? overrideUploadAddr : this.masterWorkingModel.scopedOptions.apis[scope].upload, "upload", overrideNetworkInterface, overrideNetworkInterfaceScope);
    }

    /**
     * @template {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']} ReqScope
     * @param {string} modelID 
     * @param {SendDataOptions} options 
     * @param {ReqScope} scope 
     * @param {ValueTypeOfNested<M, ReqScope>} newData 
     * @param {string} mappedDataId 
     * @param {string} reqAddr 
     * @param {DataManagerMutations} requestedMutation 
     * @param {import("DataManager").DataOperationsNetworkInterface<ValueTypeOfNested<M, ReqScope>, ReqScope>} [overrideNetworkInterface]
     * @param {NestedParentKeysOf<M, ReqScope>} [overrideNetworkInterfaceScope]
     * @returns {Promise<import("DataManager").DataOperationMsg<ValueTypeOfNested<M, ReqScope>>>}
     */
    requestDataUpload(modelID, options, scope, newData, mappedDataId, reqAddr, requestedMutation, overrideNetworkInterface, overrideNetworkInterfaceScope){

        //Get the current stamp. Useful for checking if flushAll event has occured thus delayed start of mutation
        //due to promise generation and execution cycle, should run in appropriate cancellation mode
        const oldModel = this.getModel(modelID);
        //Scope data correctly if override
        newData = this.getNewDataScopedToRequest(overrideNetworkInterfaceScope, scope, newData, mappedDataId);
        const finalScope = overrideNetworkInterfaceScope ? overrideNetworkInterfaceScope : scope;
        const oldData = this.getScopedModel(finalScope, mappedDataId, modelID, false);
        return this.runDataMutation(requestedMutation, scope, modelID, newData, options, mappedDataId, (operationStatus, runNonNetworkCancel, comparator) => {

            //Do upload
            return new Promise(async (resolve, reject) => {
    
                if(operationStatus.operable){
                    
                    this.uploadDataPipeline.uploadNewData({
    
                        //Provide oldCompleteModel here
                        oldCompleteModel: oldModel,
                        cancelBuildOnly_ByPassNonNetwork: runNonNetworkCancel,
                        dataMutation: requestedMutation,
                        apiOptions: this.masterAPIOptions,
                        scope: finalScope,
                        originalScope: scope,
                        mappedDataId: mappedDataId,
                        oldData: oldData,
                        newData: newData,
                        options: options,
                        dataMutationAPI: reqAddr,
                        _get_not_orderedViewManagers: () => { return comparator.ofViews() },
                        modelID_s: modelID,
                        /**
                         * @param {string} id Only expect one id here
                         */
                        mutationStateUpdate: (mutationState, id, APIScope, model) => {
    
                            const targetModel = this.masterWorkingModel.masterModels.find((model) => model.modelID === id);
                            if(!targetModel){
    
                                console.error("CRITICAL DATA MANAGER ERROR: Target model not found while ongoing mutation")
                                return;
                            }
    
                            if(APIScope === "MODEL_ROOT"){
                                
                                targetModel.data.temp.master.state = mutationState;
                            } else {
    
                                targetModel.data.temp.scoped[APIScope].state = mutationState;
                            }
    
                            if(mutationState === "onMutate"){
    
                                //Tell observers request has started
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqStart(reqAddr, requestedMutation, scope);
                                });
                            } else if(mutationState === "onCommit"){
    
                                this.overwriteModel(id, model, APIScope);
                                this.commitModel(id, APIScope, this.getOrderedArrayIndicesForMappedDataId(APIScope, mappedDataId));
    
                                //Tell observers
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqEnd(reqAddr, requestedMutation, scope);
                                });
                            } else if(mutationState === "complete"){
    
                                //Tell view manager watchers
                                //Doing this so that they're the last to get updates
                                if(this.masterWorkingModel.dataWatchers[APIScope]){
    
                                    this.masterWorkingModel.dataWatchers[APIScope].viewManagers.forEach((manager) => {
    
                                        manager.onExternalWatchCommit(requestedMutation, model, null);
                                    });
                                }
                            } else if(mutationState === "onError"){
    
                                //Tell observers. They don't respect skipUIHooks? Yes.
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqErr(reqAddr, requestedMutation, scope);
                                });
                            } else if(mutationState === "onCancel"){
    
                                //HANDLE CANCELLATIONS
                                //Tell observers
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqCancel(reqAddr, requestedMutation, scope);
                                });
                            }
                        },
                        completeCb: (modelID, scope, finalModel, err, overrideScopeCommitModel) => {
    
                            if(!err){
    
                                //Update watchers. Makes sense here. Sure pipeline is done correctly
                                this.updateWatchers(requestedMutation, scope, finalModel, null);
                                //Resolve if no error
                                resolve({
        
                                    committedModel: finalModel !== undefined ? structuredClone(finalModel) : null,
                                    overrideScopeCommitModel: overrideScopeCommitModel !== undefined ? structuredClone(overrideScopeCommitModel) : null,
                                    requestedMutation: requestedMutation,
                                    previousMutation: operationStatus.previousMutation,
                                    status: "invoked",
                                    msg: "Mutation invoked and completed."
                                });
                            } else {
    
                                reject(err);
                            }
                        },
                        networkInterface: overrideNetworkInterface ? overrideNetworkInterface : this.masterWorkingModel.scopedOptions.apis[finalScope].networkInterface
                    });
                } else {
    
                    //Failed. Tell of failure
                    reject({
    
                        requestedMutation: requestedMutation,
                        previousMutation: operationStatus.previousMutation,
                        status: "denied",
                        msg: operationStatus.msg//"Mutation denied. Waiting for ongoing mutation on this model to complete"
                    });
                }
            });
        });
    }

    /**
     * @type {DataManagerInstance<M>['loadData']}
     */
    loadData(requestScope, scopedInfo, options, overrideNetworkInterface, overrideLoadNewAddr){

        const scope = requestScope;
        const currentRecordsStamp = this.dataRecordsStamp;
        //mappedDataId being ignored cause scope of load will be to list, not list member (where mappedDataId counts)
        /**
         * @todo implement new mappedDataId spec to allow per list member asynchronous mutations for non MODEL_ROOT scopes
         */
        const oldModel = scopedInfo?.modelID ? this.getModel(scopedInfo.modelID) : null;
        return this.runDataMutation("loadNew", scope, scopedInfo ? scopedInfo.modelID : DataManager._MODEL_ROOT_SCOPE, null, options, null, (operationStatus, runNonNetworkCancel, comparator) => {

            //Do the loading
            return new Promise(async (resolve, reject) => {
                
                if(operationStatus.operable){
    
                    this.loadNewDataPipeline.loadNewData({
                        
                        scope: scope,
                        originalScope: scope,
                        oldData: null,
                        oldCompleteModel: oldModel,
                        modelID_s: scopedInfo?.modelID,
                        dataMutation: "loadNew",
                        dataMutationAPI: overrideLoadNewAddr ? overrideLoadNewAddr : this.masterWorkingModel.scopedOptions.apis[scope]?.loadNew, //for scope can be undefined cause can be paginator. So, implemented in loadNew only
                        apiOptions: this.masterAPIOptions,
                        options: options,
                        mappedDataId: scopedInfo?.mappedDataId,
                        _get_not_orderedViewManagers: () => { return comparator.ofViews() },
                        networkInterface: overrideNetworkInterface ? overrideNetworkInterface : this.masterWorkingModel.scopedOptions.apis[scope].networkInterface,
                        loadNewMutationStateCb: (mutationState, finalData, commitCompleteCB) => {
        
                            if(mutationState === "onCommit"){
        
                                if(scope === DataManager._MODEL_ROOT_SCOPE){
        
                                    //Dealing with edge cases where you are paginating, end of data
                                    //So, response 200 with no data however
                                    if(finalData){

                                        //create and commit the bulk models
                                        if(Array.isArray(finalData) && finalData.length){ //last check to ensure we don't commit an empty array
            
                                            const modelIDs = this.bulkCreateModels(finalData, { skipViewHooks: true });
                                            modelIDs.forEach((id) => {
            
                                                this.commitModel(id, scope, null);
                                            });
                                            commitCompleteCB(modelIDs);
                                        } else {
            
                                            const modelID = this.createModel(finalData, { skipViewHooks: true });
                                            this.commitModel(modelID, scope, null);
                                            commitCompleteCB(modelID);
                                        }
                                    } else {

                                        commitCompleteCB(null);
                                    }
                                } else {
        
                                    this.overwriteModel(scopedInfo.modelID, finalData, scope);
                                    this.commitModel(scopedInfo.modelID, scope, this.getOrderedArrayIndicesForMappedDataId(scope, scopedInfo.mappedDataId));
                                    commitCompleteCB(scopedInfo.modelID);
                                }
                            }
                        },
                        loadNewCompleteCb: (loadedData, err) => {
        
                            if(err){
        
                                reject(err);
                            } else {
    
                                loadedData = structuredClone(loadedData);
                                this.updateWatchers("loadNew", scope, loadedData, null);
                                resolve({
        
                                    committedModel: loadedData ? structuredClone(loadedData) : null,
                                    requestedMutation: "loadNew",
                                    previousMutation: operationStatus.previousMutation,
                                    status: "invoked",
                                    msg: "Mutation invoked and completed.",
                                    modelId: scopedInfo?.modelID,
                                    mappedDataId: null
                                });
                            }
                        }
                    });
                } else {
    
                    //Failed. Tell of failure
                    reject({
    
                        requestedMutation: "loadNew",
                        previousMutation: operationStatus.previousMutation,
                        status: "denied",
                        msg: operationStatus.msg//"Mutation denied. Waiting for ongoing mutation on this model to complete"
                    });
                }
            });
        });
    }

    /**
     * overrideNetworkInterface allows developer to pass data in more specific scope, but have it balooned to 
     * the one provided network interface scope. Just makes life easier.
     * @type {DataManagerInstance<M>['updateModel']}
     */
    updateModel(scope, modelID, newData, mappedDataId, options, overrideNetworkInterface, overrideUpdateAddr, overrideNetworkInterfaceScope, mutationStartCb){

        const oldModel = this.getModel(modelID);
        //Scope data correctly if override
        newData = this.getNewDataScopedToRequest(overrideNetworkInterfaceScope, scope, newData, mappedDataId);
        const finalScope = overrideNetworkInterfaceScope ? overrideNetworkInterfaceScope : scope;
        const updateAddr = overrideUpdateAddr ? overrideUpdateAddr : this.masterWorkingModel.scopedOptions.apis[finalScope].update;
        const oldData = this.getScopedModel(finalScope, mappedDataId, modelID, false);

        return this.runDataMutation("update", scope, modelID, newData, options, mappedDataId, (operationStatus, runNonNetworkCancel, comparator) => {

            //Now, do the update
            //Doesn't create new models since update is for existing
            return new Promise(async (resolve, reject) => {
    
                if(operationStatus.operable){
    
                    this.updateDataPipeline.updateData({
                        
                        scope: finalScope,
                        originalScope: scope,
                        modelID_s: modelID,
                        //Provide oldCompleteModel here
                        oldCompleteModel: oldModel,
                        newData: newData,
                        oldData: oldData,
                        dataMutation: "update",
                        //Goes straight to cancel mode
                        cancelBuildOnly_ByPassNonNetwork: runNonNetworkCancel,
                        dataMutationAPI: updateAddr,
                        apiOptions: this.masterAPIOptions,
                        options: options,
                        mappedDataId: mappedDataId,
                        _get_not_orderedViewManagers: () => { return comparator.ofViews() },
                        /**
                         * @param {string} id Only expect one id here
                         * NOTE: APIScope is the finalScope.
                         */
                        mutationStateUpdate: (mutationState, id, APIScope, model) => {
    
                            const targetModel = this.masterWorkingModel.masterModels.find((model) => model.modelID === id);
                            if(!targetModel){
    
                                console.error("CRITICAL DATA MANAGER ERROR: Target model not found while ongoing mutation")
                                return;
                            }
    
                            if(mutationState !== "complete"){
    
                                if(APIScope === "MODEL_ROOT"){
                                    
                                    targetModel.data.temp.master.state = mutationState;
                                } else {
        
                                    targetModel.data.temp.scoped[APIScope].state = mutationState;
                                }
                            }
    
                            if(mutationState === "onMutate"){
    
                                //Tell observers request has started
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqStart(updateAddr, "update", scope);
                                });
                            } else if(mutationState === "onCommit"){
    
                                //FLUSHING MODEL OLD AFTER UI HOOKS HAVE BEEN CALLED
                                //SO, TOMORROW - BETTER FLOW FOR UI HOOKS, FLUSH AFTER. ERROR WITH OPTION TO SHOW ERROR UI THROUGH VIEW MANAGER 
                                //FOR NODE WITH MODEL ID USING RESPONSE AND MUTATION (FIGURE OUT HOW TO DO IT). IF RETRY, CHOOSE TO REINVOKE 
                                //BUILD START HOOK FOR MUTATION? MAYBE.
                                //Deal with the error UI yourself. Putting it and removing it
                                //DON'T USE THE APIScope. Use the originalScope
                                //Sort it out in the pipeline actually
                                this.overwriteModel(id, model, APIScope);
                                this.commitModel(id, APIScope, this.getOrderedArrayIndicesForMappedDataId(APIScope, mappedDataId));
    
                                //Tell observers
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqEnd(updateAddr, "update", scope);
                                });
                            } else if(mutationState === "complete"){
    
                                //Tell view manager watchers
                                //Doing this so that they're the last to get updates
                                if(this.masterWorkingModel.dataWatchers[APIScope]){
    
                                    this.masterWorkingModel.dataWatchers[APIScope].viewManagers.forEach((manager) => {
    
                                        manager.onExternalWatchCommit("update", model, null);
                                    });
                                }
                            } else if(mutationState === "onError"){
    
                                //Tell observers. They don't respect skipUIHooks? Yes.
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqErr(updateAddr, "update", scope);
                                });
                            } else if(mutationState === "onCancel"){
    
                                //HANDLE CANCELLATIONS
                                //Tell observers
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqCancel(updateAddr, "update", scope);
                                });
                            }
                        },
                        completeCb: (modelID, scope, finalModel, err, overrideScopeCommitModel) => {
    
                            //Operation done. Remove from data operations stack after resolving
                            if(!err){
    
                                //Update watchers. Makes sense here. Sure pipeline is done correctly
                                this.updateWatchers("update", scope, finalModel, null);
                                //Resolve if no error
                                resolve({
        
                                    committedModel: finalModel !== undefined ? structuredClone(finalModel) : null,
                                    overrideScopeCommitModel: overrideScopeCommitModel !== undefined ? structuredClone(overrideScopeCommitModel) : null,
                                    requestedMutation: "update",
                                    previousMutation: operationStatus.previousMutation,
                                    status: "invoked",
                                    msg: "Mutation invoked and completed.",
                                    modelId: modelID,
                                    mappedDataId: mappedDataId
                                });
                            } else {
    
                                reject(err);
                            }
                        },
                        networkInterface: overrideNetworkInterface ? overrideNetworkInterface : this.masterWorkingModel.scopedOptions.apis[finalScope].networkInterface,
                    });
                    mutationStartCb ? mutationStartCb() : null;
                } else {
    
                    //Failed. Tell of failure
                    reject({
    
                        requestedMutation: "update",
                        previousMutation: operationStatus.previousMutation,
                        status: "denied",
                        msg: operationStatus.msg//"Mutation denied. Waiting for ongoing mutation on this model to complete"
                    });
                }
            });
        });
    }

    /**
     * Directly commits - but ensure integrity despite being non-network?. So, run well
     * @type {DataManagerInstance<M>['silentUpdateModel']}
     */
    silentUpdateModel(scope, modelID, newData, updateUI = false, mappedDataId){

        const model = this.getModel(modelID);
        /**
         * @type {Partial<M>}
         */
        const oldModel = structuredClone(model);
        return this.runDataMutation("update", scope, modelID, newData, { skipViewHooks: !updateUI }, mappedDataId, (operationStatus, runNonNetworkCancel, comparator) => {

            return new Promise((resolve, reject) => {

                //Doesn't use network. So, runs only if operable and not a nonNetworkCancel
                if(operationStatus.operable && !runNonNetworkCancel){

                    if(model){

                        this.overwriteModel(modelID, newData, scope);
                        this.commitModel(modelID, scope, this.getOrderedArrayIndicesForMappedDataId(scope, mappedDataId));
                
                        if(updateUI){
                
                            this.getAllViewManagersForScope(scope).forEach((manager) => {
                
                                manager.onCommit("update", newData, this.getScopedModelFromRef(scope, this.getOrderedArrayIndicesForMappedDataId(scope, mappedDataId), oldModel, false), mappedDataId, modelID, scope, scope, () => {});
                            });
                        }
                
                        //Trigger updates for views in scope
                        resolve({
        
                            committedModel: this.getModel(modelID),
                            requestedMutation: "update",
                            previousMutation: operationStatus.previousMutation,
                            status: "invoked",
                            msg: "Silent Update Mutation invoked and completed.",
                            modelId: modelID,
                            mappedDataId: mappedDataId
                        });
                    } else {
            
                        console.error(`FAILED TO SILENT UPDATE. Model with model ${modelID} not found. Update value:`)
                        reject(`FAILED TO SILENT UPDATE. Model with model ${modelID} not found. Update value: ${newData}`);
                    }
                } else {

                    reject(`FAILED TO SILENT UPDATE. Flush all event happened or host lifecycle destroyed\n. Msg: ${operationStatus.msg}`);
                }
            });
        });
    }

    /**
     * @type {DataManagerInstance<M>['deleteData']}
     */
    deleteData(scope, modelId, mappedDataId, options, overrideNetworkInterface, overrideDeleteAddr, overrideNetworkInterfaceScope, newData){

        const oldModel = this.getModel(modelId);
        //Scope data correctly if override
        newData = newData ? this.getNewDataScopedToRequest(overrideNetworkInterfaceScope, scope, newData, mappedDataId) : newData;
        const finalScope = overrideNetworkInterfaceScope ? overrideNetworkInterfaceScope : scope;
        const oldData = this.getScopedModel(finalScope, mappedDataId, modelId, false);
        /**
         * @type {string}
         */
        const deleteAddr = overrideDeleteAddr ? overrideDeleteAddr : this.masterWorkingModel.scopedOptions.apis[finalScope].delete;
        return this.runDataMutation("delete", scope, modelId, newData, options, mappedDataId, (operationStatus, runNonNetworkCancel, comparator) => {

            //Now, do the update
            //Doesn't create new models since update is for existing
            return new Promise(async (resolve, reject) => {
    
                if(operationStatus.operable){

                    this.deleteDataPipeline.deleteData({
                        
                        scope: finalScope,
                        originalScope: scope,
                        modelID_s: modelId,
                        //Provide oldCompleteModel here
                        oldCompleteModel: oldModel,
                        newData: newData,
                        oldData: oldData,
                        dataMutation: "delete",
                        //Goes straight to cancel mode
                        cancelBuildOnly_ByPassNonNetwork: runNonNetworkCancel,
                        dataMutationAPI: deleteAddr,
                        apiOptions: this.masterAPIOptions,
                        options: options,
                        mappedDataId: mappedDataId,
                        _get_not_orderedViewManagers: () => { return comparator.ofViews() },
                        /**
                         * @param {string} id Only expect one id here
                         * APIScope is the original scope
                         */
                        mutationStateUpdate: (mutationState, id, APIScope, model) => {
    
                            const targetModel = this.masterWorkingModel.masterModels.find((model) => model.modelID === id);
                            if(!targetModel && mutationState !== "complete"){
    
                                console.error("CRITICAL DATA MANAGER ERROR: Target model not found while ongoing mutation")
                                return;
                            }
    
                            if(mutationState !== "complete"){
    
                                if(APIScope === "MODEL_ROOT"){
                                    
                                    targetModel.data.temp.master.state = mutationState;
                                } else {
        
                                    targetModel.data.temp.scoped[APIScope].state = mutationState;
                                }
                            }
    
                            if(mutationState === "onMutate"){
    
                                //Tell observers request has started
                                //THIS SHOULD USE THE finalScope that the APIOptions is running
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqStart(deleteAddr, "delete", scope);
                                });
                            } else if(mutationState === "onCommit"){
    
                                //FLUSHING MODEL OLD AFTER UI HOOKS HAVE BEEN CALLED
                                //Deal with the error UI yourself. Putting it and removing it
                                if(scope === DataManager._MODEL_ROOT_SCOPE){

                                    //delete this model
                                    this.deleteCompleteModel(modelId);
                                } else {

                                    this.overwriteModel(id, model, APIScope);
                                    this.commitModel(id, APIScope, this.getOrderedArrayIndicesForMappedDataId(APIScope, mappedDataId));
                                }
    
                                //Tell observers
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqEnd(deleteAddr, "delete", scope);
                                });
                            } else if(mutationState === "complete"){
    
                                //Tell view manager watchers
                                //Doing this so that they're the last to get updates
                                if(this.masterWorkingModel.dataWatchers[APIScope]){
    
                                    this.masterWorkingModel.dataWatchers[APIScope].viewManagers.forEach((manager) => {
    
                                        manager.onExternalWatchCommit("delete", model, null);
                                    });
                                }
                            } else if(mutationState === "onError"){
    
                                //Tell observers. They don't respect skipUIHooks? Yes.
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqErr(deleteAddr, "delete", scope);
                                });
                            } else if(mutationState === "onCancel"){
    
                                //HANDLE CANCELLATIONS
                                //Tell observers
                                this.informObserversOfMutationState(scope, (observer) => {
    
                                    observer.onReqCancel(deleteAddr, "delete", scope);
                                });
                            }
                        },
                        completeCb: (modelID, scope, finalModel, err, overrideScopeCommitModel) => {
    
                            //Operation done. Remove from data operations stack after resolving
                            if(!err){
    
                                //Update watchers. Makes sense here. Sure pipeline is done correctly
                                this.updateWatchers("delete", scope, finalModel, null);
                                //Resolve if no error
                                resolve({
        
                                    committedModel: finalModel !== undefined ? structuredClone(finalModel) : null,
                                    overrideScopeCommitModel: overrideScopeCommitModel !== undefined ? structuredClone(overrideScopeCommitModel) : null,
                                    requestedMutation: "delete",
                                    previousMutation: operationStatus.previousMutation,
                                    status: "invoked",
                                    msg: "Mutation invoked and completed."
                                });
                            } else {
    
                                reject(err);
                            }
                        },
                        networkInterface: overrideNetworkInterface ? overrideNetworkInterface : this.masterWorkingModel.scopedOptions.apis[finalScope].networkInterface,
                    });
                } else {
    
                    //Failed. Tell of failure
                    reject({
    
                        requestedMutation: "delete",
                        previousMutation: operationStatus.previousMutation,
                        status: "denied",
                        msg: operationStatus.msg
                    });
                }
            });
        })
    }

    /**
     * @template {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']} ReqScope
     * @template {NestedParentKeysOf<M, ReqScope>} OverrideScope
     * 
     * @param {OverrideScope} overrideNetworkInterfaceScope 
     * @param {ReqScope} scope
     * @param {ValueTypeOfNested<M, ReqScope>} newData
     * @param {string} mappedDataId
     * 
     * @returns {ValueTypeOfNested<M, ReqScope> | ValueTypeOfNested<M, OverrideScope>}
     */
    /**
     * 
     * @type {DataManagerInstance<M>['getNewDataScopedToRequest']}
     */
    getNewDataScopedToRequest(targetScope, currentScope, newData, mappedDataId){

        if(targetScope){

            if(currentScope !== DataManager._MODEL_ROOT_SCOPE){

                //Spawn a partial shell
                //Then narrow it to overrideNetworkInterface scope
                const holder = {};
                //Create a partial starting from root
                this.spawnPartialShellModel(currentScope, newData, holder, mappedDataId);
                //Reduce that partial's value to the override scope, so reduction in view managers can work well.
                newData = this.getScopedModelFromRef(targetScope, this.getOrderedArrayIndicesForMappedDataId(currentScope, mappedDataId), holder, false);
            } else {

                //Just reduce to overrideNetworkInterfaceScope
                newData = this.getScopedModelFromRef(targetScope, this.getOrderedArrayIndicesForMappedDataId(currentScope, mappedDataId), newData, false);
            }
        }

        return newData;
    }

    /**
     * A helper method to ensure all mutations follow a basic or given flow for mutation execution. 
     * Help homogenize future updates, and better trace mutation errors, on a global scope
     * 
     * FOR SCOPE: Always ensure it is the original scope to ensure data integrity passes are done well
     * Now including mappedDataId per scope to cover for individual array changes, and make them asynchronous
     * 
     * @todo ABOVE HAS A PROBLEM cause we can't trace a mapped data id to an individual view manager
     * to avoid side effects. However, I have a solution. For later (use uniqueIds - auto generated)
     * 
     * Because of the override scope and how it affects data access, onDataLoadPostProcess can allow you to 
     * sort of commit extra data to this scope. However, code disallows this by using original scope (before,
     * found it out by bug where MODEL_ROOT scope temp was null. Thus merge to old failed.)
     * 
     * Now, algo STRICTLY commit to original scope. So, allow free use of override to avoid writing same API options
     * severally. For extra data you want to commit that comes from server, silent update once 
     * 
     * @type {import("DataManager").runDataMutation<M>}
     */
    async runDataMutation(mutation, scope, modelID, newData, options, mappedDataId, mutationRunner){

        //Get the current stamp. Useful for checking if flushAll event has occured thus delayed start of mutation
        //due to promise generation and execution cycle, should run in appropriate cancellation mode
        const currentRecordsStamp = this.dataRecordsStamp;

        //start accepting mappedDataId and add to scope if provided, to scope operations. Reject appropriately
        //i.e if same mappedDataId or model root (no mapped id) or mappedDataId from different view manager (using unique id) => reject
        
        return new Promise(async (resolve, reject) => {
            
            let operationStatus = null;
            let runNonNetworkCancel = false;
            operationStatus = await this.preProcessDataOperation(currentRecordsStamp, modelID, mutation, scope, newData, options.skipViewHooks, mappedDataId);
            //After the asynchronous event above, flushAll event might have happened. Check here
            const flushAllEventHasHappened = currentRecordsStamp !== this.dataRecordsStamp || this.dataRecordsStamp === DataManager._RECORDS_AFTER_LIFECYCLE_DETACH_OR_FLUSH_ALL;
            //Trigger operations based on flushAllEvent policies
            //Enforced here is that loadNew is always denied
            if(flushAllEventHasHappened){
    
                const specificPolicy = mutation === "delete" ? this.maintainNetworkOnFlushAll_Specific?.delete : 
                                            mutation === "update" ? this.maintainNetworkOnFlushAll_Specific?.update :
                                            mutation === "upload" || mutation === "uploadNew" ? this.maintainNetworkOnFlushAll_Specific?.upload :
                                            false;
                //Flush all event has occured. Promise triggered after it and thus should be running correct cancellation procedure
                runNonNetworkCancel = this.maintainNetworkOnFlushAll_Global ? this.maintainNetworkOnFlushAll_Global : specificPolicy;
                operationStatus = { operable: runNonNetworkCancel, previousMutation: operationStatus?.previousMutation };
                //Operates 
            }
    
            //Run the mutation
            let res = null;
            let fail = null;
            try {
    
                res = await mutationRunner(operationStatus, runNonNetworkCancel, this.comparator(scope));
            } catch(err){
                
                fail = err;
            }
            
            //Operation done. Remove from data operations stack
            this.onPostDataOperation(currentRecordsStamp, modelID, scope, mappedDataId);
    
            if(res){

                resolve(res);
            } else {

                reject(fail);
            }
        });
    }

    /**
     * @param {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']} scope
     * @param {genericParamFunction<import("DataManager").NetworkInterfaceObserver<M>>} cb 
     */
    informObserversOfMutationState(scope, cb){

        if(this.masterWorkingModel.scopedOptions.apis[scope]?.observers){

            this.masterWorkingModel.scopedOptions.apis[scope].observers.forEach((observer) => {

                cb(observer);
            });
        }
    }

    /**
     * 
     * @type {DataManagerInstance<M>['bulkCreateModels']}
     */
    bulkCreateModels(newModels, options){

        const newModelIds = [];
        newModels.forEach((model) => {

            newModelIds.push(this.createModel(model, options));
        });

        return newModelIds;
    }

    /**
     * Creates a new model and commits new data to it
     * @type {DataManagerInstance<M>['createModel']}
     * 
     */
    createModel(newData, options = {}){

        const modelID = RandomNumberCharGenUtils.generateRandomNumChar(8);
        this.masterWorkingModel.masterModels.push({

            modelID: modelID,
            data: {

                temp: {

                    master: {
                        
                        data: newData,
                        mutation: "create",
                        state: null,
                        uiSkipped: null
                    },
                    scoped: {}
                },
                //Committing directly, but existence of same temp with create mutation tells its was created
                committed: {}//Object.create(null), - null creating bad reference, especially for silent updates after create, in a non-MODEL_ROOT scope, since using different algos
            },
        });

        //Call view hooks
        if(!options?.skipViewHooks){

            for(let scope in this.masterWorkingModel.scopedOptions.views){

                this.masterWorkingModel.scopedOptions.views[scope].viewManagers.forEach((manager) => {

                    //Passing everything else null because irrelevant. It's a mandatory flush
                    manager.onCommit("create", newData, null, null, modelID, DataManager._MODEL_ROOT_SCOPE, DataManager._MODEL_ROOT_SCOPE, () => {});
                });
            }
        }

        return modelID;
    }

    /**
     * @type {DataManagerInstance<M>['createAndCommitModel']} 
     */
    createAndCommitModel(newData, options){

        const modelID = this.createModel(newData, options);
        this.commitModel(modelID, "MODEL_ROOT", null);
        return modelID;
    }

    /**
     * CHECK WARNING AT COMMIT
     * 
     * So, if working on whole model, to update well, we need an algo change
     * Need to go nest deep. Based on committed
     * Change values only given explicitly in temp
     * 
     * recursive on keys going one level deep, node (no child), go through all keys for it,
     * then return for the parent to finish.
     * 
     * So, depth-first search?*
     * 
     * @type {DataManagerInstance<M>['commitModel']}
     */
    commitModel(modelID, scope, orderedArrayIndices){

        //Our reference
        const model = this.masterWorkingModel.masterModels.find((masterModel) => masterModel.modelID === modelID);

        if(scope === "MODEL_ROOT"){

            this.valueBasedRecursiveObjectMerge(model.data.committed, model.data.temp.master.data, orderedArrayIndices?.copy());

            model.data.temp.master = {

                data: null,
                mutation: null,
                state: null,
                uiSkipped: null
            };
        } else {

            //Committing scoped data is somewhat different. Need to commit well from root to parent. 
            //Basically, get current from root to leaf, add to leaf, commit to main
            model.data.committed = this.mergeScopedDataToModel(model.data.committed, scope, model.data.temp.scoped[scope].data, orderedArrayIndices?.copy());
            model.data.temp.scoped[scope] = null;
        }
    }

    /**
     * ONLY CALL FOR MATCHING OBJECT TYPES, WHERE YOU'RE USING SPREAD OPERATOR TO MERGE VALUES AND PROPERTIES
     * 
     * Merges new model into old model
     * @param {object} oldModel 
     * @param {object} newModel 
     * @param {QueueInstance<number>} orderedArrayIndices
     * @param {boolean} [afterFirstRun]
     */
    valueBasedRecursiveObjectMerge(oldModel, newModel, orderedArrayIndices, afterFirstRun){

        /**
         * @type {object}
         */
        let copyNewModel = newModel;
        if(!afterFirstRun){

            copyNewModel = structuredClone(newModel);
        }
        for(let copyKey in copyNewModel){

            if(typeof copyNewModel[copyKey] === "object" && !Array.isArray(copyNewModel[copyKey])){

                if(oldModel[copyKey] === undefined || oldModel[copyKey] === null){

                    //Direct copy since old model didn't have it
                    oldModel[copyKey] = copyNewModel[copyKey];
                } else {

                    //recursive over new child, but only if the values are different
                    //check helps reduce unnecessary recursion steps
                    //Despite the losses of stringify in complex cases, that's a worthy sacrifice
                    //Might use loadash, but not sure with performance
                    //Developer be aware of this compromise for now
                    /**
                     * @todo
                     */
                    if(JSON.stringify(oldModel[copyKey]) !== JSON.stringify(copyNewModel[copyKey])){

                        this.valueBasedRecursiveObjectMerge(oldModel[copyKey], newModel[copyKey], orderedArrayIndices, true);
                    }
                }
            } else {

                //checking again cause what's here might be an array or primitive/literal
                if(Array.isArray(copyNewModel[copyKey])){

                    //FOR ARRAY. IMPORTANT
                    if(oldModel[copyKey] === undefined || oldModel[copyKey] === null){

                        //Nothing put there before. so, direct copy
                        oldModel[copyKey] = copyNewModel[copyKey];
                    } else {

                        //Account for empty indices. Not doing that led me to a very interesting bug
                        if(!orderedArrayIndices || orderedArrayIndices.length === 0){

                            // No ordered array indices provided. Merging everything to this key. Old data overwritten
                            oldModel[copyKey] = newModel[copyKey];
                        } else {

                            //Work on the indices given, relating to where the mutation was triggered
                            const index = orderedArrayIndices.dequeue();
                            if(!orderedArrayIndices.isEmpty()){
    
                                copyNewModel[copyKey][index] = oldModel[copyKey][index];
                                this.valueBasedRecursiveObjectMerge(oldModel[copyKey][index], copyNewModel[copyKey], orderedArrayIndices, true)
                            } else {
    
                                console.warn("Fun fact. In JavaScript, null >= 0 is true. What in the 💀");
                                //THIS TOOK ME FOUR HOURS BRO!
                                //and yes, the first console is a deliberate warning. Save yourself 💀
                                //now those queue need to spew out undefined. F

                                //This will only happen for indices greater than newModel OR
                                //a specific index in new model that was deleted (changed to null or undefined) after
                                //the delete operation
                                if(index >= 0 && (copyNewModel[copyKey][index] === null || copyNewModel[copyKey][index] === undefined)){
    
                                    //splice this value. It's being deleted
                                    oldModel[copyKey].splice(index, 1);
                                } else {

                                    oldModel[copyKey][index] = copyNewModel[copyKey][index];
                                }
                            }
                        }
                    }
                } else {

                    //Not an array, and not nested. Direct copy
                    oldModel[copyKey] = copyNewModel[copyKey];
                }
            }
        }
    }

    /**
     * 
     * @type {DataManagerInstance<M>['commitBulkModels']}
     */
    commitBulkModels(options){

        options.forEach((option) => {

            this.commitModel(option.modelID, option.scope, null);
        });
    }

    /**
     * Overwrite temp in model to new value
     * 
     * @type {DataManagerInstance<M>['overwriteModel']}
     */
    overwriteModel(modelID, data, scope){

        //Our reference. Do the referencing here. Perfect!!!!
        const targetMasterModel = this.masterWorkingModel.masterModels.find((masterModel) => masterModel.modelID === modelID);

        if(targetMasterModel){

            if(scope === "MODEL_ROOT"){

                //Not taking ordered array indices cause merging for scoped temp, which is directly at value
                this.valueBasedRecursiveObjectMerge(targetMasterModel.data.temp.master.data, data, null);
            } else {

                //Prepare the scope data object
                if(!targetMasterModel.data.temp.scoped[scope]){

                    //@ts-expect-error
                    targetMasterModel.data.temp.scoped[scope] = { data: {} };
                }

                //Should be a warning we can ignore
                //Saved directly cause working with same values
                if(typeof data === "object"){

                    //if array, just put direct. Else, recursive merge
                    if(Array.isArray(data)){

                        targetMasterModel.data.temp.scoped[scope].data = data;
                    } else {

                        this.valueBasedRecursiveObjectMerge(targetMasterModel.data.temp.scoped[scope].data, data, null);
                    }
                } else {
                    
                    targetMasterModel.data.temp.scoped[scope].data = data;
                }
            }
        } else {

            console.error(`Failed to overwrite model with model ID ${modelID}. Not found`);
        }
    }

    /**
     * CONFIRM THE ALGO
     * @type {DataManagerInstance<M>['mergeScopedDataToModel']}
     */
    mergeScopedDataToModel(model, scope, value, orderedArrayIndices){

        const splitScope = scope.toString().split(DataManager._NESTED_SCOPE_KEY_SPLITTER);
        //Reduce to before leaf (so that we don't get value of terminal and maintain by reference actions)
        const leaf = splitScope[splitScope.length - 1];

        //doing one before leaf so that we have a reference that will work even for literals (always gets us an object)
        const oneBeforeLeaf = this.recursiveValueReference(scope, null, model, orderedArrayIndices, null, true);
        //Spawn it if doesn't exist (doing this long check cause of booleans)
        if(oneBeforeLeaf[leaf] === undefined || oneBeforeLeaf[leaf] === null){

            oneBeforeLeaf[leaf] = {};
        }

        if(typeof value === "object"){

            if(!Array.isArray(oneBeforeLeaf[leaf])){ //!Array.isArray(oneBeforeLeaf)

                this.valueBasedRecursiveObjectMerge(oneBeforeLeaf[leaf], value, orderedArrayIndices);
            } else {

                //We are dealing with an array
                // Pushing or deleting values directly since it was not decomposed to a specific member using orderedArrayIndices sourced from the viewNode 
                if(Object.keys(value).length === 0){

                    //if empty object, we remove everything in array
                    oneBeforeLeaf[leaf].splice(0, oneBeforeLeaf[leaf].length);
                } else {

                    oneBeforeLeaf[leaf].push(...value);
                }
            }
        } else {

            if(Array.isArray(oneBeforeLeaf[leaf])){

                oneBeforeLeaf[leaf].push(value);
            } else {

                oneBeforeLeaf[leaf] = value;
            }
        }

        return model;
    }

    /**
     * 
     * @type {DataManagerInstance<M>['flushModelTemp']}
     */
    flushModelTemp(modelID, scope){

        const targetMasterModel = this.masterWorkingModel.masterModels.find((masterModel) => {

            masterModel.modelID === modelID;
        });

        if(targetMasterModel && targetMasterModel.data.committed){

            if(scope === "MODEL_ROOT"){

                targetMasterModel.data.temp.master.data = null;
            } else {

                //Not removing object cause can be used later to see last mutation on a scope
                targetMasterModel.data.temp.scoped[scope].data = null;
            }
        } else {
            
            const mutation = scope === "MODEL_ROOT" ? targetMasterModel.data.temp.master.mutation : targetMasterModel.data.temp.scoped[scope].mutation;
            console.error(`Failed to flush temp in model with model ID ${modelID}. Nothing committed from mutation ${mutation}`);
        }
    }

    /**
     * FINISH CANCELLATIONS
     * 
     * REJECT IF NEW OPERATION PARENT OR CHILD IN SCOPE TO RUNNING (SO LET INTERNAL ONES FINISH FIRST AS PER MODEL OBJECT)
     * As per data operations override behavior
     * 
     * @type { DataManagerInstance<M>['preProcessDataOperation'] }
     * 
     */
    preProcessDataOperation(recordsStamp, modelID, requestedMutation, requestedScope, newData, skipUI, mappedDataId){

        return new Promise(async (resolve) => {

            const dataOperationsStack = this.getValidDataOperationsStack(recordsStamp, true);
            const runningOperationInfo = dataOperationsStack.find((info) => info.modelID === modelID );

            /**
             * The cancelling here is absolute, so doesn't respect network continue, since
             * you're explicitly stopping it
             * 
             * @param {import("DataManager").OperationInfo<M>} operation 
             * @returns {Promise<import("DataManager").DataOperationsStatus<M>>}
             */
            const cancelRunningOperation = async (operation) => {

                return new Promise(async (resolve, reject) => {

                    //Cancelling the current operation
                    //Return on callback to proceed. So, use a promise? Yes
                    if(operation.mutation === "loadNew"){

                        //Cancel the LOAD process and resolve
                        await this.loadNewDataPipeline.cancelNewDataLoad(modelID, operation.scope);
                        resolve({

                            operable: true,
                            info: runningOperationInfo,
                            previousMutation: operation.mutation,
                            msg: `Mutation accepted. Cancelled previous load for model ID: ${runningOperationInfo.modelID} and scope: ${operation.scope}`
                        });
                    } else if(operation.mutation === "update"){

                        //Cancel the UPDATE process
                        await this.updateDataPipeline.cancelDataUpdate(modelID, operation.scope);
                        resolve({

                            operable: true,
                            info: runningOperationInfo,
                            previousMutation: operation.mutation,
                            msg: `Mutation accepted. Cancelled previous update for model ID: ${runningOperationInfo.modelID} and scope: ${operation.scope}`
                        });
                    } else if(operation.mutation === "upload" || operation.mutation === "uploadNew"){

                        //Cancel the UPLOAD process
                        await this.uploadDataPipeline.cancelDataUpload(runningOperationInfo.modelID, operation.scope);
                        resolve({

                            operable: true,
                            info: runningOperationInfo,
                            previousMutation: operation.mutation,
                            msg: `Mutation accepted. Cancelled previous upload for model ID: ${runningOperationInfo.modelID} and scope: ${operation.scope}`
                        });
                    } else if(operation.mutation === "delete"){

                        //Cancel the DELETE process
                        await this.deleteDataPipeline.cancelDataDelete(runningOperationInfo.modelID, operation.scope);
                        resolve({

                            operable: true,
                            info: runningOperationInfo,
                            previousMutation: operation.mutation,
                            msg: `Mutation accepted. Cancelled previous delete for model ID: ${runningOperationInfo.modelID} and scope: ${operation.scope}`
                        });
                    } else {

                        console.error("Mutation bad call: Should not be asynchronous. Intercepted by preprocessor");
                        resolve({

                            operable: false,
                            info: runningOperationInfo,
                            previousMutation: null,
                            msg: `Mutation denied. Bad code. Intercepted mutation that should NOT be in operations stack: ${requestedMutation}`
                        });
                    }
                });
            }

            const mappedScope = this.getMappedDataOperationScope(requestedScope, mappedDataId);
            if(runningOperationInfo){

                //If scope is the same, refuse
                const sameScope = runningOperationInfo.operations.find((operation) => operation.scope === mappedScope);
                if(sameScope){

                    if(this.dataOperationsOverrideBehavior === "wait"){

                        resolve({
    
                            operable: false,
                            info: runningOperationInfo,
                            previousMutation: sameScope.mutation,
                            msg: `Mutation denied. Waiting for similar mutation of scope ${requestedScope.toString()} on this model to complete`
                        });
                    } else {

                        //Make cancellations
                        const status = await cancelRunningOperation(sameScope);
                        if(status.operable){

                            //Update to new mutation
                            //Delete previous? Assuming it's by reference direct change should work. Test that
                            const previousMutation = sameScope.mutation;
                            sameScope.mutation = requestedMutation;

                            //Test. REMOVE IF IT WORKS
                            if(runningOperationInfo.operations.find((operation) => operation === sameScope).mutation === requestedMutation){

                                console.warn("BY REFERENCE WORKED!!! REMOVE ME AND ELSE BLOCK BELOW");
                            } else {

                                runningOperationInfo.operations.splice(runningOperationInfo.operations.findIndex((scope) => scope === sameScope), 1);
                                runningOperationInfo.operations.push(sameScope);
                            }

                            updateMutationState(this.masterWorkingModel.masterModels.find((model) => model.modelID === modelID), requestedScope);
                            resolve({

                                info: runningOperationInfo,
                                operable: true,
                                previousMutation: previousMutation,
                                msg: `Mutation invoked. Previous mutation of same scope ${mappedScope} cancelled`
                            });
                        } else {

                            resolve({

                                info: runningOperationInfo,
                                operable: false,
                                previousMutation: sameScope.mutation,
                                msg: `Mutation denied with message: ${status.msg}`
                            });
                        }
                    }
                } else {

                    //Scope not the same.
                    //So, creating new operation
                    //However, new scope should not be parent or child of any running scope

                    //Also, if there's a single running operation with scope other than MODEL_ROOT and scope requested
                    //is model root, reject
                    //Check latter first then former
                    const belowRootScopeRunning = runningOperationInfo.operations.find((operation) => operation.scope !== "MODEL_ROOT");
                    if(belowRootScopeRunning && mappedScope === "MODEL_ROOT"){

                        resolve({

                            operable: false,
                            info: runningOperationInfo,
                            previousMutation: null,
                            msg: `Mutation denied. Pending operations of lower scope to model root running on the model`
                        });
                    } else {

                        //If requested scope is MODEL_ROOT, just accept immediately
                        if(mappedScope === "MODEL_ROOT"){

                            /**
                             * @type {import("DataManager").OperationInfo<M>}
                             */
                            const newOperation = {

                                mutation: requestedMutation,
                                scope: mappedScope
                            }

                            runningOperationInfo.operations.push(newOperation);
                            //Purposefully using requested scope here to keep 1 to 1 reference in model
                            updateMutationState(this.masterWorkingModel.masterModels.find((model) => model.modelID === modelID), requestedScope);
                            resolve({

                                operable: true,
                                info: runningOperationInfo,
                                previousMutation: null,
                                msg: `Mutation invoked for root model under the MODEL_ROOT scope: ${mappedScope}`
                            });
                        } else {
                            
                            /**
                             * @type {DataManagerMutations}
                             */
                            let prevMutation = null;
                            //Requested scope not model root, so before accept, ensure not child or parent of ANY scope, including
                            //itself if using mappedID
                            try {

                                runningOperationInfo.operations.forEach((operation) => {
    
                                    //Check child
                                    const opScope = operation.scope;
                                    if(this.getDe_MappedOperationScope(mappedScope).startsWith(this.getDe_MappedOperationScope(opScope))){
    
                                        //Requested scope is child of a running scope. Stop
                                        prevMutation = operation.mutation;
                                        throw new Error("child: " + mappedScope + " :: " + opScope);
                                    } else {
    
                                        //Check parent
                                        if(this.getDe_MappedOperationScope(opScope).startsWith(this.getDe_MappedOperationScope(mappedScope))){

                                            //Requested scope is parent to running scope
                                            prevMutation = operation.mutation;
                                            throw new Error("parent");
                                        }
                                    }
    
                                        //What inspired this bit of code:
                                        //Look at this - https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object'
                                        //AND THIS - https://medium.com/xgeeks/typescript-utility-keyof-nested-object-fa3e457ef2b2 
                                        //https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
                                });

                                //Not child or parent. Accepted
                                //Also, only mutation happening
                                updateMutationState(this.masterWorkingModel.masterModels.find((model) => model.modelID === modelID), requestedScope);
                                resolve({

                                    operable: true,
                                    info: runningOperationInfo,
                                    previousMutation: null,
                                    msg: `Mutation invoked for scoped model under the scope: ${mappedScope}`
                                });
                            } catch(err){

                                resolve({

                                    operable: false,
                                    info: runningOperationInfo,
                                    previousMutation: prevMutation,
                                    msg: `Mutation denied. Scope of requested operations ${err} to a running operation. Data integrity bottleneck`
                                });
                            }
                        }
                    }
                }
            } else {

                //No info. Create new
                /**
                 * @type {import("DataManager").DataOperationsInfo<M>}
                 */
                const info = {

                    modelID: modelID,
                    operations: [{

                        mutation: requestedMutation,
                        scope: mappedScope
                    }]
                };
                //Push to stack
                dataOperationsStack.push(info);
                updateMutationState(this.masterWorkingModel.masterModels.find((model) => model.modelID === modelID), requestedScope);
                resolve({

                    operable: true,
                    info: info,
                    previousMutation: null,
                    msg: `Mutation invoked for scoped model under the scope: ${mappedScope}. Fresh invocation`
                });
            }

            /**
             * Make sure your scope is NOT MAPPED
             * 
             * @param {import("DataManager").DataManagerMasterModel<M>} masterModel 
             * @param {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']} scope 
             */
            function updateMutationState(masterModel, scope){

                //For load new, master model can be null. So, must check
                if(masterModel){

                    if(scope === "MODEL_ROOT"){
                        
                        masterModel.data.temp.master.mutation = requestedMutation;
                        masterModel.data.temp.master.data = newData ? newData : {},
                        masterModel.data.temp.master.uiSkipped = skipUI;
                        masterModel.data.temp.master.state = "onMutate";
                    } else {
    
                        if(!masterModel.data.temp.scoped[requestedScope]){

                            //@ts-expect-error
                            masterModel.data.temp.scoped[requestedScope] = {};
                        }
                        masterModel.data.temp.scoped[requestedScope].mutation = requestedMutation;
                        masterModel.data.temp.scoped[requestedScope].data = newData ? newData : {},
                        masterModel.data.temp.scoped[requestedScope].uiSkipped = skipUI;
                        masterModel.data.temp.scoped[requestedScope].state = "onMutate";
                    }
                }
            }
        });
    }

    /**
     * 
     * @param {string} recordsStamp 
     * @param {boolean} [buildNew]
     * @returns {Stack<import("DataManager").DataOperationsInfo<M>>}
     */
    getValidDataOperationsStack(recordsStamp, buildNew){

        let dataOperationsStack = this.dataOperationsRecords.get(recordsStamp);
        if(!dataOperationsStack){

            //The records under this stamp have been moved to lifecycle reject or change (merge the stacks)
            //So, find it there. Either a flushAll event occured or host destroyed (lifecycle event)
            dataOperationsStack = this.dataOperationsRecords.get(DataManager._RECORDS_AFTER_LIFECYCLE_DETACH_OR_FLUSH_ALL);
            if(!dataOperationsStack){

                //First of its kind, lol
                dataOperationsStack = new Stack();
            }

            if(buildNew){

                this.dataOperationsRecords.set(recordsStamp, dataOperationsStack);
            }
        }

        return dataOperationsStack;
    }

    /**
     * 
     * @type {DataManagerInstance<M>['onPostDataOperation']}
     */
    onPostDataOperation(recordsStamp, modelID, scope, mappedDataId){

        const mappedScope = this.getMappedDataOperationScope(scope, mappedDataId);
        const dataOperationsStack = this.getValidDataOperationsStack(recordsStamp);
        const operationInfo = dataOperationsStack.find((info) => info.modelID === modelID);
        if(operationInfo?.operations.length === 1){

            dataOperationsStack.sortDelete(operationInfo);
        } else {

            //Just splice the operation for the scope
            operationInfo?.operations.splice(operationInfo.operations.findIndex((info) => info.scope === mappedScope), 1);
        }
    }

    static get _FOR_MAPPED_OP_SCOPE_KEYWORD(){

        return "_FOR_MAPPED_";
    }

    /**
     * @template {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']} ReqScope
     * @param {ReqScope} scope 
     * @param {string} mappedDataId 
     * @returns {string}
     */
    getMappedDataOperationScope(scope, mappedDataId){

        return mappedDataId ? `${scope}${DataManager._FOR_MAPPED_OP_SCOPE_KEYWORD}${mappedDataId}` : scope;
    }

    /**
     * Demaps a scope. mappedDataId goes LAST in mapping, after _FOR_MAPPED_ keyword.
     * 
     * @param {string} mappedScope 
     */
    getDe_MappedOperationScope(mappedScope){

        const splitScope = mappedScope.split(`${DataManager._FOR_MAPPED_OP_SCOPE_KEYWORD}`);
        if(mappedScope.includes(`${DataManager._FOR_MAPPED_OP_SCOPE_KEYWORD}`)){

            //Remove _FOR_MAPPED_ keyword and the mappedDataId
            splitScope.splice(splitScope.length - 1, 1);
        }

        return splitScope.join("");
    }

    /**
     * Returns copy of stored model (COMMITTED)
     * Copy to avoid external manipulation not using data manager channels
     * @type {DataManagerInstance<M>['getModel']} 
     */
    getModel(modelID){

        const targetModel = this.masterWorkingModel.masterModels.find((model) => model.modelID === modelID);
        if(targetModel){

            return structuredClone(targetModel.data.committed);
        }

        return null;
    }

    /**
     * Change to getModelInPosition to rhyme with queue?
     * @type {DataManagerInstance<M>['getModelInIndex']}
     */
    getModelInIndex(index){

        if(index >= 0 && this.masterWorkingModel.masterModels[index]){

            return structuredClone(this.masterWorkingModel.masterModels[index].data.committed);
        }

        return null;
    }

    /**
     * 
     * @type {DataManagerInstance<M>['getModelId']} 
     */
    getModelId(index){

        if(index >= 0 && this.masterWorkingModel.masterModels[index]){

            return this.masterWorkingModel.masterModels[index].modelID;
        }

        return null;
    }

    /**
     * 
     * @type {DataManagerInstance<M>['getScopedModel']} 
     */
    getScopedModel(scope, mappedDataId, modelID, stopAtNodeforRef){

        const model = this.getModel(modelID);
        if(scope === DataManager._MODEL_ROOT_SCOPE){

            return model;
        }

        return this.recursiveValueReference(scope, null, model, this.getOrderedArrayIndicesForMappedDataId(scope, mappedDataId), null, stopAtNodeforRef);
    }

    /**
     * If it return undefined, this property doesn't exist in target model
     * @type {DataManagerInstance<M>['reduceModelToProperties']}
     */
    reduceModelToProperties(baseModel, targetModel){

        const reducedModel = {};
        let foundProp = false;
        for(const key in baseModel){

            if(targetModel[key]){

                foundProp = true;
                reducedModel[key] = targetModel[key];
            }
        }
        
        return foundProp ? reducedModel : undefined;
    }

    /**
     * ACCESS THIS IF AND ONLY IF YOU'VE REDUCED YOUR SCOPE TO THE DATA SPACE
     * 
     * @type {DataManagerInstance<M>['getScopedModelFromRef']} 
     */
    getScopedModelFromRef(scope, orderedArrayIndices, model, stopAtNodeforRef){

        if(scope === DataManager._MODEL_ROOT_SCOPE){

            return model;
        } else {

            return this.recursiveValueReference(scope, null, model, orderedArrayIndices, null, stopAtNodeforRef);
        }
    }

    /**
     * Use this to recursively reference a model and its type. 
     * Not as straightforward especially when working with arrays
     * 
     * TO MAKE WORK EASIER, MANAGER HOLDS REFERENCE TO WHERE CHANGE SHOULD HAPPEN. CHANGES THAT TO NEW VALUE.
     * BETTER SOLUTION TBF
     * IF OBJECT, MERGE. IF LITERAL, OVERWRITE. YES.
     * @template {ValueTypeOfNested<M, DataScope>} MainModel
     * @template {NestedRelativeChildKeyOf<M, DataScope>} ReqScope
     * @template {NestedKeyOf<M>} DataScope
     * @param {ReqScope} scope 
     * @param {string} prevKey
     * @param {ViewManagerOrderedArrayIndices} orderedArrayIndices This provided by view managers. Can infer its parent for index of its model id to create right order. So, keeping child list which can also be used to invoke a new build for recyclable lists
     * @param {ValueTypeOfNested<MainModel, ReqScope>} referencedModel
     * @param {MainModel} mainModel
     * @param {boolean} stopAtNodeforRef
     * @returns {ValueTypeOfNested<MainModel, ReqScope> | ValueTypeOfArrayOnly<M, ReqScope>} //Returning value type of array too, if deconstructed
     */
    recursiveValueReference(scope, prevKey, mainModel, orderedArrayIndices, referencedModel, stopAtNodeforRef = false){

        if(!mainModel){
            
            return referencedModel;
        }
        
        //Set referenced model to main model - starting procedure
        if(!referencedModel){
            
            //Setting it like this, to cater with scope split to length 1. Should point back to main model
            referencedModel = mainModel;
        }
        
        if(orderedArrayIndices){
    
            orderedArrayIndices = orderedArrayIndices.copy();
        }

        if(scope){

            const keys = scope.toString().split(DataManager._NESTED_SCOPE_KEY_SPLITTER);
            const key = keys.splice(0, 1)[0];
            //Only move to (reference) next if not stopping at node and at end of keys
            if(keys.length === 0 && stopAtNodeforRef){

                return referencedModel;
            } else{

                if(key === DataManager._SCOPED_ARRAY_LITERAL || key === DataManager._ARRAY_SELF_TYPE){
    
                    //referenced model now moves to the type at the ordered index of the main model
                    //Main model now an array cause of referencing at recursion
                    const orderedIndex = orderedArrayIndices?.dequeue();
                    //Decomposing array only if ordered indices provided. Else, returning whole array
                    //to which you'll push(add new);
                    if(orderedIndex !== null){

                        referencedModel = mainModel[orderedIndex];
                    } else {

                        //No ordered index for the array. So only reference the array, if not referencing self type
                        //If reference self type, only get first in array
                        referencedModel = key === DataManager._ARRAY_SELF_TYPE ? mainModel[0] : mainModel;
                    }
                } else {
    
                    //reference just directly from mainModel
                    referencedModel = mainModel[key];
                }
    
                if(referencedModel !== undefined){ //was just referenceModel. Failing with false values
    
                    // passing referenced model because it is now the equivalent of mainModel referenced by key or array index
                    return this.recursiveValueReference(keys.length > 0 ? keys.join(DataManager._NESTED_SCOPE_KEY_SPLITTER) : null, key, referencedModel, orderedArrayIndices, referencedModel, stopAtNodeforRef);
                } else {
    
                    return undefined;
                }   
            }
        } else {

            return referencedModel;
        }
    }

    /**
     * Children scope for view also updated. YESSS
     * Okay, no. Might be separating some concerns. Fire only relevant scope. 
     * @type {DataManagerInstance<M>['setViewManager']}
     */
    setViewManager(scope, viewManager, initArgs = null){

        //Prep for lifecycle handling
        //Remove view manager from stored list if lifecycle triggered
        viewManager.getLifeCycleInstance().registerLifeCycleListeners({

            onFragmentCancelled: () => {},
            onFragmentRunning: () => {},
            onFragmentDestroyed: () => {

                if(this.masterWorkingModel.scopedOptions.views[scope]){

                    if(this.masterWorkingModel.scopedOptions.views[scope].viewManagers.findIndex((manager) => manager.id === viewManager.id) !== -1){

                        this.masterWorkingModel.scopedOptions.views[scope].viewManagers.splice(
                            this.masterWorkingModel.scopedOptions.views[scope].viewManagers.findIndex((manager) => manager.id === viewManager.id),
                            1)
                    } else {

                        console.error(`DATA MANAGER ERROR: View manager of scope ${scope} not found`)
                    }
                } else {

                    console.error(`DATA MANAGER ERROR: Whole scope of view manager of scope ${scope} never put as an entry`);
                }
            }
        });

        //Add to scoped options
        this.masterWorkingModel.scopedOptions.views = {

            ...this.masterWorkingModel.scopedOptions.views,
            [scope] : {

                viewManagers: this.masterWorkingModel.scopedOptions.views[scope] && this.masterWorkingModel.scopedOptions.views[scope].viewManagers ? this.masterWorkingModel.scopedOptions.views[scope].viewManagers.concat([viewManager]) : [viewManager]
            }
        }

        //Tell it directly to init
        viewManager.initViewManager(initArgs);
    }

    /**
     * 
     * @type {DataManagerInstance<M>['getViewManager']}
     */
    getViewManager(scope, id){

        if(this.masterWorkingModel.scopedOptions.views[scope]){

            return this.masterWorkingModel.scopedOptions.views[scope].viewManagers.find((manager) => manager.id === id);
        }

        return null;
    }

    /**
     * 
     * @param {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['views']} scope 
     */
    getAllViewManagersForScope(scope){

        /**
         * @type {StandardViewManagerInstance<M, *>[]}
         */
        let potentialViewManagers = [];
        if(scope === "MODEL_ROOT"){
            
            //return ALL available ones
            for(let viewScope in this.masterWorkingModel.scopedOptions.views){
                
                //concat to list. Just load all as long as is parent
                potentialViewManagers = potentialViewManagers.concat(this.masterWorkingModel.scopedOptions.views[viewScope].viewManagers);
            }

            //return a set, cause self can register multiple times
            return Array.from(new Set(potentialViewManagers));
        } else {

            //NOT SCOPE MODEL_ROOT. 
            //So, get direct, parent, and children of THAT scope
            //This is different from ALL scopes in MODEL ROOT
            //e.g { me: { have: { this: "todo" } }, and: "this" } (scopes = me | me.have | me.have.this | and). 
            //because of how component hooks work, a mutation to scope me.have can have view effects in 
            //view manager of scope me and me.have.this
            //because, view manager of scope me can have component hooks of me.have | me.have.this
            //and view manager of scope me.have.this may have root hooks of that scope, and mutation can affect that data
            //root hooks are basically component hooks of SAME SCOPE
            if(this.masterWorkingModel.scopedOptions.views[scope]){
    
                // save the direct first
                potentialViewManagers = potentialViewManagers.concat(this.masterWorkingModel.scopedOptions.views[scope].viewManagers);
            } 
            //Now get parents of scope and children
            /**
             * @type {NestedKeyOf<M>}
             */
            let viewScope = null;
            for(viewScope in this.masterWorkingModel.scopedOptions.views){
                
                //parents first
                if(scope.startsWith(viewScope)){
    
                    //concat to list. Just load all as long as is parent
                    potentialViewManagers = potentialViewManagers.concat(this.masterWorkingModel.scopedOptions.views[viewScope].viewManagers);
                } else if(viewScope.startsWith(scope)){
    
                    //child
                    potentialViewManagers = potentialViewManagers.concat(this.masterWorkingModel.scopedOptions.views[viewScope].viewManagers);
                }
            }
    
            //Add model root as last, if it exists. Won't be picked up by algo above, but should be called regardless cause of overarching scope
            if(this.masterWorkingModel.scopedOptions.views.MODEL_ROOT?.viewManagers){
                
                //transfer above here. But want to get why we don't have view managers for scope
                potentialViewManagers = potentialViewManagers.concat(this.masterWorkingModel.scopedOptions.views.MODEL_ROOT?.viewManagers);
            }
            //Now, turn into a set and return
            potentialViewManagers = Array.from(new Set(potentialViewManagers));
            //turn into a set btw
            return potentialViewManagers;
        }
    }

    /**
     * @template {keyof DataManagerInstance<M>['masterWorkingModel']['dataWatchers']} S
     * @param {DataManagerMutations} mutation
     * @param {S} scope
     * @param {Partial<ValueTypeOfNested<M, S>> | Partial<ValueTypeOfNested<M, S>>[]} newData 
     * @param {Partial<ValueTypeOfNested<M, S>> | Partial<ValueTypeOfNested<M, S>>[]} oldData 
     */
    updateWatchers(mutation, scope, newData, oldData){

        if(this.masterWorkingModel.dataWatchers[scope]){

            this.masterWorkingModel.dataWatchers[scope].viewManagers.forEach((manager) => {

                manager.onExternalWatchCommit(mutation, newData, oldData);
            })
        };
    }

    /**
     * 
     * @type {DataManagerInstance<M>['comparator']}
     */
    comparator(scope){

        const scopedViewOptions = this.masterWorkingModel.scopedOptions.views;
        //READ CAPS BELOW. USE THIS FOR SAME LOGIC
        /**
         * 
         * @param {NestedKeyOf<M> | _ScopeModelRoot} scope 
         * @returns 
         */
        const getAllViewManagersForScope = (scope) => this.getAllViewManagersForScope(scope);
        return new(class {

            constructor(){

                /**
                 * @type {import("DataManager").ScopeComparatorInterfaceInstance<M>['scope']}
                 */
                this.scope = scope;
            }

            /**
             * @type {import("DataManager").ScopeComparatorInterfaceInstance<M>['ofViews']}
             */
            ofViews(){

                /**
                 * USE THE SAME LOGIC AS getViewManagers(scope)
                 * 
                 * AND THEN, ONLY DELETE OR FLUSH ALL (which affects view) IF DIRECT AFFECTED IN CALL (SCOPE OF CALL EQUALS IT), OR IS CHILD OF SCOPE CALL
                 * 
                 * ELSE, BOUNCE AND TRIGGER CHILDREN. MIGHT BE A CHILD, SINCE YOU'RE PARENT TO 
                 * THAT SCOPE
                 * 
                 * SELF TYPE ONLY USED IN HOOKS. Else, nope (because of its reference to self)
                 */
                return getAllViewManagersForScope(this.scope);
            }
        });
    }

    /**
     * Creates a partial shell model of the target reference model, fulfilling the scope from root
     * 
     * Added targetReferenceModel because spread operator is breaking with nested objects
     * @type {DataManagerInstance<M>['spawnPartialShellModel']}
     */
    spawnPartialShellModel(scope, value, targetReferenceModel, mappedDataId){

        const fullScope = scope;
        /**
         * I think you're useless. We're just creating man
         * @type {QueueInstance<number>}
         */
        const nodeOrderedArrayIndices = mappedDataId ? this.getOrderedArrayIndicesForMappedDataId(scope, mappedDataId) : new Queue();

        /**
         * Use this to recursively reference a model and its type. 
         * Not as straightforward especially when working with arrays
         * 
         * TO MAKE WORK EASIER, MANAGER HOLDS REFERENCE TO WHERE CHANGE SHOULD HAPPEN. CHANGES THAT TO NEW VALUE.
         * BETTER SOLUTION TBF
         * IF OBJECT, MERGE. IF LITERAL, OVERWRITE. YES.
         * @template {NestedKeyOf<M>} RefScope
         * @param {RefScope} scope 
         * @param {string[]} prevKeys
         * @param {QueueInstance<number>} spawnedOrderedArrayIndices This provided by view managers. Can infer its parent for index of its model id to create right order. So, keeping child list which can also be used to invoke a new build for recyclable lists
         * @param {DataManagerInstance<M>} dataManagerInstance
         * @param {Partial<M>} spawnedModel
         * @returns {Partial<M>}
         */
        function createModelRecursive(scope, prevKeys, spawnedModel, spawnedOrderedArrayIndices, dataManagerInstance){

            if(scope){

                if(!spawnedModel){

                    spawnedModel = targetReferenceModel ? targetReferenceModel : Object.create(null);
                }
                if(!spawnedOrderedArrayIndices){

                    spawnedOrderedArrayIndices = new Queue();
                }
                if(!prevKeys){

                    prevKeys = [];
                }

                const keys = scope.toString().split(DataManager._NESTED_SCOPE_KEY_SPLITTER);
                //Only move to (reference) next if have keys
                const key = keys.splice(0, 1)[0];
                if(key === DataManager._SCOPED_ARRAY_LITERAL){
    
                    if(prevKeys.length > 0){

                        //Get node, so that we can define the type of the leaf instead of getting the default leaf type put there in previous setting (which for this case, was none array)
                        //If part of array inside, will spawn to index 0, and update that node
                        let node = dataManagerInstance.getScopedModelFromRef(prevKeys.join(DataManager._NESTED_SCOPE_KEY_SPLITTER), spawnedOrderedArrayIndices, spawnedModel, false);
                        //Now at array. Need to index it
                        if(nodeOrderedArrayIndices && nodeOrderedArrayIndices.length > 0 && node.length){

                            node = node[nodeOrderedArrayIndices.dequeue()];
                        } else {

                            node[0] = {};
                            //spawned is for one we've set, not original
                            //If viewNode provided, only node's ordered used
                            spawnedOrderedArrayIndices.enqueue(0);
                        }
                    } else {

                        console.error("DATA MANAGER ERROR: When spawning model, must already have previous keys before reaching an array")
                    }
                } else {
    
                    //Normal reference
                    //reference just directly from mainModel
                    let node = {};
                    if(prevKeys.length > 0){

                        //After root, rest set by reference
                        //Not getting node at previous key because that was set. We want to set after it. So, value is object which is a ref, that we can override
                        node = dataManagerInstance.getScopedModelFromRef(prevKeys.join(DataManager._NESTED_SCOPE_KEY_SPLITTER), spawnedOrderedArrayIndices, spawnedModel, false);

                        //instantiate predictive. if next key is array, then [], else {}
                        //then figure out what to do for actual array (do next key thing. Yeaa..)
                        node[key] = node[key] ? node[key] : keys[0] === DataManager._SCOPED_ARRAY_LITERAL ? [] : {}; //Also instantiating into an object to make it easier to work with and create references
                    } else {
                        
                        //First value
                        spawnedModel[key] = spawnedModel[key] ? spawnedModel[key] : keys[0] === DataManager._SCOPED_ARRAY_LITERAL ? [] : {};
                    }
                }
                
                prevKeys.push(key);
                return createModelRecursive(keys.length > 0 ? keys.join(DataManager._NESTED_SCOPE_KEY_SPLITTER) : null, prevKeys, spawnedModel, spawnedOrderedArrayIndices, dataManagerInstance);
            } else {

                //Now, fix the value
                if(value !== undefined && value !== null){

                    const fullScopeSplit = fullScope.toString().split(DataManager._NESTED_SCOPE_KEY_SPLITTER);
                    const ref = dataManagerInstance.getScopedModelFromRef(fullScope, spawnedOrderedArrayIndices, spawnedModel, true);
                    ref[fullScopeSplit[fullScopeSplit.length - 1]] = value;
                }

                //Because of reference issues, do this
                return spawnedModel;
            }
        }

        createModelRecursive(scope, null, null, null, this);
    }

    /**
     * 
     * @param {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['views']} scope 
     * @param {string} mappedDataId 
     */
    getOrderedArrayIndicesForMappedDataId(scope, mappedDataId){

        let viewManagers = this.getAllViewManagersForScope(scope);
        /**
         * @type {QueueInstance<number>}
         */
        let orderedArrayIndices = null;
        if(viewManagers){

            for(let i = 0; i < viewManagers.length; i++){

                orderedArrayIndices = viewManagers[i].getOrderedArrayIndices(scope, mappedDataId);
                if(orderedArrayIndices?.length > 0){

                    break;
                }
            }
        }

        return orderedArrayIndices;

    }

    /**
     * 
     * @type {DataManagerInstance<M>['setScopedAPIOptions']} 
     */
    setScopedAPIOptions(scope, options){

        if(this.masterWorkingModel.scopedOptions.apis[scope]){

            console.warn("DATA MANAGER: Overriding scoped API options for scope " + scope);
        }

        if(options[scope].observers){

            options[scope].observers = null;
            console.error("DATA MANAGER: Setting observers directly with API options forbidden. Potential memory leaks.\n\nUse setScopedAPIDataOpInterfaceObserver after setting your scoped API options. Scope: " + scope);
            return;
        }

        this.masterWorkingModel.scopedOptions.apis = { ...this.masterWorkingModel.scopedOptions.apis, ...options }
    }

    /**
     * 
     * @type {DataManagerInstance<M>['setScopedAPIDataOpInterfaceObserver']}
     */
    setScopedAPIDataOpInterfaceObserver(scope, networkInterfaceObserver, lifecycleInstance){

        if(!this.masterWorkingModel.scopedOptions.apis[scope]){

            console.error("DATA MANAGER: Cannot set a network interface observer for a scope without a set network interface. Scope " + scope.toString());
            return;
        }

        this.masterWorkingModel.scopedOptions.apis[scope].observers = this.masterWorkingModel.scopedOptions.apis[scope].observers ? this.masterWorkingModel.scopedOptions.apis[scope].observers.concat(networkInterfaceObserver) : [networkInterfaceObserver];

        lifecycleInstance.registerLifeCycleListeners({

            onFragmentRunning: () => {},
            onFragmentCancelled: () => {},
            onFragmentDestroyed: () => {

                this.masterWorkingModel.scopedOptions.apis[scope].observers.splice(this.masterWorkingModel.scopedOptions.apis[scope].observers.findIndex((observer) => observer === networkInterfaceObserver), 1);
            }
        });
    }

    /**
     * 
     * @type {DataManagerInstance<M>['flushAllData']} 
     */
    flushAllData(options){

        const flushCurrentModel = () => {

            //Generate new records stamp
            this.generateDataRecordsStamp();
            this.masterWorkingModel.masterModels.forEach((masterModel) => {

                oldModels.push(masterModel.data.committed);
                oldModelIds.push(masterModel.modelID);
            });

            //clear in array
            this.masterWorkingModel.masterModels = [];

            //Tell ALL view managers attached
            for(let scope in this.masterWorkingModel.scopedOptions.views){

                this.masterWorkingModel.scopedOptions.views[scope].viewManagers.forEach((manager) => {

                    //Passing everything else null because irrelevant. It's a mandatory flush
                    manager.onCommit("delete_FlushAll", oldModels, oldModels, null, oldModelIds, DataManager._MODEL_ROOT_SCOPE, DataManager._MODEL_ROOT_SCOPE, () => {});
                });
            }

            //Tell all observers
            for(let scope in this.masterWorkingModel.dataWatchers){

                this.masterWorkingModel.dataWatchers[scope].viewManagers.forEach((manager) => {

                    manager.onExternalWatchCommit("delete_FlushAll", null, null);
                });
            }

            //Cleared all data
        }

        /**
         * @type {M[]}
         */
        const oldModels = [];
        /**
         * @type {string[]}
         */
        const oldModelIds = [];
        //Ensure operation is permitted
        if(!this.getValidDataOperationsStack(this.dataRecordsStamp).isEmpty()){

            if(!options || !options.cancelAllPendingOperations){

                //This is to redundantly inform you that cancellations MUST be made. So remember if you chose network to persist
                console.error("DATA MANAGER: Can't flush all model data. Pending operations not cancelled");
                return null;
            }
            //Cancel all operations
            this.cancelAllDataOperations();
            flushCurrentModel();
        } else {

            flushCurrentModel();
        }

        return oldModels;
    }

    /**
     * Passing MODEL_ROOT for modelId and scope will flush all data
     * 
     * Else, a modelId MUST have a valid scope
     * 
     * Cancels ALL data operations for the given scope
     * 
     * @type {DataManagerInstance<M>['flushScopedData']}
     */
    flushScopedData(modelId, scope, mappedDataId){

        /**
         * This will respect the network policy given the nature of overriding
         * 
         * User driven, and in interest of getting new data. Works similar to flushAllData
         */
        const cancelAllPendingOperationsForScope = () => {

            const runningOperationRecord = this.dataOperationsRecords.get(this.dataRecordsStamp);
            const runningOperationInfo = runningOperationRecord.find((info) => info.modelID === modelId);
            if(runningOperationInfo){

                /**
                 * @type {import("DataManager").OperationInfo<M>}
                 */
                const spliceOperations = [];
                runningOperationInfo.operations.forEach((operation) => {

                    //Cancel for exact and children
                    if(this.getDe_MappedOperationScope(operation.scope) === scope || this.getDe_MappedOperationScope(operation.scope).startsWith(scope)){

                        if(operation.mutation === "delete"){

                            const maintainNetwork = this.maintainNetworkOnFlushAll_Global ? this.maintainNetworkOnFlushAll_Global : this.maintainNetworkOnFlushAll_Specific?.delete;
                            this.deleteDataPipeline.cancelDataDelete(modelId, scope, false, maintainNetwork);
                        } else if(operation.mutation === "loadNew"){

                            this.loadNewDataPipeline.cancelNewDataLoad(modelId, scope);
                        } else if(operation.mutation === "update"){

                            const maintainNetwork = this.maintainNetworkOnFlushAll_Global ? this.maintainNetworkOnFlushAll_Global : this.maintainNetworkOnFlushAll_Specific?.update;
                            this.updateDataPipeline.cancelDataUpdate(modelId, scope, false, maintainNetwork);
                        } else if(operation.mutation === "upload" || operation.mutation === "uploadNew"){

                            const maintainNetwork = this.maintainNetworkOnFlushAll_Global ? this.maintainNetworkOnFlushAll_Global : this.maintainNetworkOnFlushAll_Specific?.upload;
                            this.uploadDataPipeline.cancelDataUpload(modelId, scope, false, maintainNetwork);
                        }

                        //Add to list of operations to remove
                        spliceOperations.push(operation);
                    }
                });

                //Delete operations
                spliceOperations.forEach((operation) => {

                    runningOperationInfo.operations.splice(runningOperationInfo.operations.findIndex((op) => op === operation), 1);
                });

                //If operations for this operation info is empty, delete the entry
                if(runningOperationInfo.operations.length === 0){

                    runningOperationRecord.sortDelete(runningOperationInfo);
                }
            }
        }

        const updateViewManagers = () => {

            const allViewManagers = this.comparator(scope).ofViews();

            allViewManagers.forEach((manager) => {

                manager.onCommit("delete_FlushAll", null, this.getScopedModel(scope, null, modelId, false), mappedDataId, modelId, scope, scope, () => {});
            });
        }

        if(this.dataRecordsStamp !== DataManager._RECORDS_AFTER_LIFECYCLE_DETACH_OR_FLUSH_ALL){

            if(modelId === DataManager._MODEL_ROOT_SCOPE && scope === DataManager._MODEL_ROOT_SCOPE){
    
                this.flushAllData({ cancelAllPendingOperations: true });
                return true;
            } else if(modelId !== DataManager._MODEL_ROOT_SCOPE){
    
                //Try and get model
                const model = this.getModel(modelId);
                if(model){
    
                    //Find any pending operations for given scope
                    cancelAllPendingOperationsForScope();
                    //Update the view managers
                    updateViewManagers();
                    //Now override and commit the null
                    this.overwriteModel(modelId, null, scope);
                    this.commitModel(modelId, scope, null);
                    return true;
                } else {
    
                    return false;
                }
            }
        }
    }

    /**
     * 
     * @param {string} modelId 
     */
    deleteCompleteModel(modelId){

        const index = this.masterWorkingModel.masterModels.findIndex((model) => model.modelID = modelId);
        if(index !== -1){

            this.masterWorkingModel.masterModels.splice(index, 1);
        } else {

            console.warn("Couldn't completely delete model with id " + modelId + ". Not found");
        }
    }    

    /**
     * @type {DataManagerInstance<M>['hasData']}
     */
    hasData(){

        return this.masterWorkingModel.masterModels.length > 0;
    }

    /**
     * @type {DataManagerInstance<M>['dataLength']}
     */
    dataLength(){

        return this.masterWorkingModel.masterModels.length;
    }
}

if(false){

    /**
     * @type {import("DataManager").DataManagerConstructor<*>}
     */
    const dataManager = DataManager;
}

export default DataManager;