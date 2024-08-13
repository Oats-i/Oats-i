//@ts-check
import AppChildFragment from "../AppChildFragment";
import AppMainFragment from "../AppMainFragment";
import AppFragmentBuilder from "./AppFragmentBuilder";

/**
 * @template {import("AppFragmentBuilder").ForFragment} F
 */
class AsyncAppFragmentBuilder extends AppFragmentBuilder{

    /**
     * @param {import("AppFragmentBuilder").AppShellAsyncFragmentConstructorArgs<F>} constructorArgs 
     */
    constructor(constructorArgs){

        //@ts-expect-error childFragmentId missing in constructorArgs
        super(null, constructorArgs);
        if(!constructorArgs.asyncOptions.forFragment){

            throw new Error("You must specify forFragment property in AsyncAppFragmentBuilder.");
        }
        /**
         * @type {AppShellAsyncMainFragment<F> | AppShellAsyncChildFragment<F>}
         */
        this.fragment = constructorArgs.asyncOptions.forFragment === "main" ? AppShellAsyncMainFragment : AppShellAsyncChildFragment;
    }

    /**
     * 
     * @param {MainRouter} mainRouterInstance 
     * @returns 
     */
    buildFragment(mainRouterInstance){

        !this.constructorArgs.mainRouter ? this.constructorArgs.mainRouter = mainRouterInstance : null;
        /**
         * @type { import("AppFragmentBuilder").AppShellAsyncMainFragmentConstructor | import("AppFragmentBuilder").AppShellAsyncChildFragmentConstructor }
         */
        const fragment = this.fragment;
        return new fragment({ ...this.constructorArgs, asyncBuilderReference: this });
    }

    /**
     * 
     * @param {AppMainFragmentConstructor | AppChildFragmentConstructor} fragment 
     */
    getLoadedFragmentClass(fragment){

        this.fragment = fragment;
    }
}

if(false){

    /**
     * @type {import("AppFragmentBuilder").AsyncAppFragmentBuilderConstructor}
     */
    const check = AsyncAppFragmentBuilder;
}

/**
 * Have an AsyncShellAppFragment implementation here. Pass in loading UI, and error UI. 
 * 
 * Automatically forwards calls. So, uninheritable to maintain behavior
 * 
 * Provision for loadingUI, errorUI with retry button labelled "async-reload". Automatically connected
 * to retry loading.
 * 
 * So, create shellfragment. Override its builder. Then, do import, show proper uis, and on success, pipe call forward.
 * Also, forward pipe the rest so remains shell
 * 
 * Also, not passing fragment but path to it, which will be used for local loading. Have that import() bit done in a callback
 * returning it, so can use promise internally, and have webpack correctly resolve the modules
 */
/**
 * @template {import("AppFragmentBuilder").ForFragment} F_M
 */
class AppShellAsyncMainFragment extends AppMainFragment {

    /**
     * 
     * @param {import("AppFragmentBuilder").AppShellAsyncFragmentConstructorArgs<F_M> & { asyncBuilderReference: import("AppFragmentBuilder").AsyncAppFragmentBuilderInstance }} args 
     */
    constructor(args){

        super(args);
        /**
         * @type {import("AppFragmentBuilder").AsyncShellLocalPipelineWorker}
         */
        //@ts-expect-error //not extending cause no need really. Can make a pass with that
        this.localPipelineWorker = new AsyncShellLocalPipelineWorker(this);
        this.loadedFragmentConstructorArgs = args;
        this.asyncBuilderReference = args.asyncBuilderReference;
        this.routeCancelled = false;
    }

    /**
    * Loads the async fragment and pipes control to it
    * 
    * @param {asyncLoadCb} cb 
    */
    loadAsyncFragment(cb){

        globalLoadAsyncFragment.call(this, cb, "main");
    }
}

/**
 * @template {import("AppFragmentBuilder").ForFragment} F_C
 */
class AppShellAsyncChildFragment extends AppChildFragment {

    /**
     * 
     * @param {import("AppFragmentBuilder").AppShellAsyncFragmentConstructorArgs<F_C> & { asyncBuilderReference: import("AppFragmentBuilder").AsyncAppFragmentBuilderInstance }} args 
     */
    constructor(args){

        //@ts-expect-error
        super(args);
        /**
         * @type {import("AppFragmentBuilder").AsyncShellLocalPipelineWorker}
         */
        //@ts-expect-error //not extending cause no need really. Can make a pass with that
        this.localPipelineWorker = new AsyncShellLocalPipelineWorker(this);
        this.loadedFragmentConstructorArgs = args;
        //Used to pass new fragment class to builder
        this.asyncBuilderReference = args.asyncBuilderReference;
        this.routeCancelled = false;
    }

