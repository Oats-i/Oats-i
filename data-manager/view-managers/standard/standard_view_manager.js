//@ts-check
/**
 * The Standard View Manager assumes no list. So, single view. 
 * 
 * @todo Update nested types to accept array to only depth '0' i.e no children/nested. Ends at self 
 */

import ExclusiveStack from "../../../utils/abstract-data-types/exclusive-stack/exclusive_stack_adt";
import Queue from "../../../utils/abstract-data-types/queue/queue";
import RandomNumberCharGenUtils from "../../../utils/random-number-generator/random_number_char_generator";
import DataManager from "../../data_manager";

/**
 * @template {any} M
 * @template {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['views'] | ArrayOnlyNestedKeys<M>} G_S
 */
class StandardViewManager {

    /**
     * @param {DataManagerInstance<M>} dataManager
     * @param {import("StandardViewManager").DataManagerViewManagerConstructorOptions<M, G_S>} options
     */
    constructor(dataManager, options){

        this.lifecycleInstance = options.lifecycleOptions.instance;
        this.dataManager = dataManager;
        /**
         * @type {G_S}
         */
        this.scope = options.scope;
        /**
         * @type {StandardViewManagerInstance<M, G_S>['attachedModels']}
         */
        this.attachedModels = new Queue();
        /**
         * @type {string}
         */
        this.soleModelId = null;
        this.processServerSide = options.serverSide;
        /**
         * @type {StandardViewManagerInstance<M, G_S>['rootViewOptions']}
         */
        this.rootViewOptions = options.viewOptions; 
        Object.freeze(this.rootViewOptions);
        this.parentRootViewNode = null;
        this.baseViewAppendOrder = options.viewAppendOrder;
        this.baseViewCreateNewPos = options.createItemPos;
        /**
         * @type {StandardViewManagerInstance<M, G_S>['rootViewDataHooks']}
         */
        this.rootViewDataHooks = null;
        /**
         * @type {StandardViewManagerInstance<M, G_S>['componentViewDataHooks']}
         */
        this.componentViewDataHooks = null;
        /**
         * @type {StandardViewManagerInstance<M, G_S>['externalWatchDataHooks']}
         */
        this.externalWatchDataHooks = null;
        /**
         * @type {StandardViewManagerInstance<M, G_S>['childViewManagers']}
         */
        this.childViewManagers = [];
        /**
         * @type {ExclusiveStack<string>}
         */
        this.acceptedChildViewManagerScopes = new ExclusiveStack();
        /**
         * @type {StandardViewManagerInstance<M, G_S>['externalWatchChildViewManagers']}
         */
        this.externalWatchChildViewManagers = [];
        /**
         * @type {StandardViewManagerInstance<M, G_S>['id']}
         */
        this.id = options.id ? options.id : RandomNumberCharGenUtils.generateRandomNumChar(9);
        /**
         * @type {StandardViewManagerInstance<M, G_S>['isChildInfo']}
         */
        this.isChildInfo = options.isChild;
        //Set to a default
        if(!this.isChildInfo){

            this.isChildInfo = {};
        }
        //Freeze child info
        Object.freeze(this.isChildInfo);
        this.validateSelfAsChild();
        /**
         * @type {boolean}
         */
        this.isWatcherChild = options.isWatcherChild;
        /**
         * @type {StandardViewManagerInstance<M, G_S>['childOptions']}
         */
        this.childOptions = options.childOptions;
        if(!this.childOptions){

            //can't go around everywhere doing this ?
            this.childOptions = {};
        }
        /**
         * @type {StandardViewManagerInstance<M, G_S>['isWatcher']}
         */
        this.isWatcher = options.watcher;
        //Use to tell whether the view manager is running a custom filter function for the data
        //Mapping function doesn't return data but instead new index of data based on given info/list
        //i.e, orig index maps to this. That's what gives us the mapping index
        //TO BE IMPLEMENTED
        this.filteringData = false;
    }

    /**
     * Allows self to be child. Else, throws error
     */
    validateSelfAsChild(){
        
        if(this.isChildInfo.isChild){

            throw new Error("Standard View Manager can never be a child. Use List View Manager, if applicable");
        }
    }

    /**
     * @type {StandardViewManagerInstance<M, G_S>['setChildViewManager']} 
     */
    setChildViewManager(childViewManagerOptions){

        //Allow the nest to go deep from the parent. So, we can be creative with the views and their management
        //This is the STANDARD method for setting children view managers. It saves to list
        //Now, for PARENT, self invokes as view manager for scope in data manager. Data manager then calls its 
        //init with children args to run
        //For CHILDREN, invokes this, then sets its own children, if any in nested

        if(this.scope !== DataManager._MODEL_ROOT_SCOPE && !childViewManagerOptions.scope.toString().startsWith(this.scope.toString())){

            console.error("VIEW MANAGER: Child view manager must reference a child scope of this view manager's main scope");
            return;
        }
        
        //Add to list (only place we do)
        this.addChildViewManagerToList(childViewManagerOptions);

        if(!this.isChildInfo.isChild){

            //Set self as the view manager for the given child scopes 
            /**
             * @todo  (add a removeViewManager option. Will scour for id and remove all)
             */ 
            /**
             * @param {ChildViewManagerBuildOptions<M, ArrayOnlyNestedKeys<M>>[]} nestedChildManagers 
             */
            const setSelfAsViewManagerForNestedChildScopes = (nestedChildManagers) => {
                
                if(nestedChildManagers?.length){
                    
                    //run for self
                    nestedChildManagers.forEach((managerOptions) => {

                        //using null so as not to trigger children loop again on init call
                        this.dataManager.setViewManager(managerOptions.scope, this, null);
                        //call for it's nested (runs all per)
                        setSelfAsViewManagerForNestedChildScopes(managerOptions.nestedChildViewManagers);
                    });
                }
            }
            
            //First, for direct child being set (will trigger the init cycle for it)
            //Doing this so that if scope outside narrow scope of this view manager 
            //(say, you want to auto populate a list of categories as they're updated in a list), but for easier sync, 
            //actual data stored in a shallower scope outside the current view manager.
            //If that is updated, parent will be updated, and it will propagate to all child views
            //nested child views set up and init in init cycle after parent call, per build options
            this.dataManager.setViewManager(childViewManagerOptions.scope, this, {
                
                isChildInit: true,
                //Passing constructor so that a new view manager is spawned for each spawned root view by the parent view manager
                newChild: childViewManagerOptions.childViewManagerConstructor,
                constructorOptions: childViewManagerOptions.constructorOptions,
                hooks: childViewManagerOptions.hooks,
                nestedChildViewManagers: childViewManagerOptions.nestedChildViewManagers
            });
            
            //set scope for nested ones
            setSelfAsViewManagerForNestedChildScopes(childViewManagerOptions.nestedChildViewManagers);
        }
    }

    /**
     * Note. This one doesn't call init for current view manager, since no need to set scope
     * 
     * @todo To be implemented
     * @type {StandardViewManagerInstance<M, G_S>['setExternalWatchChildViewManager']}
     */
    setExternalWatchChildViewManager(dataManager, childViewManagerConstructor, options, hooks){

        if(this.isChildInfo.isChild){

            console.error("VIEW MANAGER ERROR: Cannot set a child view manager to a child view manager\nWell, can now sort of do that. REVISIT");
            return;
        } else {

            //Push to list
            this.externalWatchChildViewManagers.push({

                dataManager: dataManager,
                viewManagerConstructor: childViewManagerConstructor,
                constructorOptions: options,
                hooks: hooks
            });

            //If there's existing list of attached models, add to it
            this.attachedModels.forEach((attachedModel) => {

                if(!attachedModel.watcherChildViewManagers){

                    attachedModel.watcherChildViewManagers = [];
                }
                const watcherChildViewManagers = attachedModel.watcherChildViewManagers;
                //Set the right watcher options
                options.watcher = true;
                const watcherChildViewManager = new childViewManagerConstructor(dataManager, options);
                watcherChildViewManagers.push(watcherChildViewManager);
                watcherChildViewManager.initViewManager(null);
                watcherChildViewManager.setExternalWatchDataHooks(hooks);
            });
        }
    }
    
    /**
     * 
     * @param {import("StandardViewManager").DataManagerViewManagerConstructorOptions<M, *>} options 
     */
    setWatcherChildViewManagerOptions(options){

        options.isWatcherChild = true;
    }

    /**
     * 
     * @type {StandardViewManagerInstance<M, G_S>['setExternalWatchDataHooks']} 
     */
    setExternalWatchDataHooks(hooks){

        if(!this.isWatcher){

            console.error("DATA MANAGER ERROR: Cannot set external watch data hooks to a non-watcher")
        } else {

            if(!this.externalWatchDataHooks){

                this.externalWatchDataHooks = hooks;
            } else {

                console.warn("DATA MANAGER: Possible overriding external watch data hooks for view manager with id " + this.id);
                this.externalWatchDataHooks = { ...this.externalWatchDataHooks, ...hooks };
            }
        }
    }

