//@ts-check
import RandomNumberCharGenUtils from "../../random-number-generator/random_number_char_generator";

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
 * 
 */
class StandardRemoteRequestUtils{

    constructor(){

        /**
         * @type {ActiveRemoteRequests[]}
         */
        this.activeRequests = [];
    };

    static get _REMOTE_REQUEST_ERROR(){

        return "REMOTE REQUEST ERROR";
    }

    static get _REMOTE_REQUEST_WARNING(){

        return "REMOTE REQUEST WARNING";
    }

    static get _REQUEST_ID_SIZE(){

        return 4;
    }

    /**
     * 
     * Used in Oats\~i builds heavily. Also exists to support use of this API in non-Oats~i implementations
     * where lifecycle is not applicable
     */
    isFragmentRunning(){

        return true;
    }

    /**
     * Run in a try catch. Throws error if fragment dead and making request
     * 
     * @type {standardizedRemoteRequestFunction<{}>}
     * 
     * @param {RequestOptions} requestOptions
     * @param {remoteReqSuccessCb<{}>} successCallback
     * @param {remoteReqErrCb} errorCallback
     * @param {XMLHttpRequest} [customXHReq] Will be deprecated
     * @param {overrideStateCb} [overrideStateCb] Might be deprecated if lifecycle non-enforceable with it. Trying some code to see
     * @param {string} [overrideID]
     * 
     * @returns {string} The ID of the request
     */
    makeRemoteRequest(requestOptions, successCallback, errorCallback, customXHReq, overrideStateCb, overrideID){

        //Run only if fragment running
        if(this.isFragmentRunning()){

            if(successCallback && overrideStateCb){

                console.warn("Success callback will not be called as an override state callback has been given. Handle API success in it");
            }
            let xhReq = customXHReq ? customXHReq : new XMLHttpRequest();
            xhReq.withCredentials = true;
            xhReq.open(requestOptions.reqMethod, requestOptions.reqAddress, true);
            if(requestOptions.contentType){
                
                xhReq.setRequestHeader("Content-Type", requestOptions.contentType);
            }
            if(requestOptions.reqHeaders){
    
                if(requestOptions.reqHeaders.authorization){
    
                    xhReq.setRequestHeader("Authorization", "Bearer " + requestOptions.reqHeaders.authorization);
                }
            }
    
            /**
             * @type {RemoteStateChangeCallbackOptions}
             */
            const callbackOptions = {

                successCallback: successCallback,
                overrideStateCb: overrideStateCb
            }

            // xhReq.addEventListener("readystatechange", overrideStateCb ? overrideStateCb.bind(xhReq) : this.onRequestStateChange.bind(xhReq, this, requestOptions.processAbort, callbackOptions));
            xhReq.addEventListener("readystatechange", this.onRequestStateChange.bind(xhReq, this, requestOptions.processAbort, callbackOptions));
            // xhReq.addEventListener("error", errorCallback.bind(this));
            xhReq.addEventListener("error", this.onRequestError.bind(xhReq, this, errorCallback));
    
            //Get id
            const requestID = overrideID ? overrideID : RandomNumberCharGenUtils.generateRandomNumChar(StandardRemoteRequestUtils._REQUEST_ID_SIZE);

            //Abort any running with overrideID. Thus, user doesn't have to abort calls when using it. Automatically done
            //So, new calls to loadCategoriesData will abort any running calls and load afresh
            if(overrideID){

                this.abortRequest(overrideID);
            }

            //Save to active here
            this.activeRequests.push({
    
                id: requestID,
                XMLHttpRequest: xhReq
            });
    
            xhReq.send(requestOptions.reqBody);
            return requestID;
        } else {

            throw new Error(`${StandardRemoteRequestUtils._REMOTE_REQUEST_WARNING}: Fragment not running. Request denied`);
        }
    }

