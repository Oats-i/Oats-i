//@ts-check
/**
 * For the server side data loading
 */
/**
 * @typedef { import("./load_server_side_pipeline_worker.d.ts.js").LoadServerSideDataPipelineStates } LoadServerSideDataPipelineStates
 * @typedef { import("./load_server_side_pipeline_worker.d.ts.js").LoadServerSidePipelineDFAGroups } LoadServerSidePipelineDFAGroups //With retry option for fail 
 */

//NORMAL IMPORT
//AVOID THE CONST - SO NORMAL CLASS DEFINITION
//NO TEMPLATES IN CONST
//USE JsDocs @extends
//PROVIDE THE TEMPLATES IN OTHER CLASS DEFINITION
import GenericBuildPipelineWorker from "../../../utils/generic-pipeline-worker/generic_build_pipeline_worker.js";
import ListReverser from "../../../utils/lists/list_reverser.js";
import DataManager from "../../data_manager.js";

/**
 * @template M
 * @typedef { import("./load_server_side_pipeline_worker.d.ts.js").LoadServerSideBuildArgs<M> } LoadServerSideBuildArgs
 */

/**
 * @deprecated - New Server side hydration technique in use
 * @extends {GenericBuildPipelineWorker<LoadServerSideDataPipelineStates, LoadServerSideBuildArgs<M>, LoadServerSidePipelineDFAGroups, null>}
 * @template M
 */
class LoadServerSidePipelineWorker extends GenericBuildPipelineWorker{

