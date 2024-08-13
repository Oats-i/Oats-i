//@ts-check
/**
 * Use to build view panels. Like AppFragmentBuilder, 
 * 
 * @todo allow for lazy building using import() (Just like AsyncAppFragmentBuilder)
 * Help control bundle size
 */
/**
 * @template {BaseViewPanelConstructorArgs} T
 * @template LD, HPD
 */
class ViewPanelBuilder{

    /**
     * 
     * @param {import("ViewPanel").ViewPanelConstructor<LD, HPD>} viewPanel 
     * @param {T} baseConstructorArgs 
     */
    constructor(viewPanel, baseConstructorArgs){

        this.viewPanel = viewPanel;
        this.constructorArgs = baseConstructorArgs;
    }

    /**
     * @param {ViewPanelConstructorArgs} extConstructorArgs
     */
    buildViewPanel(extConstructorArgs){

        return new this.viewPanel( { ...this.constructorArgs, ...extConstructorArgs } )
    }
}

if(false){

    /**
     * @type {import("ViewPanelBuilder").ViewPanelBuilderConstructor<*, *, *>}
     */
    const check = ViewPanelBuilder;
}

export default ViewPanelBuilder;