    /**
     * HANDLE LIFE CYCLE
     * 
     * Build the existing models list, cue to commit, which will create relevant attached models list as per
     * 
     * Remove all attached views to model on destroy
     * @type {StandardViewManagerInstance<M, G_S>['initViewManager']}
     */
    initViewManager(childInitArgs){

        if(!childInitArgs?.isChildInit){
  
            //This should be called once!

            //Register to lifecycle.
            //Removes all attached root views to model on destroy
            this.getLifeCycleInstance().registerLifeCycleListeners({
    
                onFragmentCancelled: () => {},
                onFragmentRunning: () => {},
                onFragmentDestroyed: () => {
    
                    //Remove attached root views
                    /**
                     * No longer needed. Maintained internally at data manager - 
                     * removed from list of view managers, so no longer invoked, regardless of point in pipeline
                     */
                },
                onViewReady: () => {

                    //autopopulate the views - this will be called automatically when view is ready by lifecycle listener
                    // So, init mostly helpful with setting up children or any other functions we'll need, lifecycle attached (such as autopopulate)
                    //Now we can automatically trigger server side once the view is ready, or autopopulate
                    
                    //We call this only if not child. Else, child will be invoked by parent
                    if(!this.isChildInfo.isChild){

                        this.autoPopulateViewsFromExistingOrServerSide();
                    }
                }
            });

            //If a watcher, set itself as a watcher
            if(this.isWatcher){

                this.dataManager.setDataWatcher(this.scope, this);
            }

    
        } else {

            /**
             * Build the new child view manager based on relevant logic
             */
            //Add to attachedModelIds object and list, if one already exists, supporting late calls
            /**
             * Works for the passed child info (already added to main list. This just inflates it)
             */
            this.attachedModels.forEach((attachedModel) => {

                if(!attachedModel.orderedChildViewManagers){

                    attachedModel.orderedChildViewManagers = new Queue();
                }
                const childManagers = attachedModel.orderedChildViewManagers;
                const childViewManager = new childInitArgs.newChild(this.dataManager, { ...childInitArgs.constructorOptions, childOptions: {

                    parentDataIndex: attachedModel.itemPosition === undefined ? undefined : this.attachedModels.position(attachedModel),
                    parentMappedDataId: attachedModel.mappedDataId,
                    parentModelId: attachedModel.modelId,
                    parentOrderedArrayIndices: attachedModel.itemPosition === undefined ? new Queue() : this.getOrderedArrayIndices(this.scope, attachedModel.mappedDataId),
                    parentRootNode: attachedModel.attachedViewNode
                } });
                //build the child view manager method (basically builds the children's children)
                this.buildChildViewManager(childViewManager, childInitArgs, (completeCb) => {
                    
                    //call on commit - calling here first so that we have spawned attached models (hooks already set), before calling its children to build
                    //so chain can work well
                    childViewManager.onCommit("create", this.dataManager.getScopedModel(this.scope, attachedModel.mappedDataId, attachedModel.modelId, false), null, null, attachedModel.modelId, this.scope, this.scope, () => {}, {});
                });
                //Add to queue of spawned. Finalized
                childManagers.enqueue(childViewManager);
            });
        }
    }

    /**
     * @param {ChildViewManagerBuildOptions<M, ArrayOnlyNestedKeys<M>} childViewManagerBuildOptions 
     */
    addChildViewManagerToList(childViewManagerBuildOptions){

        this.childViewManagers.push({

            viewManagerConstructor: childViewManagerBuildOptions.childViewManagerConstructor,
            scope: childViewManagerBuildOptions.scope,
            constructorOptions: childViewManagerBuildOptions.constructorOptions,
            hooks: childViewManagerBuildOptions.hooks,
            nestedChildViewManagers: childViewManagerBuildOptions.nestedChildViewManagers
        });
        this.acceptedChildViewManagerScopes.push(childViewManagerBuildOptions.scope);
    }

    /**
     * Called to prepopulate the internal models list from existing models, including ones read from server side
     * 
     * HOW IT WORKS
     * 
     * When viewReady is called, and the view manager is NOT a child (that will be auto triggered by parent)
     * autoPopulate... checks if we have an existing model for the scope, and saves it in existing models list.
     * If we have a server-side flag, it assumes the existing data was hydrated from the server side script.
     * Therefore, when it calls onCommit with mutation create (cause its a directly created model), the flag isServerSideCreate is set to true. With this flag,
     * the manager runs hookServerSideViews in onCommit, which calls the root component hook onViewAttach after
     * spawning a new model for the view (s) - in the case of list view manager.
     * The hookServerSideViews method will return the new view info (s) that will be used to complete the rest of the
     * onCommit logic
     * If the existing model was not server side, normal onCommit logic will run, i.e a new view with its associated
     * attached model will be spawned, allowing view manager to autopopulate immediately they're added to scope by the data manager
     * and init
     * 
     * //Only thing is, because new children will not have been automatically triggered, have a method to reflag it to do so
     * if late addition, during init (based on whether we go an existing models list or not)
     */
    autoPopulateViewsFromExistingOrServerSide(){

        //Nothing for standard view. Can't also provide orderedArrayIndex cause it doesn't work with arrays
        //Limit its scope then to non-arrays? No. Might want to populate all at once, not in a list view. OK
        if(this.dataManager.hasData()){

            /**
             * Always a SINGLE model id, and at index 0 - for standard. Check list implementation
             * @type {string}
             */
            const modelId = this.dataManager.getModelId(0);
            //Standard always a parent. Source everything in scope
            if(this.scope === DataManager._MODEL_ROOT_SCOPE){

                this.existingModelsList = null;
                this.existingModelsList = this.dataManager.getModelInIndex(0);
            } else {

                //By default, will work with the first model in index for that scope.
                //Yes. Cause its parent, and no information about changing index
                //This is for a weird scenario. Warn
                console.warn(`STANDARD VIEW MANAGER ID: ${this.id}. Standard view manager scope is not MODEL_ROOT. Taking relevant scope in first model (index 0)`);
                console.error("In autoPopulateViewsFromExisting, after serverSide trigger");

                const data = this.reduceHookDataToScope(this.dataManager.getModelInIndex(0), "MODEL_ROOT", this.scope, null);
                this.existingModelsList = data;
            }

            //Now, autopopulate views, if not already server-side generated by calling onCommit
            if(this.existingModelsList){

                //our onCommit mutation will be create because that's exactly how it has come through
                //so, we didn't even have a temp spawn.
                //then, with the extra's flag, we won't actually inflate data
                //instead, will use the attachServerSideViews() logic
                //using the this.processServerSide flag to allow auto populates to be triggered normally using existing data
                this.onCommit("create", this.existingModelsList, null, null, modelId, this.scope, this.scope, () => {}, { isServerSideCreate: this.processServerSide });
            } else {

                console.error(`Cannot autopopulate views. Your scope ${this.scope} doesn't refer to any data`);
            }
        } else {

            // console.error("Run autopopulate, but data manager has no data")
        }
    }

    /**
     * 
     * Called AUTOMATICALLY when view is ready either for self or parent when init
     * 
     * @returns {ServerSideAttachedViewInfo}
     */
    hookServerSideViews(){

        if(this.processServerSide){

            //Only process if sth in master models. Else, don't process
            const modelID = this.dataManager.getModelId(0);
            const viewNode = this.rootViewOptions.reinflateRootViewOnNewModel ? this.getParentRootViewNode().querySelector(`#${this.rootViewOptions.reinflateContentViewNodeID}`) : this.getParentRootViewNode();
            const mappedId = this.spawnAttachedModels(modelID, viewNode);
            if(this.scope !== DataManager._MODEL_ROOT_SCOPE){

                //scope can validly be different, but just warn of this default behavior
                console.warn(`STANDARD VIEW MANAGER ID: ${this.id}. Standard view manager is not a child and scope is not MODEL_ROOT. Taking relevant scope in first model (index 0)`);
            }

            //call the onViewAttachHook since we won't be spawning a new view, but need to hook up listeners or whatever to already existing
            this.rootViewDataHooks.root.builder.onViewAttach(modelID, this.dataManager.getScopedModel(this.scope, null, modelID, false), viewNode, mappedId, { viewManagerRef: this, parentMappedDataId: this.childOptions.parentMappedDataId });

            return {

                mappedDataId: mappedId,
                viewNode: viewNode,
                modelId: modelID
            }

        } else {

            throw new Error("Calling attach server side views for non-server side processing view manager")
        }
    }

    /**
     * If ordered array index issues, root cause here (or starts here - getOrderedArrayIndices)
     * @param {string} modelId 
     * @param {Element} attachedViewNode
     * @returns {string} mappedId
     */
    spawnAttachedModels(modelId, attachedViewNode){

        const getMappedId = () => {

            return `${this.id}#${RandomNumberCharGenUtils.generateRandomNumChar(6)}`;
        }

        //position of given mappedDataId in queue is what ACTUALLY points us to where the item is in the model
        //Now, standard can ONLY be parent, but List can be child of self (recycle included as it inherits)
        //So, ONLY LIST can provide an orderedArrayIndex value
        //This will be item position, joined to parentDataIndex if child (Correction below)
        /**
         * @todo Update to deprecate parentDataIndex and have parentOrderedArrayIndices offered by a getter 
         * because index might move due to sorrounding delete mutations.
         * Remove itemPos
         */

        //SO, RULE 
        //Item position ALWAYS UNDEFINED for standard. Assumes model list of 1
        //Also, standard will ALWAYS return an empty queue for orderedArrayIndices (thus need for undefined too)
        const itemPos = undefined;
        if(this.scope !== DataManager._MODEL_ROOT_SCOPE){

            console.warn(`Standard View Manager being used and scope is not model root. Valid, but assuming a data index of 0 at model root (so, first model)`);
            console.warn(`If you have a list of models, consider using ListViewManager`);
        }

        /**
         * @type {string}
         */
        let mappedId = null;
        //For standard, we only spawn new if we have none. Otherwise, we just update at current, maintaining length 1
        if(!this.attachedModels.length){

            mappedId = getMappedId();
            this.attachedModels.enqueue({
    
                modelId: modelId,
                itemPosition: itemPos,
                mappedDataId: mappedId,
                attachedViewNode: attachedViewNode,
            });

            this.attachedModels.peek().orderedChildViewManagers = this.inflateOrderedChildViewManagers({ parentDataIndex: undefined, parentModelId: modelId, parentRootNode: this.getParentRootViewNode(), parentOrderedArrayIndices: new Queue(), parentMappedDataId: mappedId }), //passing new Queue as standard will ALWAYS not refer to an index
            this.attachedModels.peek().watcherChildViewManagers = this.getWatcherChildViewManagers({ parentRootNode: this.getParentRootViewNode() });
        } else {

            //just update sole/existing
            const soleAttachedModel = this.attachedModels.peek();
            soleAttachedModel.modelId = modelId;
            attachedViewNode ? soleAttachedModel.attachedViewNode = attachedViewNode : null;

            //mappedId same
            mappedId = soleAttachedModel.mappedDataId;
        }

        //mappedId ALWAYS provided
        return mappedId;
    }

