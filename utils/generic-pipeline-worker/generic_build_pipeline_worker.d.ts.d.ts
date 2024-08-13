// Type definitions for GenericBuildPipelineWorker
// Project: Oats~i
// Definitions by: Ian Omondi <https://github.com/Ian-Cornelius>
// Definitions: null

// Make this available as a global for non-module code.
// export as namespace GenericBuildPipelineWorker;

declare module "GenericBuildPipelineWorker"{

    // When a class must have a certain schema, then we use interface keyword to implement an interface.
    // https://medium.com/jspoint/typescript-classes-65b4712ac9c8
    interface GenericBuildPipelineWorkerInstance<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS, PSEUDO_STATES extends BASE_PIPELINE_PSEUDO_STATE>{ //More about interfaces https://medium.com/jspoint/typescript-interfaces-4a2af07c8070

        stateTransitionDefinition: BuildPipelineStatesDFA<BUILD_ARGS, STATES, DFA_GROUPS>;
        buildRunDefinition: PipelineWorkerAsynchronousBuildDefinition<STATES>;
        pseudoStates: GenericBuildPipelineWorkerPseudoStates<PSEUDO_STATES>;

        //@extends no longer needed in children implementing this after base class?
        startPipelineBuild(args: GenericBuildPipelineBuildArgs<BUILD_ARGS, STATES, DFA_GROUPS>): void
        transitionPipelineState(args: GenericBuildPipelineBuildArgs<BUILD_ARGS, STATES, DFA_GROUPS>): void
        isBuildValid(args: GenericBuildPipelineBuildArgs<BUILD_ARGS, STATES, DFA_GROUPS>): boolean
    }

    export interface GenericBuildPipelineWorkerConstructor<STATES extends BASE_PIPELINE_STATE, BUILD_ARGS extends BASE_PIPELINE_BUILD_ARGS, DFA_GROUPS extends BASE_PIPELINE_DFA_GROUPS, PSEUDO_STATES extends BASE_PIPELINE_PSEUDO_STATE>{ //Constructor class

        new(args: GenericBuildPipelineWorkerConstructorArgs<BUILD_ARGS, STATES>): GenericBuildPipelineWorkerInstance<STATES, BUILD_ARGS, DFA_GROUPS, PSEUDO_STATES>;
    }

    type BASE_PIPELINE_STATE = {};
    type BASE_PIPELINE_BUILD_ARGS = {};
    type BASE_PIPELINE_DFA_GROUPS = {};
    type BASE_PIPELINE_PSEUDO_STATE = {};
    
    type GenericBuildPipelineWorkerConstructorArgs<BUILD_ARGS, STATES, DFA_GROUPS, PSEUDO_STATES> = {
    
        stateTransitionDefinition: BuildPipelineStatesDFA<BUILD_ARGS, STATES, DFA_GROUPS>,
        asynchronousBuildDefinition: PipelineWorkerAsynchronousBuildDefinition<STATES>,
        pseudoStates: GenericBuildPipelineWorkerPseudoStates<PSEUDO_STATES>
    }

    type GenericBuildPipelineWorkerPseudoStates<PSEUDO_STATES> = {

        [x in keyof PSEUDO_STATES]: "pseudo"
    }

    type PipelineWorkerAsynchronousBuildDefinition<STATES> = {

        readonly runAsynchronous: boolean,
        globalSynchronousPipelineState?: {
            
            pipelineState: keyof STATES,
            superPipelineLock: boolean,
            buildStartStamp: number
        },
        defaultPipelineState: keyof STATES, //Default state that the pipeline starts. GLOBAL since definition is GLOBAL but builds can be local
        asynchronousLocalPipelineStates?: {

            [key: string]: { 

                currentLocalPipelineState: keyof STATES,
                superPipelineLock: boolean,
                buildStartStamp: number 
            }
        },
    }

    type BuildPipelineStatesDFA<BUILD_ARGS, STATES, DFA_GROUPS> = {

        [key in keyof DFA_GROUPS]: StatesDFAGroup<BUILD_ARGS, STATES, DFA_GROUPS>
    }

