// Type definitions for StandardRemoteRequestUtils
// Project: Oats~i
// Definitions by: Ian Omondi <https://github.com/Ian-Cornelius>
// Definitions: null

declare module "StandardRemoteRequestUtils" {

    interface StandardRemoteRequestUtilsInstance {

        isFragmentRunning(): true | boolean;

        //Attempting overload to cater for scenarios when overridestatecallback is optional and when it's not
        //Not implementable in js yet, but good for definitions
        makeRemoteRequest: makeRemoteRequest<{}>;

        canProcessRequest(status: number): true | boolean;
        abortRequest(id: string): void;
        abortRunningRequests(): void;
    }

    export interface StandardRemoteRequestUtilsConstructor {

        new(): StandardRemoteRequestUtilsInstance;

        get _REMOTE_REQUEST_ERROR(): string;
    }

    type makeRemoteRequest<R> = ((requestOptions: RequestOptions, successCallback: remoteReqSuccessCb<R>, errorCallback: remoteReqErrCb, customXHReq?: XMLHttpRequest, overrideStateCb?: overrideStateCb, overrideID?: string) => string)
                                //ORR Below updated to ensure mandatory doesn't follow optional 
                                // ((requestOptions: RequestOptions, successCallback?: remoteReqSuccessCb<R>, errorCallback?: remoteReqErrCb, customXHReq?: XMLHttpRequest, overrideStateCb: overrideStateCb, overrideID?: string) => string);
                                // ((requestOptions: RequestOptions, successCallback: undefined, errorCallback: undefined, customXHReq: undefined | XMLHttpRequest, overrideStateCb: overrideStateCb, overrideID?: string) => string);

    type RequestOptions = {
        
        reqMethod: "POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "PATCH" | "TRACE" | "CONNECT",
        reqAddress: string, 
        contentType?: "application/json" | "application/x-www-form-urlencoded" | "multipart/form-data",
        reqBody?: Document | XMLHttpRequestBodyInit,
        reqHeaders?: RequestHeaders,
        processAbort?: boolean //True means you want to handle aborts
        responseType?: "arraybuffer" | "blob" | "document" | "json" | "text";
    };

    type RequestHeaders = {

        authorization?: string,
        dontPrependBearer?: boolean,
        [x: string]: string
    };

    type remoteReqSuccessCb<T> = (status: number, T: response) => void;

    type remoteReqErrCb = (e: *) => void;

    type overrideStateCb = (this: XMLHttpRequest, ev: Event) => any;
}