    /**
     * 
     * @param {import("./load_server_side_pipeline_worker.d.ts.js").LoadServerSidePipelineWorkerConstructorArgs} args 
     */
    constructor(args){

        /**
         * @type {GenericBuildPipelineWorkerConstructorArgs<LoadServerSideBuildArgs<M>, LoadServerSideDataPipelineStates, LoadServerSidePipelineDFAGroups, null>}
         */
        const superArgs = {

            asynchronousBuildDefinition: {

                defaultPipelineState: "onBuildEnd",
                runAsynchronous: false
            },
            pseudoStates: null,
            stateTransitionDefinition: {

                loadServerSideDFA: {

                    autoTriggerState: null,
                    root: "setUpServerSide",

                    setUpServerSide: {

                        prev: "onBuildEnd",
                        next: "buildServerSide",
                        cb: (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            if(myBuildArgs.apiOptions.serverSide && myBuildArgs.apiOptions.serverSide.buildFromServerSide){

                                //Move to next and work on the array                                

                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });
                            } else {

                                cbArgs.failNextCb({

                                    goToNext: false,
                                    buildArgs: cbArgs.buildArgs
                                });
                            }
                        },
                        fail: "jumpServerSideLoad"
                    },
                    buildServerSide: {

                        prev: "setUpServerSide",
                        next: "onBuildEnd",
                        cb: async (cbArgs) => {

                            const myBuildArgs = cbArgs.buildArgs.myBuildArgs;
                            
                            //Now invoke calls
                            //Developer can tell that server side load is starting through a toast maybe?
                            cbArgs.buildArgs.myBuildArgs.apiOptions.serverSide.onServerSideBuildStart();

                            const finalModelArray = await extractViewAndBuildData(cbArgs.buildArgs.myBuildArgs.apiOptions.serverSide.options);
                            /**
                             * 
                             * @param {import("DataManager").ServerSideBuildOptions<M>[]} buildOptions
                             * @param {*[]} finalModelArray
                             * @returns {Promise<void>} 
                             */
                            async function extractViewAndBuildData(buildOptions, finalModelArray = []){

                                //Get the server-side rendered view classes
                                const option = buildOptions.at(0);
                                
                                //If not using a list, just add a unique class name to one server-sider rendered html element 
                                //and will get what we need (specifically pagination status) - Can avoid specifying and still ok
                                /**
                                 * @type {HTMLCollectionOf<Element>}
                                 */
                                let viewClasses = null;
                                if(option.targetView.parentID){
                    
                                    viewClasses = document.getElementById(option.targetView.parentID).getElementsByClassName(option.targetView.rootViewClass);
                                } else {
                    
                                    viewClasses = document.getElementsByClassName(option.targetView.rootViewClass);
                                }
                    
                                //Set your attributes in the LAST view
                                let targetAttrsView = viewClasses[viewClasses.length - 1];
                    
                                if(option.paginationEnabled){
                    
                                    //Get the pagination attributes from the appropriate element 
                                    const paginationEnd = targetAttrsView.getAttribute(DataManager._SERVER_SIDE_DATA_ATTRS.pagination.attrPaginationEnd);
                                    const paginationEndValue = paginationEnd === DataManager._SERVER_SIDE_DATA_ATTRS.values.true ? true : false;
                        
                                    const nextPageMarker = targetAttrsView.getAttribute(DataManager._SERVER_SIDE_DATA_ATTRS.pagination.attrNextPageMarker);

                                    myBuildArgs.setScopedAPIOption(option.scope, {

                                        enabled: true,
                                        paginationEnd: paginationEndValue,
                                        nextPageMarker: nextPageMarker
                                     });
                                }
                    
                                //Use the append order to know how to order the data (thus loop direct or in reverse)
                                let viewClassesArray = Array.from(viewClasses);
                                if(option.viewManagerOptions &&  option.viewManagerOptions.viewAppendOrder === "stack"){
                    
                                    viewClassesArray = ListReverser.reverseList(Array.from(viewClasses));
                                }

                                //Now load
                                const serverSideLoadedModels = await loadFromServerSideData(viewClassesArray, myBuildArgs.apiOptions.reqUtils, option.buildCbs.onServerSideLoad);

                                //Create them in data manager
                                myBuildArgs.createModelsCb(serverSideLoadedModels);

                                cbArgs.failNextCb({

                                    goToNext: true,
                                    buildArgs: cbArgs.buildArgs
                                });

                                /**
                                 * 
                                 * @param {Array<Element>} elementsArray 
                                 * @param {LifeCycleRemoteRequestUtils} reqUtils
                                 * @param {onServerSideLoadCb<M>} loadCallback
                                 * @param {*[]} modelsArray
                                 * 
                                 * @returns {Promise<Array<M>>}
                                 */
                                async function loadFromServerSideData(elementsArray, reqUtils, loadCallback, modelsArray = []){

                                    if(elementsArray.length > 0){

                                        const element = elementsArray.at(0);
                                        modelsArray.push(await loadCallback(element, reqUtils, modelsArray));
                                        elementsArray.splice(0, 1);

                                        return await loadFromServerSideData(elementsArray, reqUtils, loadCallback, modelsArray);
                                    } else {

                                        return modelsArray;
                                    }
                                }
                            }

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null,
                    },
                    onBuildEnd: {

                        prev: "buildServerSide",
                        next: null,
                        cb: (cbArgs) => {

                            //Tell its complete
                            cbArgs.buildArgs.myBuildArgs.apiOptions.serverSide.onServerSideBuildEnd();

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null,
                    }
                },
                jumpServerSideLoad: {

                    autoTriggerState: null,
                    root: "onBuildEnd",

                    onBuildEnd: {

                        prev: "setUpServerSide",
                        next: null,
                        cb: (cbArgs) => {

                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                },
                cancelServerSideDFA: {

                    autoTriggerState: null,
                    root: "onBuildEnd",

                    onBuildEnd: {

                        prev: "loadServerSideDFA", //Any point within this DFA. Doesn't matter
                        next: null,
                        cb: (cbArgs) => {

                            cbArgs.buildArgs.myBuildArgs.apiOptions.reqUtils.abortRunningRequests();
                            cbArgs.failNextCb({

                                goToNext: true,
                                buildArgs: cbArgs.buildArgs
                            });
                        },
                        fail: null
                    }
                }
            }
        }

        super(superArgs);
    }

    /**
     * @param {import("./load_server_side_pipeline_worker.d.ts.js").InitServerSideLoadArgs<M>} args 
     */
    initServerSideLoad(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: null,
            },
            targetDFAInfo: {

                dfaGroupKey: "loadServerSideDFA"
            },
            failStartCb: () => {

                console.error("Data manager failed to retrieve server-side data");
                args.mainCb();
            },
            completeCb: () => {

                args.mainCb();
            }
        });
    }

    /**
     * @param {import("./load_server_side_pipeline_worker.d.ts.js").InitServerSideLoadArgs<M>} args
     */
    cancelServerSideLoad(args){

        this.startPipelineBuild({

            myBuildArgs: args,
            buildDefinitionParams: {

                buildID: null,
            },
            targetDFAInfo: {

                dfaGroupKey: "cancelServerSideDFA"
            }
        });
    }
}

if(false){

    /**
     * @template M
     * @type {import("./load_server_side_pipeline_worker.d.ts.js").LoadServerSidePipelineWorkerConstructor<LoadServerSideDataPipelineStates, LoadServerSideBuildArgs<M>, LoadServerSidePipelineDFAGroups, null>}
     */
    const LoadServerSidePipelineWorkerCheck = LoadServerSidePipelineWorker;
}

export default LoadServerSidePipelineWorker;