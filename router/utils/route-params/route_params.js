class RouteParamsUtil{

    static get _QUERY_SPLITTER(){

        return "?";
    }

    static get _TARGET_SPLITTER(){

        return "#";
    }

    static get _URL_SPLITTER(){

        return "/";
    }

    static get _QUERY_ITEM_SPLITTER(){

        return "&";
    }

    static get _QUERY_KV_SPLITTER(){

        return "=";
    }

    /**
     * Use to trap 404s? Makes NO SENSE. We have a failed routing cb
     */
    static get _MATCH_ALL_MARKER(){

        return "/*";
    }

    static get _PARAM_MARKER(){

        return ":";
    }

    /**
     * 
     * @param {string} baseUrl 
     * @param {string} fullUrl
     * @returns {RouteParams} 
     */
    static getParams(baseUrl, fullUrl){

        /**
         * @type {RouteParams}
         */
        let routeParams = {};
        if(RouteParamsUtil.isURLFormatValid(fullUrl)){

            //Separate base url, query, and target (#)
            const filteredUrl = RouteParamsUtil.filterUrl(fullUrl);
            //Set filteredUrl in RouteParams
            routeParams.filteredUrl = filteredUrl;

            //Set target
            routeParams.target = filteredUrl.target;

            //Can only get params if urls congruent
            if(RouteParamsUtil.testUrlsCongruent(baseUrl, filteredUrl.baseUrl)){

                //Get params
                const paramIndices = RouteParamsUtil.getParamIndices(baseUrl);
                //Tokenize
                const tokenizedBaseUrl = baseUrl.split(RouteParamsUtil._URL_SPLITTER);
                const tokenizedFilteredUrl = filteredUrl.baseUrl.split(RouteParamsUtil._URL_SPLITTER);
                //Fit params based on value at index
                for(let i = 0; i < paramIndices.length; i++){

                    const param = tokenizedBaseUrl[paramIndices[i]].slice(1);
                    routeParams.params = {

                        ...routeParams.params,
                        [param]: tokenizedFilteredUrl[paramIndices[i]]
                    };
                }

                //Get queries
                if(filteredUrl.query){

                    const queryString = filteredUrl.query;
                    //Tokenize
                    const _tokenizedQueryString = queryString.split(RouteParamsUtil._QUERY_ITEM_SPLITTER);
                    //Get the key and value of each query in token
                    let _queryKeyValueTokens;
                    _tokenizedQueryString.forEach((token) => {

                        //Tokenize
                        _queryKeyValueTokens = token.split(RouteParamsUtil._QUERY_KV_SPLITTER);
                        if(_queryKeyValueTokens.length > 1){

                            //Save value
                            routeParams.queries = {

                                ...routeParams.queries,
                                [_queryKeyValueTokens[0]]: _queryKeyValueTokens[1]
                            }
                        }
                    });

                    console.warn("GOT THESE QUERIES");
                    console.log(routeParams.queries);
                }
            } else {

                console.error(`Cannot get params of non-congruent url\nFull URL: ${fullUrl} :: Base URL: ${baseUrl}`);
                return null;
            }

            //Fix fullURL
            routeParams.filteredUrl.fullUrl = fullUrl;

            return routeParams;

        } else {

            console.error(`Cannot process route in bad format.\nFull URL: ${fullUrl} :: Base URL: ${baseUrl}`);
            return null;
        }
    }

    /**
     * Test whether the given url has been formatted properly i.e
     * 
     * Target (#) at end of base url and not immediately followed by / (though can ignore that. Won't target at all)
     * query starts with ? and not followed by url splitter (/)
     * @param {string} url 
     * @returns {boolean}
     */
    static isURLFormatValid(url){

        //Test queries
        const queryString = RouteParamsUtil.getQueryString(url);
        if(queryString && queryString.charAt(0) === RouteParamsUtil._URL_SPLITTER){

            console.error("query string cannot be immediately followed by forward slash (/)");
            return false;
        }

        const target = RouteParamsUtil.getTargetString(url); //Should check for double #?
        if(target && target.charAt(0) === RouteParamsUtil._URL_SPLITTER){

            console.error("Target string (#target) cannot be immediately followed by forward slash (/)");
            return false;
        }

        return true;
    }

    /**
     * 
     * @param {string} url
     * @returns {FilteredURL} 
     */
    static filterUrl(url){

        /**
         * @type {FilteredURL}
         */
        const filteredUrl = {};

        //Get query
        filteredUrl.query = RouteParamsUtil.getQueryString(url);
        //Get target
        filteredUrl.target = RouteParamsUtil.getTargetString(url);
        //Get base url
        filteredUrl.baseUrl = RouteParamsUtil.getBaseUrl(url);

        return filteredUrl;
    }

    /**
     * 
     * @param {string} url 
     */
    static getQueryString(url){

        //Remove queries
        const _splitURLQuery = url.split(RouteParamsUtil._QUERY_SPLITTER);
        return _splitURLQuery.length > 1 ? _splitURLQuery[1] : null;
    }

    /**
     * 
     * @param {string} url 
     */
    static getTargetString(url){

        const _urlWTarget = url.split(RouteParamsUtil._QUERY_SPLITTER)[0];
        const _splitURLTarget = _urlWTarget.split(RouteParamsUtil._TARGET_SPLITTER);
        //Removing terminating slash incase it had a query starting as /?
        return _splitURLTarget.length > 1 ? RouteParamsUtil.removeTerminatingSlash(_splitURLTarget[1]) : null;
    }

    /**
     * 
     * @param {string} url 
     */
    static getBaseUrl(url){

        //Remove target
        const _urlWTarget = url.split(RouteParamsUtil._QUERY_SPLITTER)[0];
        const _splitURLTarget = _urlWTarget.split(RouteParamsUtil._TARGET_SPLITTER);
        //Set base url
        return RouteParamsUtil.removeTerminatingSlash(_splitURLTarget[0]);
    }

    /**
     * Removes the terminating slash (/) in base url or url string. 
     * 
     * Have RoutingInfoUtils use this method as well for uniformity. Also use the getters
     * 
     * @param {string} baseUrl 
     */
    static removeTerminatingSlash(baseUrl){

        //Last length check to ensure we don't end up with an empty string case "/""
        if(baseUrl.charAt(baseUrl.length - 1) === RouteParamsUtil._URL_SPLITTER && baseUrl.length > 1){

            baseUrl = baseUrl.slice(0, baseUrl.length - 1);
        }

        return baseUrl;
    }

    /**
     * Test if a given baseUrl matches a given dynamic url
     * 
     * If this works, update complicated algo for proxy server. Can take from here directly btw
     * 
     * @param {string} dynamicUrl 
     * @param {string} baseUrl 
     * 
     * @returns {boolean}
     */
    static testUrlsCongruent(dynamicUrl, baseUrl){

        //Split them first. When split by forward slash, tokens MUST be of same length
        const splitDynamic = dynamicUrl.split(RouteParamsUtil._URL_SPLITTER);
        const splitBase = baseUrl.split(RouteParamsUtil._URL_SPLITTER);
        if(splitDynamic.length !== splitBase.length){

            return false;
        }

        //Get the indices of the dynamic parts in the dynamic url
        const paramIndices = RouteParamsUtil.getParamIndices(dynamicUrl);
        //Literal string formed by joining non-param indices with (/) should match
        let joinedDynamicLiterals = "";
        let joinedBaseLiterals = "";
        for(let i = 0; i < splitBase.length; i++){

            if(!paramIndices.includes(i)){

                //Join them
                joinedDynamicLiterals += `/${splitDynamic[i]}`;
                joinedBaseLiterals += `/${splitBase[i]}`;
            }
        }

        return joinedDynamicLiterals === joinedBaseLiterals;
    }

    /**
     * Get the indices of the params of a given (dynamic) url 
     * @param {string} url 
     * @returns {number[]}
     */
    static getParamIndices(url){

        const tokenizedBaseUrl = url.split(RouteParamsUtil._URL_SPLITTER);
        let _paramIndices = [];
        tokenizedBaseUrl.forEach((token, index) => {

            if(token.startsWith(RouteParamsUtil._PARAM_MARKER)){

                _paramIndices.push(index);
            }
        });

        return _paramIndices;
    }
}

export default RouteParamsUtil;