    /**
     * 
     * @param {string} targetMappedDataId 
     */
    removeAttachedModel(targetMappedDataId){

        //We'll ONLY remove if we are set to always respawn. Otherwise, and for standard nonRespawn, first spawned will ALWAYS be the reference for the instance
        if(this.rootViewOptions.reinflateRootViewOnNewModel){

            this.attachedModels.sortDelete(this.attachedModels.find((model) => model.mappedDataId === targetMappedDataId));
        } else {

            console.warn("REMOVING ATTACHED MODEL Not removing attached model because view doesn't support respwaning")
        }
    }
    
    /**
     * 
     * @param {string} targetMappedDataId 
     * @param {Element} viewNode 
     * @returns 
     */
    updateAttachedModel(targetMappedDataId, viewNode, modelId){

        const targetModel = this.attachedModels.find((model) => model.mappedDataId === targetMappedDataId);
        targetModel.attachedViewNode = viewNode;
        targetModel.modelId = modelId;
        return targetMappedDataId;
    }

    /**
     * 
     * @param {string} mappedDataId 
     * @param {(viewManager: StandardViewManagerInstance<M, *>, cb: genericFunction) => void} invocation 
     * @param {genericFunction} completeCb 
     */
    invokeChildViewManagers(mappedDataId, invocation, completeCb){
        
        /**
         * @type {QueueInstance<ListViewManagerInstance<M, NestedChildKeysOfArray_ArrayOnly<M, G_S>>>}
         */
        let validChildViewManager = new Queue();
        //Will only call ONCE for non "new" mutations with specificity provided by mappedDataId (found in child)
        const recursiveCallViewManagers = () => {

            if(validChildViewManager.length){

                invocation(validChildViewManager.dequeue(), () => {

                    recursiveCallViewManagers();
                });
            } else {

                completeCb();
            }
        }

        let attachedModel = this.attachedModels.find((model) => model.mappedDataId === mappedDataId);
        //If we got it from the parent, we just invoke ALL view managers
        //Else, if it's from the child, then we hunt for that one specific child we should invoke
        //We also allow pass to children even if we found mappedId there cause of "new" mutations
        const mappedDataIdInParent = !!attachedModel;
        //search in all for one where child view manager has that mapped data id
        //Then sift for specific in that model
        if(!attachedModel){

            this.attachedModels.forEach((model) => {

                model.orderedChildViewManagers?.forEach((manager) => {

                    if(manager.hasMappedDataId(mappedDataId)){

                        attachedModel = model;
                        return true;
                    }
                });

                if(attachedModel){

                    return true;
                }
            });
        }
        //Found a specific view manager associated with the mappedDataId
        if(attachedModel){

            //setting as new queue to just avoid null pointers
            const allChildViewManagers = attachedModel.orderedChildViewManagers?.copy() || new Queue();
            //Get that ONE that has the mappedDataId in children
            if(!mappedDataIdInParent){

                allChildViewManagers.forEach((manager) => {
    
                    if(manager.hasMappedDataId(mappedDataId)){
    
                        validChildViewManager.enqueue(manager);
                    }
                });
            } else {

                //Parent matched. 
                //Seems like we should pass nothing here (empty queue. We have a mappedDataId, so target specific, and it is parent)
                //BUT
                //Fails for loadNew, uploadNew, create, i.e "new" mutations where ALL children MUST be triggered to handle their own scopes
                validChildViewManager = allChildViewManagers;
            }

            recursiveCallViewManagers();
        } else {

            if(this.attachedModels.length === 0){

                // console.error(`No attached model to invoking child view managers. Probably been flushed. Affected mappedDataId: ${mappedDataId}`);
            } else {

                //might be a flush all or delete all (delete_FlushAll) event (probably affecting this scope, so next calls will fall into first block). Therefore, all attached models are going. Those don't pass a mappedDataId
                this.attachedModels.forEach((model) => {

                    if(model.orderedChildViewManagers){

                        validChildViewManager.join(model.orderedChildViewManagers);
                    }
                });

                //Create an array for them
                /**
                 * @type {ListViewManagerInstance<M, NestedChildKeysOfArray_ArrayOnly<M, G_S>>[]}
                 */
                const childManagersFullArray = [];
                validChildViewManager.forEach((manager) => {

                    childManagersFullArray.push(manager);
                });

                //create a set
                const childManagersSetArray = Array.from(new Set(childManagersFullArray));
                //now clear and push the set to valid
                validChildViewManager.clear();
                childManagersSetArray.forEach((manager) => {

                    validChildViewManager.enqueue(manager);
                });
            }
            //now invoke
            recursiveCallViewManagers();
        }
    }

    /**
     * @param {import("StandardViewManager").StandardViewManagerChildOptions} childOptions 
     * @returns 
     */
    inflateOrderedChildViewManagers(childOptions){

        //Start with normal ones
        /**
         * @type {Queue<StandardViewManagerInstance<M, *>>}
         */
        const localChildViewManagers = new Queue();
        this.childViewManagers.forEach((option) => {

            //Set correct options. Potentially overriding for user? Can make their error detection hard?
            option.constructorOptions.isChild = { isChild: true };
            option.constructorOptions.childOptions = { ...option.constructorOptions.childOptions, ...childOptions };
            const childManager = new option.viewManagerConstructor(this.dataManager, option.constructorOptions);
            this.buildChildViewManager(childManager, option);
            localChildViewManagers.enqueue(childManager);
        });

        return localChildViewManagers;
    }

    /**
     * @template {NestedChildKeysOfArray_ArrayOnly<M, G_S>} ChildScope
     * @param {ListViewManagerInstance<M, ChildScope>} childViewManager 
     * @param {ChildViewManagerBuildOptions<M, ChildScope>} childInitArgs
     * @param {genericParamFunction<genericFunction>} [preInitChildrenCb]
     */
    buildChildViewManager(childViewManager, childInitArgs, preInitChildrenCb){

        const initNestedChildren = () => {

            /**
             * Will work like DFS (depth first search - invokes depth first till end. Setting per)
             * This is how this will invoke the tree downwards
             * Call its nested children 
             */
            if(childInitArgs.nestedChildViewManagers?.length){
                
                childInitArgs.nestedChildViewManagers.forEach((managerBuildOptions) => {
                    
                    //First, if child, add nested to itself as its child view managers
                    //Call setChildViewManager
                    childViewManager.setChildViewManager(managerBuildOptions);
                    
                    //Now, init each of its children - will cycle to init self (with null), then set its children, to init themselves again (cycle)
                    
                    //set the nested as child for this child. That will run it's own init cycle
                    //Passing constructor so that a new view manager is spawned for each spawned root view by the parent view manager
                    //root has already taken over the scopes
                    //SO, KINDLY NOTE
                    //Root takes over scopes (all)
                    //each child sets its own nested and inits with it
                    childViewManager.initViewManager({ 
                        
                        isChildInit: true,
                        newChild: managerBuildOptions.childViewManagerConstructor,
                        constructorOptions: managerBuildOptions.constructorOptions,
                        hooks: managerBuildOptions.hooks,
                        nestedChildViewManagers: managerBuildOptions.nestedChildViewManagers
                    });
                });
            }
        }

        //register hooks (thinking of having this in constructor too caus of race condition with init, if hooks not yet registered)
        //For now, know that init last to call
        //thankfully, in parent flow, init only called when you set to data manager
        childViewManager.registerViewDataHooks(childInitArgs.hooks.rootHooks, childInitArgs.hooks.componentHooks);
        //init it - passing null to first run it.
        childViewManager.initViewManager(null);
        if(preInitChildrenCb){

            preInitChildrenCb(() => {

                initNestedChildren();
            });
        } else {

            initNestedChildren();
        }
    }

    /**
     * @param {Pick<import("StandardViewManager").StandardViewManagerChildOptions, "parentRootNode">} childOptions 
     * @returns 
     */
    getWatcherChildViewManagers(childOptions){

        /**
         * Then watchers
         * @type {StandardViewManagerInstance<*, *>[]}
         */
        const externalChildViewManagers = [];
        this.externalWatchChildViewManagers.forEach((option) => {

            option.constructorOptions.childOptions = { ...option.constructorOptions.childOptions, ...childOptions };
            option.constructorOptions.isWatcherChild = true;
            const childManager = new option.viewManagerConstructor(option.dataManager, option.constructorOptions);
            externalChildViewManagers.push(childManager);
            childManager.setExternalWatchDataHooks(option.hooks);
            childManager.initViewManager(null);
        });

        return externalChildViewManagers;
    }

    /**
     * The implementation below is for standard only
     * @type {StandardViewManagerInstance<M, G_S>['runRootAndViewNodeBuild']} 
     */
    runRootAndViewNodeBuild(mutation, modelId, data, overrideSpawnedMappedDataId){

        if(this.getParentRootViewNode() && this.rootViewDataHooks && this.rootViewOptions && data){ //Only run if there's data

            /**
             * @type {Element}
            */
           let viewNode = null;
           if(this.rootViewOptions.reinflateRootViewOnNewModel){
               
                //Attach new child
                const template = this.rootViewDataHooks.root.builder.inflateRoot(data);
                this.getParentRootViewNode().insertAdjacentHTML("beforeend", template.inflatedView);    
            }

            //Get the view node and update (not using this - first if)
            if(this.rootViewOptions.reinflateContentViewNodeID){

                // viewNode = this.getParentRootViewNode().getElementsByClassName(this.rootViewOptions.componentViewClass)[0];
                viewNode = this.getParentRootViewNode().querySelector(`#${this.rootViewOptions.reinflateContentViewNodeID}`);
            } else {

                viewNode = this.getParentRootViewNode();
            }
            //Create a sample model for attached models if none - needed for getting ordered array indices
            //automatically mimicking override behavior in standard. Reason being, if empty (thus no override) we spawn new. And that's fine
            let mappedId = null; 
            if(this.attachedModels.isEmpty()){

                //This possible cause of create mutation. We only create a temp spawn if in other "new" mutations that don't trigger onMutate
                mappedId = this.spawnAttachedModels(this.soleModelId, viewNode);
            } else {

                if(!overrideSpawnedMappedDataId){

                    throw new Error("MUST have an override mapped data id if attached models is empty");
                }
                //Updating view node cause of initial build
                this.updateAttachedModel(overrideSpawnedMappedDataId, viewNode, this.soleModelId);
                mappedId = this.attachedModels.peek().mappedDataId;
            }

            this.rootViewDataHooks.root.builder.onViewAttach(this.soleModelId, data, viewNode, mappedId, { viewManagerRef: this, parentMappedDataId: this.childOptions.parentMappedDataId });

            return { viewNode: viewNode, mappedDataId: mappedId };
        } else {

            if(!this.rootViewDataHooks){

                console.warn("DATA MANAGER VIEW MANAGER: Attempted to run initial root build but no root view hooks provided");
            }

            if(!this.rootViewOptions){

                console.warn("DATA MANAGER VIEW MANAGER: Attempted to run initial root build but no root view options provided");
            }
        }
    }

