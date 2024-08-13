import { DataManagerViewManagerConstructorOptions, PaginationStatus, ScopedPaginationOptions } from "DataManager";
import { BASE_PIPELINE_BUILD_ARGS, BASE_PIPELINE_DFA_GROUPS, BASE_PIPELINE_PSEUDO_STATE, BASE_PIPELINE_STATE, GenericBuildPipelineWorkerInstance } from "GenericBuildPipelineWorker";

interface LoadServerSidePipelineWorkerInstance<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS, PSEUDO_STATES extends BASE_PIPELINE_PSEUDO_STATE> extends GenericBuildPipelineWorkerInstance<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES>{

    initServerSideLoad<M>(args: InitServerSideLoadArgs<M>): void;
    cancelServerSideLoad(args: Partial<InitServerSideLoadArgs<*>>): void;
}

export declare interface LoadServerSidePipelineWorkerConstructor<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS, PSEUDO_STATES extends BASE_PIPELINE_PSEUDO_STATE> implements GenericBuildPipelineWorkerConstructor<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES>{

    new(args: LoadServerSidePipelineWorkerConstructorArgs): LoadServerSidePipelineWorkerInstance<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES>;
}

type LoadServerSidePipelineWorkerConstructorArgs = {

    
}

type LoadServerSideBuildArgs<M> = { 

    apiOptions: DataManagerAPIOptions<M>,
    setScopedAPIOption: (scope: NestedKeyOf<M>, paginationOptions: Omit<ScopedPaginationOptions, 'errorMsg'>) => void;
    createModelsCb: genericParamFunction<M[]>
}

type InitServerSideLoadArgs<M> = LoadServerSideBuildArgs<M> & { 
    
    mainCb: genericFunction 
}

type LoadServerSideDataPipelineStates = { 

    setUpServerSide: -1, 
    buildServerSide: 0,
    onBuildEnd: 2 
}

type LoadServerSidePipelineDFAGroups = {

    loadServerSideDFA: {},
    jumpServerSideLoad: {},
    cancelServerSideDFA: {}
}