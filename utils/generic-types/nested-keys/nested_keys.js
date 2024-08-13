/**
 * @template M
 * @typedef {import("GenericTypes").NestedKeyOf<M>} NestedKeyOf
 */

/**
 * @template M, S
 * @typedef {import("GenericTypes").ExtractValueTypeofNested<M, S>} ValueTypeOfNested
 */

/**
 * @template M, S
 * @typedef {import("GenericTypes").ExtractPartialTypeofNested<M, S>} PartialTypeOfNested
 */

/**
 * @template M, S
 * @typedef {import("GenericTypes").Extract_ToDepth_PartialTypeofNested<M, S>} PartialTypeOfNested_ToDepth
 */

/**
 * @template M, P_M
 * @typedef {import("GenericTypes").NestedKeyOfObjIn<M, P_M>} NestedKeyOfObjIn
 */

/**
 * @template M, B_S
 * @typedef {import("GenericTypes").NestedChildKeyOf<M, B_S>} NestedChildKeyOf
 */

/**
 * @template M, B_S
 * @typedef {import("GenericTypes").NestedParentKeysOf<M, B_S>} NestedParentKeysOf
 */

/**
 * @template M, B_S
 * @typedef {import("GenericTypes").NestedRelativeChildKeyOf<M, B_S>} NestedRelativeChildKeyOf
 */

/**
 * @typedef {import("GenericTypes")._NestedArrayLiteral} _NestedScopedArrayLiteral
 */

/**
 * @typedef {import("GenericTypes")._NestedKeySplitter} _NestedScopeKeySplitter
 */

/**
 * @typedef {import("GenericTypes")._ScopeModelRoot} _ScopeModelRoot
 */

/**
 * @typedef {import("GenericTypes")._NestedArraySelfType} _NestedArraySelfType
 */

/**
 * @template M
 * @typedef {import("GenericTypes").ArrayOnlyNestedKeys<M, M>} ArrayOnlyNestedKeys
 */

/**
 * @template M
 * @typedef {import("GenericTypes").ArrayOnlySelfType<M, M>} ArrayOnlySelfType
 */

/**
 * @template M, S
 * @typedef {import("GenericTypes").ExtractValueTypeOfArrayOnly<M, S>} ValueTypeOfArrayOnly
 */

/**
 * @template M, S
 * @typedef {import("GenericTypes").NestedChildKeyOfArray<M, S>} NestedChildKeyOfArray
 */

/**
 * @template M, S
 * @typedef {import("GenericTypes").NestedChildKeysOfArray_ArrayOnly_Base<M, S>} NestedChildKeysOfArray_ArrayOnly
 */

/**
 * @template M
 * @typedef {import("GenericTypes").NestedKeyOf_InclArr<M>} NestedKeyOf_InclArr
 */