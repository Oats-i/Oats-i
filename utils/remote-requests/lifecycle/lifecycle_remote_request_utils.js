//@ts-check
import StandardRemoteRequestUtils from "../standard/standard_remote_request_utils";

/**
 * @typedef ActiveRemoteRequests
 * @property {string} id
 * @property {XMLHttpRequest} XMLHttpRequest
 * 
 * @typedef RemoteStateChangeCallbackOptions
 * @property {remoteReqSuccessCb<{}>} successCallback
 * @property {overrideStateCb} overrideStateCb
 */
/**
 * @extends {StandardRemoteRequestUtils}
 */
class LifecycleRemoteRequestUtils extends StandardRemoteRequestUtils{

    /**
     * 
     * @param {FragmentLifeCycleInstance} lifecycleObject 
     */
    constructor(lifecycleObject){

        super();

        /**
         * @type {FragmentLifeCycleInstance}
         */
        this.lifecycleObject = lifecycleObject;

        this.fragmentRunning = false;

        this.registerToLifeCycleEvents();
    };

    registerToLifeCycleEvents(){

        if(this.lifecycleObject){

            this.lifecycleObject.registerLifeCycleListeners({

                onFragmentRunning: () => {
    
                    this.fragmentRunning = true;
                },
    
                onFragmentDestroyed: () => {
    
                    this.fragmentRunning = false;
                    this.abortRunningRequests();
                },

                onFragmentCancelled: () => {

                    this.fragmentRunning = false;
                    this.abortRunningRequests();
                }
            });
        } else {
            
            throw new Error(`${LifecycleRemoteRequestUtils._REMOTE_REQUEST_ERROR}: Lifecycle object not provided. This class is restricted to Oats~i builds that must have their remote calls lifecycle aware. If you want to use this util outside Oats~i, use the StandardRemoteRequestUtils class that this inherits from`);
        }
    }

    /**
     * Returns true based on lifecycle stage
     */
    isFragmentRunning(){

        return this.fragmentRunning;
    }
}

if(false){

    /**
     * @type {import("LifecycleRemoteRequestUtils").LifecycleRemoteRequestUtilsConstructor} 
     */
    const check = LifecycleRemoteRequestUtils;
}

export default LifecycleRemoteRequestUtils;