    /**
     * @private
     * 
     * Using JS # syntax for better privatization
     * 
     * @this XMLHttpRequest
     * Runs in context of running XMLHttpRequest object
     * 
     * @param {StandardRemoteRequestUtils} objRef
     * @param {boolean} processAbort
     * @param {RemoteStateChangeCallbackOptions} callbackOptions
     */
    onRequestStateChange(objRef, processAbort, callbackOptions) {

        if(objRef.isFragmentRunning()){

            if(callbackOptions.overrideStateCb){

                //Using call because we can successfully bind the xhReq instance as the context (this keyword)
                //Failed with a bind before adding it to the callbackOptions object. Will work if we save it as var after binding. Otherwise fails for a weird reason
                callbackOptions.overrideStateCb.call(this);
                if(this.readyState === XMLHttpRequest.DONE){

                    //No longer active
                    objRef.popRemoteReqEntryFromActive(this);
                }
            } else {

                if(this.readyState === XMLHttpRequest.DONE){

                    //No longer active
                    objRef.popRemoteReqEntryFromActive(this);
                    //First checks when aborting, second when not aborting
                    if((this.status === 0 && processAbort && objRef.canProcessRequest(this.status)) || (this.status !== 0 && objRef.canProcessRequest(this.status))){
        
                        callbackOptions.successCallback(this.status, this.response);
                    }
                }
            }
        }
    }

    /**
     * @private
     * 
     * @this XMLHttpRequest
     * 
     * @param {StandardRemoteRequestUtils} objRef
     * @param {remoteReqErrCb} cb 
     */
    onRequestError(objRef, cb){ //e, - had this, but not binding to event correctly

        console.warn("OBJ REF");
        console.log(objRef);
        if(objRef.isFragmentRunning()){

            objRef.popRemoteReqEntryFromActive(this);
            cb();
        }
    }

    /**
     * @private
     * 
     * @param {XMLHttpRequest} request 
     */
    popRemoteReqEntryFromActive(request){

        this.stopRequestInIndex(this.activeRequests.findIndex((req) => req.XMLHttpRequest === request), true);
    }

    /**
     * @private
     * 
     * @param {number} index 
     * @param {boolean} [notAborting]
     */
    stopRequestInIndex(index, notAborting){

        let id = "undefined ID";
        if(index !== -1){

            id = this.activeRequests[index].id;

            if(!notAborting){

                this.activeRequests[index].XMLHttpRequest.abort();
            }
            //Remove from active requests
            this.activeRequests.splice(index, 1);
        } else {

            // try{

            //     throw new Error(`${StandardRemoteRequestUtils._REMOTE_REQUEST_ERROR}: Cannot abort request with id ${id}. Not found`);
            // } catch(err){

            //     console.log(err);
            // }

            console.log(`${StandardRemoteRequestUtils._REMOTE_REQUEST_ERROR}: Cannot abort request with id ${id}. Not found`);
        }
    }

    /**
     * Override in children
     * 
     * Called when the request has been completed
     * Override and check whether request processing can proceed based on response
     * This involves checking the status and determining whether the request has been approved by the API
     * 
     * Returning true allows the 
     * 
     * @param {number} status
     * @returns {boolean} Whether the request is completed as per API requirements
     */
    canProcessRequest(status){

        return true;
    }

    /**
     * Use internally and carefully
     */
    abortRunningRequests(){

        this.activeRequests.forEach((request) => {

            request.XMLHttpRequest.abort();
        });

        this.activeRequests.splice(0, this.activeRequests.length);
    }

    /**
     * Consoles an error if failed to abort request
     * 
     * @param {string} id 
     */
    abortRequest(id){

        //Throw error if fail
        this.stopRequestInIndex(this.activeRequests.findIndex((request) => request.id == id));
    }
}

if(false){

    /**
     * @type {import("StandardRemoteRequestUtils").StandardRemoteRequestUtilsConstructor}
     */
    const check = StandardRemoteRequestUtils;
}

export default StandardRemoteRequestUtils;