    //Was trying to exclude string literals from other strings
    type RESERVED_DFA_KEYS = "autoTriggerState" | "root";
    type NOT_VALID_DFA_KEY1<K> = K extends RESERVED_DFA_KEYS ? never : K;
    type NOT_VALID_DFA_KEY2<K> = RESERVED_DFA_KEYS extends K ? never : K;
    type DFA_KEY<K> = NOT_VALID_DFA_KEY1<K> & NOT_VALID_DFA_KEY2<K>;

    type StatesDFAGroup<BUILD_ARGS, STATES, DFA_GROUPS> = {

        //Used when transition state has been called, with next undefined. Therefore, autoTrigger state for top-level DFA used, then starts from root. Otherwise, use expected next to figure out
        autoTriggerState?: keyof STATES,//Pick<string, keyof STATES>, //Key in StatesDFAGroup of whole BuildPipelineStatesDFA
        root: keyof STATES, //Key in this StatesDFAGroup
    } & {

        //Below commented line was very helpful in sieving out some strings
        // [key in Exclude<keyof STATES, "autoTriggerState" | "root">]?: StatesDFA<BUILD_ARGS> //Question mark makes it optional
        [key in keyof STATES]?: StatesDFA<BUILD_ARGS, STATES, DFA_GROUPS>
    }

    type StatesDFA<BUILD_ARGS, STATES, DFA_GROUPS> = {

        prev: keyof STATES | keyof DFA_GROUPS, //Key of DFA_GROUPS necessary because typescript cannot infer the actual keys of BuildPipelineStatesDFA during runtime if defined as string in static typing
        next: keyof STATES | keyof DFA_GROUPS, 
        cb: pipelineStateActionCallback<BUILD_ARGS, STATES, DFA_GROUPS>, 
        fail: keyof STATES | keyof DFA_GROUPS
        superPipelineLock?: boolean
    }

    type pipelineStateActionCallback<BUILD_ARGS, STATES, DFA_GROUPS> = genericParamFunction<PipelineStateActionCallbackArgs<BUILD_ARGS, STATES, DFA_GROUPS>>;

    type PipelineStateActionCallbackArgs<BUILD_ARGS, STATES, DFA_GROUPS> = { 
        
        buildArgs: GenericBuildPipelineBuildArgs<BUILD_ARGS, STATES, DFA_GROUPS>, 
        failNextCb: failNextCb<BUILD_ARGS, STATES, DFA_GROUPS> 
    }

    type failNextCb<BUILD_ARGS, STATES, DFA_GROUPS> = genericParamFunction<{ goToNext: boolean, buildArgs: GenericBuildPipelineBuildArgs<BUILD_ARGS, STATES, DFA_GROUPS> }>

    type TransitionDFAInfo<BUILD_ARGS, STATES, DFA_GROUPS> = {

        dfaGroupKey: keyof DFA_GROUPS, 
        DFA: StatesDFA<BUILD_ARGS, STATES, DFA_GROUPS>, 
        DFAKey_StateName: keyof STATES, 
        nextTransitionKey?: keyof STATES | keyof DFA_GROUPS,
        prioritizeAutoTrigger?: booolean //Special flag to allow for per run prioritization of auto trigger. Thus, can have optional DFA group speficiations if state not in autotrigger
    }

    type GenericBuildPipelineBuildArgs<BUILD_ARGS, STATES, DFA_GROUPS> = {

        myBuildArgs: BUILD_ARGS,
        completeCb?: genericParamFunction<BUILD_ARGS>, 
        targetDFAInfo?: Partial<TransitionDFAInfo<BUILD_ARGS, STATES, DFA_GROUPS>>, 
        buildDefinitionParams: { 
            
            buildID: string,
            buildStartStamp?: number,
            inheritBuildStartStamp?: number //Used to help coordinate intra or interpipeline builds (say you're pausing current pipeline flow to trigger a new flow (say build cancellation) then return to current flow)
        },
        failStartCb?: genericFunction
    }
}