    /**
    * Loads the async fragment and pipes control to it
    * 
    * @typedef {(fragInstance: AppMainFragmentInstance | AppChildFragmentInstance, fragClass: AppMainFragmentConstructor | AppChildFragmentConstructor) => void} asyncLoadCb
    * 
    * @param {asyncLoadCb} cb 
    */
    loadAsyncFragment(cb){
        
        globalLoadAsyncFragment.call(this, cb, "child");
    }
}

/**
 * Loads the async fragment and pipes control to it
 * @template {import("AppFragmentBuilder").ForFragment} F_fn
 * @this {AppShellAsyncMainFragment | AppShellAsyncChildFragment}
 * @param {asyncLoadCb} cb 
 * @param {import("AppFragmentBuilder").AppShellAsyncFragmentConstructorArgs<F_fn>['asyncOptions']['forFragment']} forFragment 
 */
async function globalLoadAsyncFragment(cb, forFragment){

    let showingLoadingUI = false;
    const _Inserted_Error_UI_Id = "async-load-err";
    let insertedErrorUI = false;

    const showLoadingUI = () => {

        if(!this.routeCancelled){

            if(!this.isViewInitialized()){ //Loading UI shown ONLY when view had not been initialized, so not server side 
    
                this.bindNewUIToDOM(this.loadedFragmentConstructorArgs.asyncOptions.asyncLoadingUI);
                showingLoadingUI = true;
            }
            //Can override bind here to always show ui for testing. But DON'T recommend
        }
    }

    const removeLoadingUI = () => {

        if(!this.routeCancelled){

            if(showingLoadingUI){
    
                this.detachViewFromDOM();
                showingLoadingUI = false;
            }
        }
    }

    const showErrorUI = () => {

        if(!this.routeCancelled){

            if(!showingLoadingUI && !this.isViewInitialized()){ //shows directly as main ui only if view is not initialized. Else, inserts self
    
                this.bindNewUIToDOM(this.loadedFragmentConstructorArgs.asyncOptions.asyncErrorUI);
            } else {
    
                //if view was server-side rendered
    
                //Thinking of a notification pop-up? Or inserting ui afterbegin? Yeap. 
                //Combine with a notif. Or, since user can scroll, do a notif card.
                //Pass notif options for this. For now, it's afterbegin
                /**
                 * @type {Element}
                 */
                const node = forFragment === "main" ? this.getMainFragmentComponent() : 
                                                            //@ts-expect-error
                                                            this.getChildFragmentComponent();
                node.insertAdjacentHTML("afterbegin", `<div id="${_Inserted_Error_UI_Id}">${this.loadedFragmentConstructorArgs.asyncOptions.asyncErrorUI}</div>`);
                insertedErrorUI = true;
            }
        }
    }

    const removeErrorUI = () => {

        if(!this.routeCancelled){

            if(insertedErrorUI){
    
                /**
                 * @type {Element}
                 */
                const node = forFragment === "main" ? this.getMainFragmentComponent() : 
                                                            //@ts-expect-error
                                                            this.getChildFragmentComponent();
                const ui = node.querySelector(`#${_Inserted_Error_UI_Id}`);
                node.removeChild(ui);
                insertedErrorUI = false;
            } else {
    
                this.detachViewFromDOM();
            }
        }
    }

    try {
        
        //Show loading UI
        //do only if view not intialized
        showLoadingUI();
        const loadedFragment = (await this.loadedFragmentConstructorArgs.asyncOptions.importCb()).default;
        //Remove loading UI
        removeLoadingUI();
        //putting in own try-catch to avoid catching errors involving main frag now
        try{
            
            // Can comment here to test uis. But don't recommend. Just place in p.hbs file, then copy to actual module once satisfied
            cb(new loadedFragment(this.loadedFragmentConstructorArgs), loadedFragment);
        } catch(err){

            console.error(err);
            console.warn("Probably an error in loaded fragment. Check");
        }
    } catch(err){

        console.error(err);
        //Remove loading UI
        removeLoadingUI();
        //Show error UI
        showErrorUI();
        //Bind retry button
        const retryBtn = this.getMainFragmentComponent().getElementsByClassName("async-reload")[0];
        if(!retryBtn){

            console.warn("Retry button not bound. Cannot retry to load async fragment. Possibly route was cancelled? -> " + this.routeCancelled);
        } else {

            retryBtn.addEventListener("click", (e) => {
    
                removeErrorUI();
                this.loadAsyncFragment(cb);
            });
        }
    }
}

