/**
 * @typedef {import("GenericBuildPipelineWorker").BASE_PIPELINE_STATE} BasePipelineGenericState
 * @typedef {import("GenericBuildPipelineWorker").BASE_PIPELINE_BUILD_ARGS} BasePipelineGenericBuildArgs
 * @typedef {import("GenericBuildPipelineWorker").BASE_PIPELINE_DFA_GROUPS} BasePipelineGenericDFAGroups
 * @typedef {import("GenericBuildPipelineWorker").BASE_PIPELINE_PSEUDO_STATE} BasePipelineGenericPseudoState
 */

/**
 * @template { BasePipelineGenericState } S
 * @template { BasePipelineGenericBuildArgs } B
 * @template {BasePipelineGenericDFAGroups} D_G
 * @template {BasePipelineGenericPseudoState} P_S
 * @typedef {import("GenericBuildPipelineWorker").GenericBuildPipelineWorkerConstructor<S,B, D_G, P_S>} GenericBuildPipelineWorkerConstructor
 */
/**
 * @template B,S, D_G, P_S
 * @typedef {import("GenericBuildPipelineWorker").GenericBuildPipelineWorkerConstructorArgs<B,S, D_G, P_S>} GenericBuildPipelineWorkerConstructorArgs
 */
/**
 * @template BUILD_ARGS, STATES, DFA_GROUPS
 * @typedef {import("GenericBuildPipelineWorker").BuildPipelineStatesDFA<BUILD_ARGS, STATES, DFA_GROUPS>} BuildPipelineStatesDFA
 */
/**
 * @template BUILD_ARGS, STATES, DFA_GROUPS
 * @typedef {import("GenericBuildPipelineWorker").StatesDFA<BUILD_ARGS, STATES, DFA_GROUPS>} StatesDFA
 */
/**
 * @template BUILD_ARGS, STATES, DFA_GROUPS
 * @typedef {import("GenericBuildPipelineWorker").TransitionDFAInfo<BUILD_ARGS, STATES, DFA_GROUPS>} TransitionDFAInfo
 */
/**
 * @template BUILD_ARGS, STATES, DFA_GROUPS
 * @typedef {import("GenericBuildPipelineWorker").GenericBuildPipelineBuildArgs<BUILD_ARGS, STATES, DFA_GROUPS>} GenericBuildPipelineBuildArgs
 */
/**
 * @template STATES
 * @typedef {import("GenericBuildPipelineWorker").PipelineWorkerAsynchronousBuildDefinition<STATES>} PipelineWorkerAsynchronousBuildDefinition
 */
/**
 * @template STATES
 * @typedef { import("GenericBuildPipelineWorker").GenericBuildPipelineWorkerPseudoStates<STATES> } GenericBuildPipelineWorkerPseudoStates
 */