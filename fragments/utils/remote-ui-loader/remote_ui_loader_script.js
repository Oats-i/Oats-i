/**
 * Used to load remote UI in plain text.
 * 
 * Uses promises to do so
 */

class RemoteUILoader{

    /**
     * 
     * @param {LifeCycleRemoteRequestUtils} reqUtils 
     */
    constructor(reqUtils){

        if(!reqUtils){

            throw new Error("A remote request utils instance must be provided for the remote UI loader");
        }
        this.xhReq = null;
        this.reqUtils = reqUtils;
    }

    /**
     * 
     * @param {RequestOptions} reqOptions The address for the request
     */
    reqUIResource(reqOptions){

        return new Promise((resolve, reject) => {

            if(this.xhReq){

                this.xhReq.abort();
            }
            this.xhReq = this.reqUtils.makeRemoteRequest(
                reqOptions,
                (status, response) => {

                    if (status === 200){ //0 || (>= 200 && < 400)
    
                        resolve(response);
                    } else if(status !== 0) { //not firing on abort
        
                        reject(status);
                    }
                },
                (e) => {

                    reject(e);
                });
        });
    }
}

export default RemoteUILoader;