    /**
     * The implementation below is for standard only
     * @type {StandardViewManagerInstance<M, G_S>['detachViewNodeFromRootParent']} 
     */
    detachViewNodeFromRootParent(mutation, modelId, data, mappedDataId){

        if(mutation === "delete_FlushAll"){

            if(this.rootViewOptions.reinflateRootViewOnNewModel){

                //detach current child
                this.getParentRootViewNode().removeChild(this.attachedModels.peek().attachedViewNode);
            } else {

                //tell of change through commit calls
                this.invokeRootComponentHooks("delete_FlushAll", null, null, this.attachedModels.peek()?.mappedDataId, null, this.scope, (targetScope, newScopedData) => {

                    this.componentViewDataHooks[targetScope].hooks.onCommit(modelId, mutation, null, null, newScopedData, this.attachedModels.peek()?.attachedViewNode, mappedDataId, { viewManagerRef: this, parentMappedDataId: this.childOptions.parentMappedDataId });
                }, () => {});
            }
            //clear attached models - to allow reattachment and spawning new children on loadNew
            this.attachedModels.clear();
        } else {

            if(!mappedDataId){
    
                mappedDataId = this.getMappedDataIdThatMatchesProperties(data);
            }
            const targetViewNode = this.getViewNodeForMappedDataId(mappedDataId);
            if(targetViewNode){
    
                //Invoke the correct hook
                //For performance reasons, we don't wait for animation to finish to invoke next
                //Only wait to do actual detaching, but deleted from attachedModels already.
                //Just waiting for say animations before removing from DOM
                if(this.rootViewDataHooks && this.rootViewOptions.reinflateRootViewOnNewModel){

                    this.rootViewDataHooks.root.builder.onViewDetach(modelId, data, targetViewNode, mappedDataId, () => {
    
                        //detach current child
                        this.getParentRootViewNode().removeChild(targetViewNode);
                    });
                    //clear attached models
                    this.attachedModels.clear();
                }
            } else {
    
                console.error("Cannot detach view node. Not found for mappedDataId " + mappedDataId);
            }
        }
    }

    /**
     * 
     * So, have two versions. CORRECT WAY AS PER ALGO (just return empty queue. Join will handle the rest - check usage in data manager)
     * 
     * Doing so because, this is NOT managing a list. So no particular index. Even if child
     * 
     * Scope used to determine if ordered array indices valid (only if scope not model root)
     * @type {StandardViewManagerInstance<M, G_S>['getOrderedArrayIndices']} 
     */
    getOrderedArrayIndices(scope, mappedDataId){

        //logic below considers self and children
        //so, can safely call super for list after considering if child, to now get self and children
        /**
         * @type {ViewManagerOrderedArrayIndices}
         */
        const orderedArrayIndices = new Queue();

        //if there's no mappedDataId, just return empty queue. Happens
        if(!mappedDataId){

            return orderedArrayIndices;
        }

        //New logic using mappedDataId
        //Had a problem cascading the clicked on ones. 
        //Fixed by, if mappedDataId not in parent, then in child. Cascade to it
        //Valid child checked using hasMappedDataId() method
        if(this.attachedModels.length){

            //Find target
            const target = this.attachedModels.find((model) => model.mappedDataId === mappedDataId);
            //Target found. Last call
            if(target){
                
                //getting position of matching model, to make delete mutations as easy as sort delete
                orderedArrayIndices.enqueue(this.attachedModels.position(target));

                //logic below transferred to list when it starts. So, here is just enqueing the hit in self. Else, below
                //If child, join the one in child options to this
            } else {

                //Might be in the layers of children. Check. If a child matches, map to that position for parent
                //So, parent also passess
                let foundManager = false;
                this.attachedModels.forEach((model) => {

                    model.orderedChildViewManagers?.forEach((manager) => {

                        if(manager.hasMappedDataId(mappedDataId)){

                            orderedArrayIndices.join(manager.getOrderedArrayIndices(scope, mappedDataId));
                            foundManager = true;
                            return true;
                        }
                    });
                });

                if(!foundManager){

                    console.error("Potential data indexing issue. Couldn't find manager with matching mappedDataId, even in children: " + mappedDataId);
                }
            }
        } else {

            if(mappedDataId){

                console.error("VIEW MANAGER: Asking for ordered array indices while no view has been attached. Potential code error. Why does this manager have no view yet?\nStack trace should point to first view attachment for list or recycle view manager. Else, potential bug. Will return an empty queue\n\nVal: " + mappedDataId + " managerId " + this.id );
            } else {
                
                console.error("VIEW MANAGER: Asking for ordered array indices while no view has been attached. Potential code error. Why does this manager have no view yet?\nStack trace should point to first view attachment for list or recycle view manager. Else, potential bug. Will return an empty queue");
            }
        }

        return orderedArrayIndices;
    }

    /**
     * @type {StandardViewManagerInstance<M, G_S>['hasMappedDataId']}
     */
    hasMappedDataId(mappedDataId){

        let target = this.attachedModels.find((model) => model.mappedDataId === mappedDataId);
        //Check children if we don't have
        if(!target){

            this.attachedModels.forEach((model) => {

                model.orderedChildViewManagers?.forEach((manager) => {

                    if(manager.hasMappedDataId(mappedDataId)){

                        target - model;
                        return true;
                    }
                });

                if(target){

                    return true;
                }
            });
        }

        return !!target;
    }

    /**
     * Return a mappedDataId that matches the given properties
     * 
     * Note: Was to do for global too, and have common comparator
     * Could have been useful if say, a global id in higher scope (parent) to this
     * But no. Redundant since in a nested scenario, it is same for all, since they have SAME parent
     * 
     * @type {StandardViewManagerInstance<M, G_S>['getMappedDataIdThatMatchesProperties']} 
     */
    getMappedDataIdThatMatchesProperties(properties){

        let matchingMappedDataId = null;
        this.attachedModels.forEach((model) => {

            let inModelValue = null;
            if(this.scope === DataManager._MODEL_ROOT_SCOPE){

                inModelValue = this.dataManager.getModel(model.modelId);
            } else {

                inModelValue = this.dataManager.getScopedModel(this.scope, model.mappedDataId, model.modelId, false);
            }

            let failMatch = false;

            if(JSON.stringify(properties) === JSON.stringify(inModelValue)){

                //Direct match. Only works for literals or objects that can be stringified
                matchingMappedDataId = model.mappedDataId;
                return true;
            }
            
            //Object check only hope
            //Doing this allows partial attributes, not whole to be passed. But expensive on cycles by shallow depth of properties
            if(typeof properties === "object" && inModelValue){

                try{

                    //Confirm ALL properties given match
                    //Will only work if properties can be stringified into JSON
                    for(const property in properties){

                        if(JSON.stringify(properties[property]) !== JSON.stringify(inModelValue[property])){

                            failMatch = true;
                        }
                    }

                    if(!failMatch){

                        ///Found something. Break
                        matchingMappedDataId = model.mappedDataId;
                        return true;
                    }
                } catch(err){

                    console.error("Failed to check matching properties");
                    console.log(err);
                }
            } else {

                //Potential flaw in algo?
            }
        });

        if(!matchingMappedDataId){

            console.warn("Not found matching view node for your properties:");
        }

        return matchingMappedDataId;
    }

    /**
     * @type {StandardViewManagerInstance<M, G_S>['getViewNodeForMappedDataId']}
     */
    getViewNodeForMappedDataId(mappedId){

        const targetModel = this.attachedModels.find((model) => model.mappedDataId === mappedId);

        return targetModel?.attachedViewNode;
    }

    /**
     * @type {StandardViewManagerInstance<M, G_S>['getModelIdForMappedDataId']} 
     */
    getModelIdForMappedDataId(mappedDataId){

        let modelID = null;
        this.attachedModels.forEach((model) => {

            if(model.mappedDataId === mappedDataId){

                modelID = model.modelId;
                return true;
            }
        });

        return modelID;
    }

    /**
     * Gets the parentViewNode
     * @type {StandardViewManagerInstance<M, G_S>['getParentRootViewNode']}
     */
    getParentRootViewNode(){

        // Doesn't consider if child in standard, cause standard NEVER works as a child (component by default in list is a standard, that's why ONLY list can be child)
        // So, remove ALL child considerations here
        !this.parentRootViewNode ? this.parentRootViewNode = document.getElementById(this.rootViewOptions.parentNodeID) : null; 
        if(!this.parentRootViewNode){

            console.warn("DATA MANAGER VIEW MANAGER: Attempted to run root and view node build but parent with id " + this.rootViewOptions.parentNodeID + " has not been manually attached to the view. Ensure it already exists in markup");
            return null;
        }

        return this.parentRootViewNode;
    }

    /**
     * @type {StandardViewManagerInstance<M, G_S>['getLifeCycleInstance']}
     */
    getLifeCycleInstance(){

        return this.lifecycleInstance;
    }

