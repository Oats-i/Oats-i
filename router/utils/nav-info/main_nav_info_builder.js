class MainNavigationInfoBuilder {

    /**
     * 
     * @param {MainNavigationInfo[]} mainNavInfos
     * @returns {MainNavigationInfo[]} 
     */
    static buildMainNavigationInfo(mainNavInfos){

        /**
         * @type {MainNavigationInfo[]}
         */
        let standardizedInfos = [];
        mainNavInfos.forEach((navInfo) => {

            /**
             * Check errors
             */
            if(!navInfo.selector){

                throw new Error("An id must be provided for each main navigational info");
            }
            if(!navInfo.defaultRoute){

                throw new Error("Navigational button with id " + navInfo.selector + " must have a default route set");
            }
            if(!navInfo.baseActiveRoute){

                throw new Error("Navigational button with id " + navInfo.selector + " must have a base active route set");
            }
            if(standardizedInfos.findIndex((info) => info.selector === navInfo.selector) !== -1){

                throw new Error("ids in main nav infos should be unique. " + navInfo.selector + " has been repeated");
            } else {

                standardizedInfos.push(navInfo);
            }
        });

        return standardizedInfos;
    }
}

export default MainNavigationInfoBuilder;