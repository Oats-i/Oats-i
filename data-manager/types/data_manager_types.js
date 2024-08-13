/**
 * @template M
 * @typedef {import("DataManager").DataManagerAPIInterface<M>} DataManagerAPIInterface
 */

/**
 * @typedef {import("DataManager").BASE_DATA_MODEL} BASE_DATA_MODEL
 */

/**
 * @template M
 * @typedef {import("DataManager").DataManagerInstance<M>} DataManagerInstance
 */

/**
 * @template M, E
 * @typedef {import("DataManager").DataManagerConstructorArgs<M, E>} DataManagerConstructorArgs
 */

/**
 * @template M
 * @typedef {import("DataManager").DataManagerAPIOptions<M>} DataManagerAPIOptions
 */

/**
 * @template M
 * @typedef {import("DataManager").DataManagerAPIInterface<M>} DataManagerAPIInterface
 */

/**
 * @typedef {import("DataManager").SERVER_SIDE_DATA_ATTRIBUTES } DataManagerServerSideDataAttributes
 */

/**
 * @typedef {import("DataManager").DataManagerBaseViewOptions } DataManagerBaseViewOptions
 */

/**
 * @typedef { import("DataManager").SendDataOptions } SendDataOptions
 */

/**
 * @typedef { import("DataManager").DataManagerMutations } DataManagerMutations
 */

/**
 * @template M
 * @typedef {import("DataManager").onServerSideLoadCb<M>} onServerSideLoadCb
 */

/**
 * @template R
 * @typedef {import("DataManager").DataOperationNetworkArgs<R>} DataOperationNetworkArgs
 */

/**
 * @typedef {import("DataManager").DataManagerReqOptions} DataManagerRequestOptions
 */

/**
 * @template M, S
 * @typedef {import("DataManager").DataOperationsNetworkInterface<ValueTypeOfNested<M, S>, S, M>} DataManagerDataOperationsNetworkInterface
 */

/**
 * @template M
 * @template {keyof DataManagerInstance<M>['masterWorkingModel']['scopedOptions']['apis']} S
 * @typedef {import("DataManager").DataManagerPermittedBulkType<M, S>} DataManagerPermittedBulkType
 */

/**
 * @template S
 * @typedef {import("DataManager").DataManagerPermittedBulkModelIDs<S>} DataManagerPermittedBulkModelIDs
 */

/**
 * @typedef {import("DataManager").DataManagerHydrationInfo} DataManagerHydrationInfo
 */

/**
 * @typedef {import("DataManager").DataManagerErrResponse} DataManagerErrResponse
 */