    /**
     * @type {StandardViewManagerInstance<M, G_S>['registerViewDataHooks']}
     */
    registerViewDataHooks(rootHooks, componentHooks){

        if(this.isWatcher){

            console.error("DATA MANAGER VIEW MANAGER ERROR: Cannot register view data hooks on a watcher. Use setExternalWatchDataHooks instead");
            return;
        }

        //Only sets if not set before and root view options have been provided
        //Removed this check this.rootViewOptions && 
        if(!this.rootViewDataHooks && !this.componentViewDataHooks){

            this.rootViewDataHooks = rootHooks;
            this.componentViewDataHooks = componentHooks;
            return true;
        }

        return false;
    }

    /**
     * The APIscope is the scope of the mutation request
     * A view manager can take a scope larger or smaller than it, as long as it's related, meaning its a parent or child to it 
     * 
     * Therefore, only valid operation, where data is not null, is reducing API scope data to 
     * view manager's scope. This is for LARGER scopes where it is a child. For where the scope is a child,
     * only fire where child matches or is parent. 
     * 
     * How do we pick that up then? - Infer a parent from a child: child will start with parent scope
     * 
     * @type {StandardViewManagerInstance<M, G_S>['onMutate']}
     * 
     * Expected non-array for modelIDs
     * @todo ensure data can pass as an array, for a simple, single render list view
     * @template ReqScope
     * @param {string} modelID
     * @param {Partial<ValueTypeOfNested<M, ReqScope>>} newModel
     * @param {Partial<ValueTypeOfNested<M, ReqScope>>} oldModel
     * @param {ReqScope} APIScope
     */
    onMutate(mutation, newModel, oldModel, mappedDataId, modelID, APIScope, completeCb, extras){

        //a general scope check (a fail means it simply cannot run for it)
        if(this.canRunHooks(APIScope)){
            
            //Now, a specific scope test.
            //Will fail if this view manager's scope is not the same as this. So, will run children
            //RUN ONLY IF CAN RUN FOR API SCOPE
            //Doing second check here cause of limitations with loadNew
            if(this.canRunHooks(APIScope, true)){

                //INFERRING VIEW NODE - reduction includes child data. And, using mappedId. Cause of nulls with recycle
                //That will prevent correct inference
                //Can then update getting view node by properties to getting mappedId by properties. 
        
                //Now, every view manager works with data to its scope.
                //However, can sometimes be triggered from a higher scope
                //Reduce data to workable scope
                //Also, SOLVE THE COMMIT ISSUE FOR DATA - OVERWRITING LIKE BEFORE? WHY? REFERENCE?
                const newViewManagerScopedData = this.reduceHookDataToScope(newModel, APIScope, this.scope, mappedDataId);
                const oldViewManagerScopedData = this.reduceHookDataToScope(oldModel, APIScope, this.scope, mappedDataId);
        
                if(mutation === "loadNew" || mutation === "uploadNew"){
        
                    // loadNew and uploadNew represent mutations that add to the model or scope of the model. That's why prePost
                    // for scope specificity, mappedDataId allowed to trigger only befitting children for a mutation. So, mappedDataId will be passed around to facilitate that
                    // but permissible for children only
                    if(mappedDataId && !this.isChildInfo.isChild){
        
                        //add for create in commit
                        console.error(`Received a mapped data ID for view manager ${this.id} and scope ${this.scope} | APIScope: ${this.scope} for a "new" mutation ${mutation}`);
                        console.warn(`Will safely assume this specific view manager's implementation has no child. So, can run mutation here and nullify provided mapped data id`);
                        mappedDataId = null;
                    }
        
                    //Thinking of creating a shell for this. Removed onCancel of this mutation
                    //Allows relevant child view managers to register these changes as well
                    //however, no view nodes attached, especially for lists. Tricky. 
                    //standard presumably already has (algo assumes exists in parent, not component if reinflate)
        
                    
                    //Tell the hooked views. Extract model and value
                    //Coming from pipeline
                    //Tell in direct scope. Children, only if data changing (use scope to infer between old data and new data)
                    
                    //Telling directly hooked
                    if(this.rootViewDataHooks && this.dataComparator(newModel, oldModel, APIScope, mappedDataId).base()){
                        
                        //Sending rootView here, to allow attachment of lazy loaders. So, not specific viewNode of item, in case of list or recycle
                        this.rootViewDataHooks.root.prePostRootAttachHooks.onMutate(modelID, mutation, newViewManagerScopedData, oldViewManagerScopedData, this.getParentRootViewNode(), { viewManagerRef: this, parentMappedDataId: this.childOptions?.parentMappedDataId });
                        
                        /**
                         * This behavior is ONLY for loadNew or uploadNew
                         */
                        //REMEMBER, mappedDataId only points us to data of THIS scope. So, ALL can have, of the given view
                        //This still valid - also so that each view can aptly be targeted to its data in tree
                        //Therefore, if data comparator works, we spawn. Else, nothing
                        //Spawning helps us create children view managers and invoke them, who will invoke their own
        
                        // now pass around temp (add to array) - created if not provided
                        // can be provided in case of error cycling (i.e hit retry, so came back here)
                        const tempSpawnMappedDataId = extras.tempMappedDataIdInfo ? extras.tempMappedDataIdInfo.tempMappedDataId : this.spawnAttachedModels(modelID, null);
                        /**
                         * @type {TempMappedDataIdsInfo[]}
                         */
                        const childrenTempMappedDataIdsInfo = [];
        
                        //invoke the child view managers
                        //take SPECIFIC to the attachedModel with mappedDataId.
                        this.invokeChildViewManagers(tempSpawnMappedDataId, (viewManager, cb) => {
        
                            viewManager.onMutate(mutation, newModel, oldModel, mappedDataId, modelID, APIScope, (tempSpawnMappedDataIdInfo) => {
        
                                //add to children's list, if we don't have extras
                                !extras.tempMappedDataIdInfo ? childrenTempMappedDataIdsInfo.push(tempSpawnMappedDataIdInfo) : null;
                                cb();
                            }, extras.tempMappedDataIdInfo ? { tempMappedDataIdInfo: extras.tempMappedDataIdInfo.childrenInfo.find((info) => info.viewManagerId === viewManager.id)} : extras );
                        }, () => {
        
                            //send for all and children, if none in extras. Pass null not to add to it
                            completeCb(extras.tempMappedDataIdInfo ? null : { tempMappedDataId: tempSpawnMappedDataId, viewManagerId: this.id, childrenInfo: childrenTempMappedDataIdsInfo });
                        });
                    } else {
        
                        completeCb(null);
                    }
                } else {
        
                    //In else here because for mutation with loadNew or uploadNew, rootView changing so component hooks should not be triggered
                    const viewNode = this.getViewNodeForMappedDataId(mappedDataId);
                    //alternatively, passed original FOR ALL for correct scoping
                    this.invokeRootComponentHooks(mutation, newModel, oldModel, mappedDataId, modelID, APIScope, (targetScope, newScopedData, oldScopedData) => {
            
                        this.componentViewDataHooks[targetScope].hooks.onMutate?.(modelID, mutation, newViewManagerScopedData, oldViewManagerScopedData, newScopedData, viewNode, mappedDataId, { viewManagerRef: this, parentMappedDataId: this.childOptions.parentMappedDataId });
                    }, () => {
            
                        this.invokeChildViewManagers(mappedDataId, (viewManager, cb) => {
        
                            viewManager.onMutate(mutation, newModel, oldModel, mappedDataId, modelID, APIScope, () => {
            
                                cb();
                            }, extras);
                        }, () => {
            
                            completeCb(null);
                        });
                    });
                }
            } else {

                //just fire children. Expecting a mappedDataId held by self, or a child (might be a parent to another)
                //will be resolved by invoke method
                if(!mappedDataId){

                    /**
                     * Developer to do this
                     * 
                     * If "new" (loadNew, uploadNew, or create) mutation is scope specific, you can pass in the mappedDataId.
                     * However, this will ONLY be allowed for children because of targeting
                     * 
                     * This is the mappedData id for the viewNode that the child view manager will also be attached to
                     * (remember lists spawn per view node)
                     * Also, it can be the parentMappedDataId in the child, which will match mappedDataId for each viewNode its spawned in
                     */
                    throw new Error(`Data operation is of a specific scope, but no mapped data id provided.\nScope: ${this.scope} | APIScope: ${APIScope}`);
                }

                //invoke the child view managers DIRECTLY
                //take SPECIFIC to the attachedModel with mappedDataId.
                /**
                 * @type {TempMappedDataIdsInfo[]}
                 */
                const childrenTempMappedDataIdsInfo = [];
                this.invokeChildViewManagers(mappedDataId, (viewManager, cb) => {

                    viewManager.onMutate(mutation, newModel, oldModel, mappedDataId, modelID, APIScope, (tempSpawnMappedDataIdInfo) => {

                        //add to children's list, if we don't have extras
                        !extras.tempMappedDataIdInfo ? childrenTempMappedDataIdsInfo.push(tempSpawnMappedDataIdInfo) : null;
                        cb();
                    }, extras.tempMappedDataIdInfo ? { tempMappedDataIdInfo: extras.tempMappedDataIdInfo.childrenInfo.find((info) => info.viewManagerId === viewManager.id)} : extras );
                }, () => {

                    //send for all and children, if none in extras. Pass null not to add to it
                    //because of dfs like algo, first call will get to last node without tempMappedDataInfo provided 
                    //so will collect from last child to root safely
                    //parent will have no temp because unassociated with changes
                    completeCb(extras.tempMappedDataIdInfo ? null : { tempMappedDataId: null, viewManagerId: this.id, childrenInfo: childrenTempMappedDataIdsInfo });
                });
            }
        } else {

            //Bouncing hooks
            // console.warn(`View manager bouncing hooks. id: ${this.id} | scope: ${this.scope} | APIScope: ${APIScope}`);
            completeCb({});
        }
    }