class AsyncShellLocalPipelineWorker{

    /**
     * 
     * @param {AppShellAsyncMainFragment | AppShellAsyncChildFragment} host 
     */
    constructor(host){

        this.host = host;
        /**
         * @type {AppMainFragmentInstance | AppChildFragmentInstance}
         */
        this.loadedFragment = null;
    }

    /**
     * Called by MainRoutingPipeline to build the fragment route
     * 
     * Uses localBuildingState to see if route already built and thus only fire param changes check and move on
     * 
     * FORWARD PIPING AFTER LOAD
     * 
     * @param {RouteParams} routeParams
     * @param {SavedFragmentState} savedState
     * @param {{}} data
     * @param {genericFunction} cb
     */
    buildFragmentRoute(routeParams, savedState, data, cb){

        //for cases where after cancel, this was still part of valid ones - SEE WHY WE WORK WITH PIPELINES. DAMMIT
        //Can work with one here? Probably
        this.host.routeCancelled = false;
        const forwardPipeCall = () => {

            this.loadedFragment.localPipelineWorker.buildFragmentRoute(routeParams, savedState, data, cb);
        }

        //Have to do this for async loaded then param query changed. Was causing multiple constructor firings
        //will no longer do this once the referenced appFragment is not the shell we used to async loading on page/fragment load
        if(this.loadedFragment){

            forwardPipeCall();
        } else {

            //Load in the actual frag, then pipe the call forward
            this.host.loadAsyncFragment((loadedFrag, fragClass) => {
    
                this.loadedFragment = loadedFrag;
                //Now, ensure builder always has correct constructor
                this.host.asyncBuilderReference.getLoadedFragmentClass(fragClass);
                if(!this.host.routeCancelled){
    
                    forwardPipeCall();
                }
            });
        }
    }

    /**
     * ONLY extra forward pipe that will be needed, cause this happens while building
     * Consent is ONLY after successful full build
     * @param {genericFunction} cb 
     */
    cancelFragmentRoute(cb){

        //Tell host that route is being cancelled
        this.host.routeCancelled = true;
        if(this.loadedFragment){

            this.loadedFragment.localPipelineWorker.cancelFragmentRoute(cb)
        } else {

            //Async fragment yet to load
            //remove any uis if attached - solves lingering ui bug (remember, builder inserts, doesn't override. That's why it lingered)
            if(this.host.isViewInitialized()){

                this.host.detachViewFromDOM();
            }
            //Async fragment might have failed to load. So, just approve
            cb();
        }
    }

    /**
     * GOING DOWN, only needed once. For first async loaded. Else, direct loaded after pass down of correct one
     * CAN SOLVE ALL THIS by having fixed instance of these you know. Ha!
     * So, not sending new. Already loaded. But that will affect logic for fragments. Yikes!
     * SO, NO
     * Called by MainRoutingPipeline to get the destroy consent of the fragment hosting this local pipeline worker
     * @param {routingPipelineConsentCb} cb 
     */
    getRouteChangeConsent(cb, newRouteInfo){

        if(this.loadedFragment){

            this.loadedFragment.localPipelineWorker.getRouteChangeConsent(cb, newRouteInfo);
        } else {

            //Async fragment might have failed to load. So, just approve
            cb({ consent: true, savedState: {} });
        }
    }

    /**
     * Called by MainRoutingPipeline
     * 
     * Inform a previously consented fragment that the route has been maintained by a parent
     * OR
     * It was consenting to a route where it is not being destroyed, and the consent was either approved or not. Regardless, running state valid
     * Therefore, transition the child's state back to running
     * 
     * RATIONALE FOR THIS STRUCTURE
     * 
     * Imagine a route /newBlog/:blogId/addMedia
     * The addMedia fragment is the last node, but there's the :blogId fragment that probably is
     * rendering and managing the view of WYSIWYG editor. If all consenting powers rest on the last node,
     * the user's unsaved work will get lost. Thus, all in destruction stack MUST consent to destruction
     * This algorithm allows for more flexible architectures
     */
    routeMaintained(){

        this.loadedFragment.localPipelineWorker.routeMaintained();
    }

    /**
     * Called by MainRoutingPipeline to destroy the fragment
     * @param {fragmentDestroyCb} cb
     */
    destroyFragment(cb){

        this.loadedFragment.localPipelineWorker.destroyFragment(cb);
    }
}

export default AsyncAppFragmentBuilder;