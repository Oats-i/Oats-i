//@ts-check

import IntersectionDetectionUtils from "./utils/intersection_detection_utils.js";

/**
 * Just get what to observe at intersect, know the markers, cascade API interface calls (for this scope strictly)
 * allow or deny pagination based on markers
 * 
 * And detachObservers on delete of target observer or flushAll or bulk delete 
 * (update per cycle of delete, but batch update on attach (return set of attached views))
 * Or, just after the attach cycle completes, run the correct get
 * 
 * Also, when told to setUpObservers, pass in data length and viewNodePos as well, to match
 * to requested trigger position and doPagination
 * 
 * when doing pagination, just direct calls loadData() for dataManagerInstance;
 * 
 */

/**
 * @template M
 * @template {ArrayOnlyNestedKeys<M>} VMS
 */
class ListDataPaginator{

    /**
     * 
     * @param {import("./list_data_paginator.d.ts.js").ListDataPaginatorOptions<M, VMS>} args 
     */
    constructor(args){

        /**
         * @type {VMS}
         */
        this.scope = args.scope;
        /**
         * @type {string}
         */
        this.soleModelId = args.soleModelId;
        /**
         * @type {number}
         */
        this.paginationTriggerPos = args.triggerPos_ToLast ? args.triggerPos_ToLast : 6;
        /**
         * @type {DataManagerInstance<M>}
         */
        this.dataManager = args.dataManagerInstance;
        /**
         * @type {ListViewManagerInstance<M, VMS>}
         */
        this.listViewManager = args.listViewManagerInstance;
        this.rootViewOptions = args.viewOptions;
        /**
         * @type {import("DataManager").DataOperationsNetworkInterface<ValueTypeOfNested<M, VMS>, VMS, M>}
         */
        this.loadNewNetworkInterface = args.networkInterface;
        this.loadDataOptions = args.loadDataOptions;
        this.overrideNetworkInterface = this.initOverrideNetworkInterface();
        this.finalCallInterface = args.finalCallInterface;
        /**
         * @type {boolean}
         */
        this.doneFullPagination = args?.serverSidePaginationEnd;

        /**
         * @type {Element}
         */
        this.currentIntersectionTarget = null;
        /**
         * @type {string}
         */
        this.overrideLoadAddr = null;
    }

    /**
     * @type {ListDataPaginatorInstance<M, VMS>['initOverrideNetworkInterface']}
     */
    initOverrideNetworkInterface(){

        const getLoadNewNetworkInterface = () => {

            return this.loadNewNetworkInterface;
        }

        const getSelf = () => this;

        return {

            async getReqBody(addr, updatedModel, mutation, oldCompleteModel){

                return await getLoadNewNetworkInterface().getReqBody(addr, updatedModel, mutation, oldCompleteModel);
            },

            async onDataLoadPostProcess(reqAddr, response, newData, oldData, mutation, mappedDataId, extras){

                const data = await getLoadNewNetworkInterface().onDataLoadPostProcess(reqAddr, response, newData, oldData, mutation, mappedDataId, extras);
                if(data.extras?.paginationInfo[getSelf().scope]?.stopPagination !== undefined){

                    getSelf().setPaginationComplete(data.extras.paginationInfo[getSelf().scope].stopPagination);
                }
                return data;
            },

            onDataLoadError(reqAddr, response, newData, oldData, mutation){

                return getLoadNewNetworkInterface().onDataLoadError(reqAddr, response, newData, oldData, mutation);
            }
        }
    }

    /**
     * @type {ListDataPaginatorInstance<M, VMS>['setSoleModelId']} 
     */
    setSoleModelId(modelId){

        if(!this.soleModelId){

            this.soleModelId = modelId;
        }
    }

    /**
     */
    doPagination(){

        this.dataManager.loadData(this.scope, { modelID: this.soleModelId, mappedDataId: this.listViewManager.childOptions.parentMappedDataId }, this.loadDataOptions, this.overrideNetworkInterface, this.overrideLoadAddr).then((result) => {

            this.finalCallInterface?.onCompleteSuccess(result)
        }).catch((err) => {

            this.finalCallInterface?.onCompleteFail(err);
        });
    }

    /**
     * Called to refresh paginated list and load a new one
     * 
     * Flushes the right scope data then triggers a new load for the scope
     * 
     * NOTE: As long as you call this, and you actively set the doneFullPagination value at on data post process
     * the newly loaded data should have its pagination reset
     * 
     * @type {ListDataPaginatorInstance<M, VMS>['refreshList']}
     */
    refreshList(overrideLoadAddr){

        //Here, clear the scoped model first and then load a new list based on given params 
        //(accessible in interface)
        //So, introducing a new data manager method, flushScopedData(modelId, scope), 
        //modelID and scope accepting MODEL_ROOT AT THE SAME TIME to flushAllData

        //flush scopedData will just create a new mutation, with power to cancel all loadNewOperations for that scope
        //overwrite model for the scope to null and commit that
        //Then, you can trigger a loadNewMutation for that scope
        this.dataManager.flushScopedData(this.soleModelId, this.scope);
        this.overrideLoadAddr = overrideLoadAddr;
        this.doPagination();
    }

    /**
     * @type {ListDataPaginatorInstance<M, VMS>['setUpPaginationIntersector']}
     */
    setUpPaginationIntersector(){

        /**
         * Setting intersection point
        */
       //Remove currently being observed
        if(this.currentIntersectionObserver){
    
            this.currentIntersectionObserver.unobserve(this.currentIntersectionTarget);
            this.currentIntersectionObserver = null;
            this.currentIntersectionTarget = null;
        }

        //observe new
        const observerViewPort = this.listViewManager.getIntersectionObserverViewPort();
        const allViewNodes = observerViewPort.getElementsByClassName(this.rootViewOptions.componentViewClass);
        if(!this.doneFullPagination && allViewNodes?.length > this.paginationTriggerPos){

            this.currentIntersectionTarget = allViewNodes[allViewNodes.length - this.paginationTriggerPos];
            this.currentIntersectionObserver = IntersectionDetectionUtils.initIntersector(observerViewPort, 0.4, this.currentIntersectionTarget, this.doPagination.bind(this));
        }
    }

    /**
     * @type {ListDataPaginatorInstance<M, VMS>['updatePaginationIntersectorOnDelete']}
     */
    updatePaginationIntersectorOnDelete(deletedNode){

        if(this.currentIntersectionTarget === deletedNode){

            this.setUpPaginationIntersector();
        }
    }

    /**
     * @type {ListDataPaginatorInstance<M, VMS>['setPaginationComplete']}
     */
    setPaginationComplete(completed){

        this.doneFullPagination = completed;
    }
}

if(false){

    /**
     * @type {import("./list_data_paginator.d.ts.js").ListDataPaginatorInstance<*, *>}
     */
    const check = new ListDataPaginator(null);
}

export default ListDataPaginator;