    /**
     * @type {StandardViewManagerInstance<M, G_S>['onCommit']}
     */
    onCommit(mutation, newData, oldData, mappedDataId, modelId, APIScope, originalScope, completeCb, extras){

        if(this.canRunHooks(APIScope)){

            if(this.canRunHooks(APIScope, true)){

                //Dealing with edge cases of loadNew where response 200 OK but no data, thus no modelID
                if(modelId){
        
                    //Standard doesn't work with arrays
                    let correctedNewData = newData;
                    let correctedOldData = oldData;
                    let correctedModelId = modelId;
                    if(Array.isArray(modelId)){
            
                        correctedModelId = modelId[0];
                    }
                    //Data should be OK as array. Just modelIds not
                    //but not if scope is MODEL_ROOT for both API and view manager. Will take first in index
                    if(this.scope === DataManager._MODEL_ROOT_SCOPE && APIScope === DataManager._MODEL_ROOT_SCOPE){
    
                        if(Array.isArray(newData)){
            
                            correctedNewData = newData[0];
                            console.warn(`Passing array data for standard view manager of scope ${DataManager._MODEL_ROOT_SCOPE}. Truncated to first index`);
                        }
            
                        if(Array.isArray(oldData)){
            
                            correctedOldData = oldData[0];
                            console.warn(`Passing array data for standard view manager of scope ${DataManager._MODEL_ROOT_SCOPE}. Truncated to first index`);
                        }
                    }
                    const newViewManagerScopedData = this.reduceHookDataToScope(correctedNewData, APIScope, this.scope, mappedDataId);
                    const oldViewManagerScopedData = this.reduceHookDataToScope(correctedOldData, APIScope, this.scope, mappedDataId);
            
                    //Handle delete mutation
                    if((mutation === "delete" || mutation === "delete_FlushAll") && (APIScope === DataManager._MODEL_ROOT_SCOPE || APIScope === this.scope)){
            
                        //invoke for children first, then remove self
                        //parent after children removed
                        this.invokeChildViewManagers(mappedDataId,(viewManager, cb) => {
                            
                            viewManager.onCommit(mutation, newData, oldData, mappedDataId, modelId, APIScope, () => {
                                
                                cb();
                            }, extras);
                        }, () => {
                            
                            //Now remove self, if scope is for self
                            if(APIScope === this.scope || this.scope.toString().startsWith(APIScope)){
    
                                //If the APIScope is model root or matches this scope data is being deleted. View no longer relevant
                                //Else, normal mutation flow followed
                                this.detachViewNodeFromRootParent(mutation, modelId, newViewManagerScopedData, mappedDataId);
                            }
                            completeCb();
                        });
                    } else {
    
                        /**
                         * Cheesy analogy but it will help
                         * Take view manager as a canvas and art
                         * We always have the canvas (parent node)
                         * This is what prePost root attach hooks allow you update on
                         * But then, once some data exists/is commited, we have the art
                         * And component hooks allow us to update dynamically changes to bits of that art
                         */
        
                        //Calling this first. Makes sense. We tell "canvas" we've committed, then draw to it
                        if(!extras?.isServerSideCreate){
    
                            //Call for root view hooks
                            if(this.rootViewDataHooks && (this.dataComparator(correctedNewData, correctedOldData, APIScope, mappedDataId).base() || mutation === "create")){
                
                                this.rootViewDataHooks.root.prePostRootAttachHooks.onCommit(correctedModelId, mutation, newViewManagerScopedData, oldViewManagerScopedData, this.getParentRootViewNode(), { viewManagerRef: this, parentMappedDataId: this.childOptions?.parentMappedDataId });
                                //Children invoked last after component hooks invoked
                            }
                        }
            
                        /**
                         * @type {import("StandardViewManager").NewViewInfo}
                         */
                        let newViewInfo = null;
                
                        if(mutation === "uploadNew" || mutation === "loadNew" || mutation === "create"){
                
                            if(mappedDataId){
        
                                //add for create in commit
                                console.error(`Received a mapped data ID for view manager ${this.id} and scope ${this.scope} | APIScope: ${this.scope} for a "new" mutation ${mutation}`);
                                console.warn(`Will safely assume this specific view manager's implementation has no child. So, can run mutation here and nullify provided mapped data id`);
                                mappedDataId = null;
                            }
                            //Update modelId - here to avoid null pointers
                            this.soleModelId = correctedModelId;
    
                            //Where we need extras. Now, for list, only 1st relevant/used for model (updates with correct view node - pass flag to build)
                            //else just runs normal
                            //so, our spawn made sure it exists (the goal. Ahaa)
        
                            //now, the create logic (was a direct call, so no extras AND mappedDataId)
                            if(mutation === "create"){
        
                                if(!extras?.isServerSideCreate){
    
                                    //Spawn new root or view node directly to get the mapped data id, no override
                                    //PASS THE OVERRIDE HERE (to just update cause we had created. Just match to provided). Then new view info will run ok
                                    //CASCADE TO LIST
                                    newViewInfo = this.runRootAndViewNodeBuild(mutation, correctedModelId, newViewManagerScopedData);
                                } else {
    
                                    //work with spawned views
                                    const attachServerSideInfo = this.hookServerSideViews();
                                    //update corrected newViewInfo to what was rendered from serverSide view
                                    newViewInfo = attachServerSideInfo;
                                    //we pass model id. so no need to correct
                                }
                            } else {
        
                                newViewInfo = this.runRootAndViewNodeBuild(mutation, correctedModelId, newViewManagerScopedData, extras.tempMappedDataIdInfo.tempMappedDataId)
                            }
                        }
                
                        // mappedDataId in newViewInfo will match the one in extras if mutation is right. So, valid to use to invoke children
                        const finalMappedDataId = mappedDataId ? mappedDataId : newViewInfo?.mappedDataId;
                        const viewNode = newViewInfo ? newViewInfo.viewNode : this.getViewNodeForMappedDataId(finalMappedDataId);
                
                        //No need for else because of loadNew, create, or uploadNew, will build root so view components need to be updated
                        this.invokeRootComponentHooks(mutation, correctedNewData, correctedOldData, finalMappedDataId, correctedModelId, APIScope, (targetScope, newScopedData) => {
                
                            this.componentViewDataHooks[targetScope].hooks.onCommit?.(correctedModelId, mutation, newViewManagerScopedData, oldViewManagerScopedData, newScopedData, viewNode, finalMappedDataId, { viewManagerRef: this, parentMappedDataId: this.childOptions.parentMappedDataId });
                        }, () => {
                
                            this.invokeChildViewManagers(finalMappedDataId, (viewManager, cb) => {
        
                                viewManager.onCommit(mutation, newData, oldData, mappedDataId, modelId, APIScope, originalScope, () => {
        
                                    cb();
                                    //adding the ? to extras cause of direct commits (not coming from pipeline, e.g on createAndCommit)
                                }, extras ? { ...extras, tempMappedDataIdInfo: extras.tempMappedDataIdInfo?.childrenInfo.find((info => info.viewManagerId === viewManager.id)) } : null );
                            }, () => {
        
                                //do nothing
                                completeCb();
                            });
                        });
                    }
                } else {
        
                    if(this.rootViewDataHooks){
        
                        console.warn("Committed with no modelID");
                        this.rootViewDataHooks.root.prePostRootAttachHooks.onCommit(null, mutation, null, null, this.getParentRootViewNode(), { viewManagerRef: this, parentMappedDataId: this.childOptions.parentMappedDataId });
                    }
                    completeCb();
                }
            } else {

                /**
                 * @todo transfer onCancel logic (take arrays and recursive call) to list view manager 
                 */
                if(!mappedDataId){

                    /**
                     * Read more in onMutate, same place
                    */
                    throw new Error(`Data operation is of a specific scope, but no mapped data id provided.\nScope: ${this.scope} | APIScope: ${APIScope}`);
                }
                //DIRECTLY CALL CHILDREN - using logic including possible extras for a "new" mutation
                this.invokeChildViewManagers(mappedDataId, (viewManager, cb) => {
        
                    viewManager.onCommit(mutation, newData, oldData, mappedDataId, modelId, APIScope, originalScope, () => {

                        cb();
                        //adding the ? to extras cause of direct commits (not coming from pipeline, e.g on createAndCommit)
                    }, extras ? { ...extras, tempMappedDataIdInfo: extras.tempMappedDataIdInfo?.childrenInfo.find((info => info.viewManagerId === viewManager.id)) } : null );
                }, () => {

                    //do nothing
                    completeCb();
                });
            }
        } else {

            completeCb();
        }
    }

