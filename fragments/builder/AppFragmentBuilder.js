//@ts-check
class AppFragmentBuilder{

    /**
     * 
     * @param {import("AppMainFragment").AppMainFragmentConstructor} fragment 
     * @param {AppFragmentGlobalConstructorArgs} constructorArgs 
     */
    constructor(fragment, constructorArgs){

        this.fragment = fragment;
        this.constructorArgs = constructorArgs;
    }

    /**
     * 
     * @param {MainRouter} mainRouterInstance 
     * @returns 
     */
    buildFragment(mainRouterInstance){

        this.constructorArgs.mainRouter = this.constructorArgs.mainRouter ? this.constructorArgs.mainRouter : mainRouterInstance;
        return new this.fragment(this.constructorArgs);
    }
}

if(false){

    /**
     * @type {import("AppFragmentBuilder").AppFragmentBuilderConstructor}
     */
    const check = AppFragmentBuilder;
}

export default AppFragmentBuilder;