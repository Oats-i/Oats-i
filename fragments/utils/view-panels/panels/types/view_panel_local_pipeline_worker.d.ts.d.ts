import { BASE_PIPELINE_BUILD_ARGS, BASE_PIPELINE_DFA_GROUPS, BASE_PIPELINE_PSEUDO_STATE, BASE_PIPELINE_STATE, GenericBuildPipelineWorkerConstructor, GenericBuildPipelineWorkerInstance } from "GenericBuildPipelineWorker"
import { ViewPanelInstance } from "ViewPanel"

declare interface ViewPanelLocalPipelineWorkerInstance<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS, PSEUDO_STATES extends BASE_PIPELINE_PSEUDO_STATE, L_D, H_P_D> extends GenericBuildPipelineWorkerInstance<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES> {//This is how you extend in typescrip declaration files

    //methods
    buildViewPanel(args: OpenViewPanelWorkerArgs<L_D, H_P_D>): void;
    cancelViewPanelBuild(args: OpenViewPanelWorkerArgs<L_D, H_P_D>): void;
    requestViewPanelConsent(args: ViewPanelLocalPipelineWorkerConsentArgs<L_D, H_P_D>): void;
    destroyViewPanel(args: ViewPanelLocalPipelineWorkerDestroyArgs<L_D, H_P_D>): void;
    getLifeCycleObject(): FragmentLifeCycleInstance
}

export declare interface ViewPanelLocalPipelineWorkerConstructor<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS, PSEUDO_STATES extends BASE_PIPELINE_PSEUDO_STATE, L_D, H_P_D> implements GenericBuildPipelineWorkerConstructor<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES>{

    new(args: ViewPanelLocalPipelineWorkerConstructorArgs<L_D, H_P_D>): ViewPanelLocalPipelineWorkerInstance<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES, L_D, H_P_D> //Don't provide generics here. Otherwise construct errors
}

type ViewPanelLocalPipelineWorkerConstructorArgs<L_D, H_P_D> = {

    hostPanel: ViewPanelInstance<L_D, H_P_D>,
    hostFragmentLifeCycleObject: FragmentLifeCycleInstance
}

type OpenViewPanelWorkerArgs<L_D, H_P_D> = {

    launchParams: LaunchViewPanelParams<L_D, H_P_D>,
    mainPipelineCb: genericFunction
}

type ViewPanelLocalPipelineWorkerBuildArgs<L_D, H_P_D> = OpenViewPanelWorkerArgs<L_D, H_P_D> & { 
    
    buildStageArgs?: ViewPanelBuildStagesArgs 
}

type ViewPanelLocalPipelineWorkerConsentArgs<L_D, H_P_D> = ViewPanelLocalPipelineWorkerBuildArgs<L_D, H_P_D> & {

    consentCb: getViewPanelConsentCb,
    consentParams: ViewPanelConsentCbParams
}

type ViewPanelLocalPipelineWorkerDestroyArgs<L_D, H_P_D> = ViewPanelLocalPipelineWorkerBuildArgs<L_D, H_P_D> & {

    destroyCb: genericFunction,
}