    /**
     * Working like the data comparator now
     * 
     * @template {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['views']} ReqScope
     * @template {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['views']} HookScope
     * @param {Partial<ValueTypeOfNested<M, ReqScope>> | Partial<ValueTypeOfNested<M, ReqScope>>[]} apiModel 
     * @param {ReqScope} currentDataScope 
     * @param {HookScope} hookScope
     * @param {string} mappedDataId
     * @returns {Partial<ValueTypeOfNested<M, HookScope>> | Partial<ValueTypeOfNested<M, HookScope>>[]}
     * 
     */
    reduceHookDataToScope(apiModel, currentDataScope, hookScope, mappedDataId){

        //create a clone of model to avoid mutations unwanted by others
        apiModel = structuredClone(apiModel);
        //If currentDataScope is the same, or currentDataScope refers to self type of requested hook scope
        //return model as is for former, an array of data for previous (as current data (apiModel) is of the array's type but we want the array)
        if(currentDataScope === hookScope || currentDataScope.toString().split(`${DataManager._NESTED_SCOPE_KEY_SPLITTER}${DataManager._ARRAY_SELF_TYPE}`).join("") === hookScope){

            //Return an array of apiModel
            if(currentDataScope.toString().includes(`${DataManager._NESTED_SCOPE_KEY_SPLITTER}${DataManager._ARRAY_SELF_TYPE}`)){

                return [apiModel];
            } else {

                return apiModel;
            }
        //They don't match
        } else if(currentDataScope.toString() === DataManager._MODEL_ROOT_SCOPE){
     
            //The currentDataScope is MODEL_ROOT
            //Here, we have an array of model root models.
            //so, we'll return an array of its scoped
            //else, just scope
            if(Array.isArray(apiModel)){

                const returnData = [];
                apiModel.forEach((model) => {

                    returnData.push(this.dataManager.getScopedModelFromRef(hookScope, this.getOrderedArrayIndices(hookScope, mappedDataId), model, false));
                });

                return returnData;
            } else {

                return this.dataManager.getScopedModelFromRef(hookScope, this.getOrderedArrayIndices(hookScope, mappedDataId), apiModel, false);
            }
        //Scopes don't match, and currentDataScope is NOT MODEL_ROOT
        } else if(hookScope === DataManager._MODEL_ROOT_SCOPE || currentDataScope.toString().startsWith(hookScope.toString())){ //APIScope.toString().split(`${DataManager._NESTED_SCOPE_KEY_SPLITTER}${DataManager._ARRAY_SELF_TYPE}`).join("").startsWith(hookScope.toString())

            //The scope of the hook (required scope/hookScope) is parent to the currentDataScope (API scope)
            //return a spawned partial shell (previously null)
            const spawnedModel = {};
            this.dataManager.spawnPartialShellModel(currentDataScope, apiModel, spawnedModel, mappedDataId);
            //then, scope the partal (because partial creates from root)
            return this.dataManager.getScopedModelFromRef(hookScope, this.getOrderedArrayIndices(hookScope, mappedDataId), spawnedModel, false);
        } else {

            //the scope of the view manager (or hook) is child to the API scope. Reduce the data

            //Remember, the model is scoped TO the APIscope i.e its value, not complete partial from root
            //The scope of the operation is a parent to the view manager's scope, but not model root
            //The scope we pass, since will do recursive value reference, should be 
            //a substring from where it ends to the end of this view manager's scope
            //REMEMBER, scopes are provided from root
            //Therefore, if data operation scope is me.name and scope is me.name.first,
            //The 'scope' we pass for getting the scoped model will be 'first' (NOTE: Doing a slice to remove initial '.')
            //since the data is already pointing to me.name
            const reducedScope = hookScope.toString().split(currentDataScope.toString().split(`${DataManager._NESTED_SCOPE_KEY_SPLITTER}${DataManager._ARRAY_SELF_TYPE}`).join(""))[1];
            if(!reducedScope){

                //encountering this case when child managers are being triggered, but scopes not the same. Just return null
                console.error(`Reducing view manager scope: Might be child with different scope. Should NOT have been processed by view manager. id: ${this.id} | APIScope: ${currentDataScope} | viewManagerScope: ${this.scope}`);
                return null;
            }
            if(Array.isArray(apiModel)){

                const returnData = [];
                apiModel.forEach((model) => {

                    returnData.push(this.dataManager.getScopedModelFromRef(reducedScope.slice(1, reducedScope.length - 1), this.getOrderedArrayIndices(currentDataScope, mappedDataId), apiModel, false));
                });
                return returnData;
            } else {

                //That slice is to remove the initial period from the reduced scope
                return this.dataManager.getScopedModelFromRef(reducedScope.slice(1, reducedScope.length), this.getOrderedArrayIndices(currentDataScope, mappedDataId), apiModel, false);
            }
        }
    }

    /**
     * 
     * @param {NestedKeyOf<M> | ArrayOnlyNestedKeys<M>} APIScope The original APIScope
     * @param {boolean} [forDirectMatchAndChildrenOnly]
     */
    canRunHooks(APIScope, forDirectMatchAndChildrenOnly){

        const fitsInChildren = () => {

            if(this.acceptedChildViewManagerScopes.isEmpty()){

                return false;
            }
            if(this.acceptedChildViewManagerScopes.contains(APIScope)){

                return true;
            } else{

                const copyChildScopes = this.acceptedChildViewManagerScopes.copy();
                let inChild = false;
                do{

                    const targetScope = copyChildScopes.pop();
                    inChild = APIScope === targetScope.toString().startsWith(APIScope.toString()) 
                                || APIScope.toString().startsWith(targetScope.toString());
                    if(inChild){

                        break;
                    }
                } while (copyChildScopes.size());
                return inChild;
            }
        }

        if(!forDirectMatchAndChildrenOnly){

            //says if generally can run (APIScope fits self, children, or this is a parent)
            return APIScope === DataManager._MODEL_ROOT_SCOPE 
                    || APIScope === this.scope 
                    //child to selected scope (extends)
                    || this.scope.toString().startsWith(APIScope.toString()) 
                    //parent to selected scope - ignored on second run
                    || APIScope.toString().startsWith(this.scope.toString())
                    //a managed child scope not registered to self (happens to be the case especially for MODEL_ROOT view manager scopes, with (obviously) non-model root child view manager scopes)
                    || fitsInChildren();
        } else {

            //says if given scope is for direct or children only. If forbidden, self doesn't fire
            //instead, rolls over to children
            //for loadNew, uploadNew, or create, expecting a mappedDataId for specificity to fire appropriate children for a specific attached view model
            //scope is a direct match
            return APIScope === this.scope 
                    //scope is a child to API scope (extends)
                    || this.scope.toString().startsWith(APIScope.toString())
                    //or simply doesn't have children, but was fit to run at first. Accomodating different view manager specs running at the same time
                    || !this.childViewManagers.length;
                    //or hasn't spawned anything?*
                    // || this.attachedModels.isEmpty();
        }

    }

    /**
     * @template {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']} APIReqScope
     * @param {DataManagerMutations} mutation
     * @param {Partial<ValueTypeOfNested<M, APIReqScope>>} newData
     * @param {Partial<ValueTypeOfNested<M, APIReqScope>>} oldData
     * @param {string} mappedDataId
     * @param {string} modelId
     * @param {APIReqScope} APIScope MUST be the SAME as the request scope. Otherwise, hooks won't fire
     * {rootComponentHooksInvocation<keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['views']>} invocation
     * @param {(scope: APIReqScope | NestedChildKeyOf<ValueTypeOfNested<M, APIReqScope>, APIReqScope>, scopedData: ValueTypeOfNested<ValueTypeOfNested<M, APIReqScope>, NestedChildKeyOf<ValueTypeOfNested<M, APIReqScope>, APIReqScope>> ) => void} invocation
     * @param {genericFunction} completeCb
     */
    invokeRootComponentHooks(mutation, newData, oldData, mappedDataId, modelId, APIScope, invocation, completeCb){

        //These will be invoked ONLY if we have an attached viewNode for the mappedDataId
        //Including create also because new data might be undefined and data comparator doesn't work like that
        const delete_FlushAllCreateByPass = mutation === "delete_FlushAll" || mutation === "create";
        if(this.componentViewDataHooks && this.getViewNodeForMappedDataId(mappedDataId)){

            if(APIScope === DataManager._MODEL_ROOT_SCOPE){
    
                //Trigger all of them
                //But only trigger if comparator shows difference
                for(let scope in this.componentViewDataHooks){
    
                    //NOW DO COMPARATOR - THEN CHECK THE save options resetting. Change doing_save flag in promise return
                    if(delete_FlushAllCreateByPass || this.dataComparator(newData, oldData, APIScope, mappedDataId).ofScope(scope)){ //|| mutation === "create" - not ideal. Running even when nothing changed

                        invocation(scope, this.reduceHookDataToScope(newData, APIScope, scope, mappedDataId), this.reduceHookDataToScope(oldData, APIScope, scope, mappedDataId));
                    }
                }
            } else if(this.componentViewDataHooks[APIScope]){
    
                //ALWAYS have scope here as APIScope, since direct match
                //At this point, data in scope of view manager. So, have to consider that
                //Help deal with children
                if(delete_FlushAllCreateByPass || this.dataComparator(newData, oldData, APIScope, mappedDataId).ofScope(APIScope)){ //|| mutation === "create"

                    //trigger specific - never reduces cause scopes match
                    invocation(APIScope, this.reduceHookDataToScope(newData, APIScope, APIScope, mappedDataId), this.reduceHookDataToScope(oldData, APIScope, APIScope, mappedDataId));

                    //Trigger for model root. Always called for any updates. So, can use for overall data changes listening
                    if(this.componentViewDataHooks["MODEL_ROOT"]){

                        invocation("MODEL_ROOT", this.reduceHookDataToScope(newData, APIScope, "MODEL_ROOT", mappedDataId), this.reduceHookDataToScope(newData, APIScope, "MODEL_ROOT", mappedDataId));
                    }
                }
            }
        }

        completeCb();
    }

    /**
     * 
     * @type {StandardViewManagerInstance<M, G_S>['dataComparator']} 
     */
    dataComparator(newData, oldData, APIScope, mappedDataId){

        return {

            /**
             * @type {import("StandardViewManager").DataComparatorInterfaceInstance<M>['base']}
             */
            base: () => {

                //No scoping cause already scoped. Direct compare
                const reducedNewHookData = this.reduceHookDataToScope(newData, APIScope, this.scope, mappedDataId);
                const reducedOldHookData = this.reduceHookDataToScope(oldData, APIScope, this.scope, mappedDataId);
                return (!reducedNewHookData && !reducedOldHookData) || reducedNewHookData !== reducedOldHookData;
            },

            /**
             * 
             * @type {import("StandardViewManager").DataComparatorInterfaceInstance<M>['ofScope']}
             */
            ofScope: (hookScope) => {

                const reducedNewHookData = this.reduceHookDataToScope(newData, APIScope, hookScope, mappedDataId);
                const reducedOldHookData = this.reduceHookDataToScope(oldData, APIScope, hookScope, mappedDataId);
                //True if reducedNewHookData is not undefined and old and new not the same. Checking undefined because it (property in new) doesn't exist so shouldn't be considered
                return reducedNewHookData !== undefined && reducedNewHookData !== reducedOldHookData;
            }
        }
    }

