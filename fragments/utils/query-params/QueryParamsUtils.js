class QueryParamsUtils{

    /**
    * @template params
    * @template queries
    * @param {GenericUpdatedQueryParams<params, queries>} genericUpdatedQueryParams 
    */
    static generateQueryParamsList(genericUpdatedQueryParams){

        if(genericUpdatedQueryParams){

            //Normalize params
            for(let param in genericUpdatedQueryParams.params){

                genericUpdatedQueryParams.params[param] = undefined;
            }

            //Normalize queries
            for(let query in genericUpdatedQueryParams.queries){

                genericUpdatedQueryParams.queries[query] = undefined;
            }
        }

        return genericUpdatedQueryParams;
   }
}

export default QueryParamsUtils;