/** 
 * @callback getFragmentLifeCycleManager
 * @returns {FragmentLifeCycleInstance}
 * 
 * @typedef ViewPanelsManagerObject
 * @property {genericThrowsParamFunction<string, string>} requestRoute
 * @property {getFragmentLifeCycleManager} getFragmentLifeCycleManager
 * 
 * BETTER WAY OF DEFINING METHODS AND ANNOTATE IN CLASS USING /**@type ***
 * @typedef {genericParamReturnFunction<ViewPanelConstructorArgs, ViewPanelInstance>} buildViewPanel
 */

/**
 * @template LD, HPD
 * @typedef {import("ViewPanel").ViewPanelConstructor<LD, HPD>} ViewPanelConstructor
 **/

/**
 * @template LD, HPD
 * @typedef { import("ViewPanel").ViewPanelInstance<LD, HPD> } ViewPanelInstance
 */

/** 
 * @template {BaseViewPanelConstructorArgs} T
 * @template LD, HPD
 * @typedef {import("ViewPanelBuilder").ViewPanelBuilderInstance<T, LD, HPD>} ViewPanelBuilderInstance
 * 
 **/

/** 
 * @typedef { import("ViewPanel").ViewPanelConstructorArgs } ViewPanelConstructorArgs
 * @typedef { import("ViewPanel").BaseViewPanelConstructorArgs } BaseViewPanelConstructorArgs
 * @typedef { import("ViewPanel").ExtViewPanelConstructorArgs } ExtViewPanelConstructorArgs
 *  
 */

/**
 * @template T
 * @typedef {FragmentPipelineWorkerArgs & { buildID: number, stageArgs: T }} GenericViewPanelBuildStateArgs
 */

/**
 * @typedef {GenericViewPanelBuildStateArgs<null>} ViewPanelBuildStateArgs
 */
/**
 * @typedef {import("ViewPanel").LocalViewPanelRoutingInfo} LocalViewPanelRoutingInfo
 */

/**
 * FOR LOCAL PIPELINE WORKER
 */
/**
 * @template L_D, H_P_D
 * @typedef {import("./view_panel_local_pipeline_worker.d.ts.js").ViewPanelLocalPipelineWorkerConstructorArgs<L_D, H_P_D>} ViewPanelLocalPipelineWorkerConstructorArgs
 */
/**
 * @typedef {import("ViewPanel").ViewPanelBuildStagesArgs} ViewPanelBuildStagesArgs
 */