    /**
     * 
     * @type {StandardViewManagerInstance<M, G_S>['onCancel']}
     */
    onCancel(mutation, newData, oldData, mappedDataId, modelId, APIScope, res, completeCb, extras){
        
        if(this.canRunHooks(APIScope)){
            
            /**
             * @todo HAVE UNIQUE ALGO FOR LISTS
             * 
             * CANCEL CALLED IF A MUTATION FAILS - I THINK HOOK CALLS MAIN THING AND REDUCTION to update
             */
            if(this.canRunHooks(APIScope, true)){

                //WORK THE ALGO HERE
                //Standard doesn't work with arrays
                if(Array.isArray(modelId)){
        
                    modelId = modelId[0];
                }
                if(this.scope === DataManager._MODEL_ROOT_SCOPE){
        
                    if(Array.isArray(newData)){
        
                        newData = newData[0];
                    }
                    
                    if(Array.isArray(oldData)){
        
                        oldData = oldData[0];
                    }
                }
                const newViewManagerScopedData = this.reduceHookDataToScope(newData, APIScope, this.scope, mappedDataId);
                const oldViewManagerScopedData = this.reduceHookDataToScope(oldData, APIScope, this.scope, mappedDataId);
        
                if(mutation === "loadNew" || mutation === "uploadNew"){
        
                    if(mappedDataId && !this.isChildInfo.isChild){
        
                        //add for create in commit
                        console.error(`Received a mapped data ID for view manager ${this.id} and scope ${this.scope} | APIScope: ${this.scope} for a "new" mutation ${mutation}`);
                        console.warn(`Will safely assume this specific view manager's implementation has no child. So, can run mutation here and nullify provided mapped data id`);
                        mappedDataId = null;
                    }
        
                    //MUST exist - except if cancel called from data manager directly
                    //peek. If length one and no view node attached, then use corrected
                    /**
                     * @type {string}
                     */
                    let correctedMappedDataId = null;
                    //logic here flawed. Should consider those non-spawning new on create, loadNew, or uploadNew
                    //So, non-spawning will have a view node attached. Thus removed the line && !this.attachedModels.peek().attachedViewNode
                    //have a pre-processor? yes. as agreed before
                    // const prevFakeSpawn = this.attachedModels.length === 1 ? this.attachedModels.peek().mappedDataId : null;
                    //so, modifying because of list. Attached models length can be greater than 1. So, check at last position
                    const prevFakeSpawn = this.attachedModels.length ? this.attachedModels.tail().mappedDataId : null;
                    if(extras.tempMappedDataIdInfo){
    
                        if(extras.tempMappedDataIdInfo.tempMappedDataId !== prevFakeSpawn){
    
                            throw new Error("Previous fake spawn and one passed in extras must match: " + extras.tempMappedDataIdInfo.tempMappedDataId + " :: " + prevFakeSpawn);
                        } else {
    
                            correctedMappedDataId = extras.tempMappedDataIdInfo.tempMappedDataId;
                        }
                    } else {
    
                        if(prevFakeSpawn){
        
                            correctedMappedDataId = prevFakeSpawn;
                        } else {
    
                            throw new Error(`No previous fake spawn or tempMappedDataId in onCancel, and mutation is variant of loadNew and uploadNew: ${mutation}.`);
                        }
                    }
                    //Call for root view hooks
                    if(this.rootViewDataHooks && this.dataComparator(newData, oldData, APIScope, mappedDataId).base()){
            
                        this.rootViewDataHooks.root.prePostRootAttachHooks.onCancel(modelId, mutation, newViewManagerScopedData, oldViewManagerScopedData, this.getParentRootViewNode(), res, { viewManagerRef: this, parentMappedDataId: this.childOptions?.parentMappedDataId });
                        //call children
                        this.invokeChildViewManagers(correctedMappedDataId, (viewManager, cb) => {
        
                            viewManager.onCancel(mutation, newData, oldData, mappedDataId, modelId, APIScope, res, () => {
        
                                cb();
                            }, { tempMappedDataIdInfo: extras.tempMappedDataIdInfo.childrenInfo?.find((info) => info.viewManagerId === viewManager.id) });
                        }, () => {
        
                            //now, remove from attached models in extras
                            this.removeAttachedModel(correctedMappedDataId);
                            completeCb();
                        });
                    }
                } else {
        
                    //No need for else because of loadNew, create, or uploadNew, will build root so view components need to be updated
                    const viewNode = this.getViewNodeForMappedDataId(mappedDataId);
                    this.invokeRootComponentHooks(mutation, newData, oldData, mappedDataId, modelId, APIScope, (targetScope, newScopedData) => {
            
                        this.componentViewDataHooks[targetScope].hooks.onCancel?.(modelId, mutation, newViewManagerScopedData, oldViewManagerScopedData, newScopedData, viewNode, mappedDataId, res, { viewManagerRef: this, parentMappedDataId: this.childOptions.parentMappedDataId });
                    }, () => {
            
                        this.invokeChildViewManagers(mappedDataId, (viewManager, cb) => {
            
                            viewManager.onCancel(mutation, newData, oldData, mappedDataId, modelId, APIScope, res, () => {
            
                                cb();
                            }, extras);
                        }, () => {
            
                            completeCb();
                        });
                    });
                }
            } else {

                
                if(!mappedDataId){

                    /**
                     * Read more in onMutate, same place
                    */
                    throw new Error(`Data operation is of a specific scope, but no mapped data id provided.\nScope: ${this.scope} | APIScope: ${APIScope}`);
                }

                //call children DIRECTLY
                this.invokeChildViewManagers(mappedDataId, (viewManager, cb) => {
        
                    viewManager.onCancel(mutation, newData, oldData, mappedDataId, modelId, APIScope, res, () => {

                        cb();
                    }, { tempMappedDataIdInfo: extras.tempMappedDataIdInfo.childrenInfo?.find((info) => info.viewManagerId === viewManager.id) });
                }, () => {

                    completeCb();
                });
            }
        } else {

            console.warn(`View manager bouncing hooks. id: ${this.id} | scope: ${this.scope} | APIScope: ${APIScope}`);
            completeCb();
        }
    }

    /**
     * 
     * @type {StandardViewManagerInstance<M, G_S>['onError']}
     */
    onError(mutation, newData, oldData, mappedDataId, modelId, response, APIScope, retryCbInterface, extras){

        if(this.canRunHooks(APIScope)){

            if(Array.isArray(modelId)){
    
                throw new Error("Don't expect array of modelIds when getting error, even in load new since uncommitted");
            }

            if(this.canRunHooks(APIScope, true)){

                const newViewManagerScopedData = this.reduceHookDataToScope(newData, APIScope, this.scope, mappedDataId);
                const oldViewManagerScopedData = this.reduceHookDataToScope(oldData, APIScope, this.scope, mappedDataId);
        
                if(mutation === "loadNew" || mutation === "uploadNew"){
                    
                    if(mappedDataId){
        
                        //add for create in commit
                        console.error(`Received a mapped data ID for view manager ${this.id} and scope ${this.scope} | APIScope: ${this.scope} for a "new" mutation ${mutation}`);
                        console.warn(`Will safely assume this specific view manager's implementation has no child. So, can run mutation here and nullify provided mapped data id`);
                        mappedDataId = null;
                    }
        
                    //get the right mappedDataId - prioritize extras, created from a loadNew or uploadNew mutation
                    const correctedMappedDataId = extras.tempMappedDataIdInfo.tempMappedDataId;
                    //update prePost 
                    //Call for root view hooks
                    if(this.rootViewDataHooks && this.dataComparator(newData, oldData, APIScope, mappedDataId).base()){
            
                        this.rootViewDataHooks.root.prePostRootAttachHooks.onError(modelId, mutation, oldViewManagerScopedData, newViewManagerScopedData, response, this.getParentRootViewNode(), retryCbInterface.retryCb.bind(retryCbInterface), { viewManagerRef: this, parentMappedDataId: this.childOptions?.parentMappedDataId });
                        this.invokeChildViewManagers(correctedMappedDataId, (viewManager, cb) => {
        
                            viewManager.onError(mutation, newData, oldData, mappedDataId, modelId, response, APIScope, retryCbInterface, { tempMappedDataIdInfo: extras.tempMappedDataIdInfo.childrenInfo.find((info) => info.viewManagerId === viewManager.id) });
                        }, () => {
        
                            //do nothing
                        })
                    }
                } else {
        
                    //normal mutation directed to components
                    //No need for else because of loadNew, create, or uploadNew, will build root so view components need to be updated
                    const viewNode = this.getViewNodeForMappedDataId(mappedDataId);
                    this.invokeRootComponentHooks(mutation, newData, oldData, mappedDataId, modelId, APIScope, (targetScope, newScopedData) => {
            
                        this.componentViewDataHooks[targetScope].hooks.onError?.(modelId, mutation, oldViewManagerScopedData, newViewManagerScopedData, newScopedData, response, viewNode, mappedDataId, retryCbInterface.retryCb.bind(retryCbInterface), { viewManagerRef: this, parentMappedDataId: this.childOptions.parentMappedDataId });
                    }, () => {
            
                        this.invokeChildViewManagers(mappedDataId, (viewManager, cb) => {
            
                            viewManager.onError(mutation, newData, oldData, mappedDataId, modelId, response, APIScope, retryCbInterface, extras);
                            cb();
                        }, () => {
            
                            
                        });
                    });
                }
            } else {

                if(!mappedDataId){

                    /**
                     * Read more in onMutate, same place
                    */
                    throw new Error(`Data operation is of a specific scope, but no mapped data id provided.\nScope: ${this.scope} | APIScope: ${APIScope}`);
                }

                //only children involved
                this.invokeChildViewManagers(mappedDataId, (viewManager, cb) => {
            
                    viewManager.onError(mutation, newData, oldData, mappedDataId, modelId, response, APIScope, retryCbInterface, extras);
                    cb();
                }, () => {
    
                    
                });
            }
        } else {

            console.warn(`View manager bouncing hooks. id: ${this.id} | scope: ${this.scope} | APIScope: ${APIScope}`);
        }
    }
}

/**
 * Now using this to avoid storing definitions in variables. 
 * 
 * REPLICATE THIS EVERYWHERE ELSE
 */
if(false){

    /**
     * @type {StandardViewManagerConstructor<*, *>}
     */
    const StandardViewManagerCheck = StandardViewManager
}

export default StandardViewManager;