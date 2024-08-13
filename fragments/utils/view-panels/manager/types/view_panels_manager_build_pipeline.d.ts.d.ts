import { BASE_PIPELINE_BUILD_ARGS, BASE_PIPELINE_DFA_GROUPS, BASE_PIPELINE_PSEUDO_STATE, BASE_PIPELINE_STATE, GenericBuildPipelineWorkerClass, GenericBuildPipelineWorkerConstructor } from "GenericBuildPipelineWorker"

declare interface ViewPanelsManagerMainBuildPipelineInstance<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS, PSEUDO_STATES extends BASE_PIPELINE_PSEUDO_STATE> {//This is how you extend in typescrip declaration files

    buildStatuses: BuildStatuses,

    //Stuff here for the class
    startViewPanelBuild(args: ViewPanelsManagerBuildPipelineStartBuildArgs): void;
    consentViewPanels(args: ViewPanelsManagerConsentPipelineBuildArgs): void;
    destroyViewPanels(args: ViewPanelsManagerDestroyPipeplineBuildArgs): void;
}

export declare interface ViewPanelsManagerMainBuildPipelineConstructor<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS, PSEUDO_STATES extends BASE_PIPELINE_PSEUDO_STATE> implements GenericBuildPipelineWorkerConstructor<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES>{

    new(args: ViewPanelsManagerMainBuildPipelineConstructorArgs): ViewPanelsManagerMainBuildPipelineInstance<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES> //Don't provide generics here. Otherwise construct errors
}

type ViewPanelsManagerMainBuildPipelineConstructorArgs = {

    viewPanelsManager: import("ViewPanelsManager").ViewPanelsManagerInstance
}

type ViewPanelsManagerConsentPipelineBuildArgs = ViewPanelsManagerBuildPipelineStartBuildArgs & {

    consentStack: import("Stack").StackInstance<import("ViewPanel").ViewPanelInstance<*, *>>,
    panelsKey_Context: string, //The key, which is used to get the collection of saved states in the tree. Used for saving states appropriately. SAME FOR ALL. KEY THAT MATTERS IS FOR EACH VIEW PANEL IN COLLECTION. SO, COLLECTION KEY IS STATIC VALUE SOURCED FROM VIEW PANELS MANAGER
    consentCb: getViewPanelConsentCb,
    completeConsentParams: ViewPanelConsentCbParams
}

type ViewPanelsManagerDestroyPipeplineBuildArgs = ViewPanelsManagerBuildPipelineStartBuildArgs & {

    destroyStack: import("Stack").StackInstance<import("ViewPanel").ViewPanelInstance<*, *>>,
    completeCb: genericFunction,
}

type BuildStatuses = {

    [x: string]: {

        buildCancelStack: import("../../../../../utils/abstract-data-types/stack/stack_adt").default<import("ViewPanel").ViewPanelInstance>
    }
}