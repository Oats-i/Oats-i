declare module "GenericTypes"{

    //https://medium.com/xgeeks/typescript-utility-keyof-nested-object-fa3e457ef2b2 

    // Create an object type from `ObjectType`, where the keys
    // represent the keys of the `ObjectType` and the values 
    // represent the values of the `ObjectType`
    // If the value is NOT of type `object` then 
    // set it as the generated object's value type
    // 1 - If it's an object, call the type again
    // 2 - Concat the previous key to the path
    // 3 - Add the object's key (doing that so that root also included in string literal options (|))
    //In order to only select keys of a specific type, we need to leverage the Intersection Types, which is just a matter of using the & operator
    //Extracting string/number keys only
    //Made fix for arrays, extracting up to nested objects within
    type NestedKeyOf<ObjectType extends object> = ObjectType extends any[] ? 
    
        ObjectType extends (infer U)[] ? U extends object ? `${_NestedArrayLiteral}${_NestedKeySplitter}${NestedKeyOf<U>}` : never : never : {

        [key in keyof ObjectType & (string | number)]: ObjectType[key] extends object ? 
                        `${key}` | `${key}${_NestedKeySplitter}${NestedKeyOf<ObjectType[key]>}` /**TODO */ :
                        key
    }[keyof ObjectType & (string | number)];

    type ArrDepthLimitedNestedKeyOf<ObjectType extends object, CurrDepth> = ObjectType extends any[] ? 

        CurrDepth extends '1' ? never :
        ObjectType extends (infer U)[] ? U extends object ? `${_NestedArraySelfType}` | `${_NestedArrayLiteral}${_NestedKeySplitter}${ArrDepthLimitedNestedKeyOf<U, '1'>}` : never : never : {

        [key in keyof ObjectType & (string | number)]: ObjectType[key] extends object ? 
                        `${key}` | `${key}${_NestedKeySplitter}${ArrDepthLimitedNestedKeyOf<ObjectType[key], CurrDepth>}` /**TODO */ :
                        key
    }[keyof ObjectType & (string | number)];

    type depthTest = ArrDepthLimitedNestedKeyOf<tryMeObj, 0>

    type ArrDepthLimitedNestedKeyOf_NoSelf<ObjectType extends object, CurrDepth> = ObjectType extends any[] ? 

        CurrDepth extends '1' ? never :
        ObjectType extends (infer U)[] ? U extends object ? `${_NestedArrayLiteral}${_NestedKeySplitter}${ArrDepthLimitedNestedKeyOf_NoSelf<U, '1'>}` : never : never : {

        [key in keyof ObjectType & (string | number)]: ObjectType[key] extends object ? 
                        `${key}` | `${key}${_NestedKeySplitter}${ArrDepthLimitedNestedKeyOf_NoSelf<ObjectType[key], CurrDepth>}` /**TODO */ :
                        key
    }[keyof ObjectType & (string | number)];

    type depthTest_NoSelf = ArrDepthLimitedNestedKeyOf_NoSelf<tryMeObj, 0>

    type NestedKeyOf_InclArr<ObjectType extends object> = ObjectType extends any[] ? 
    
        ObjectType extends (infer U)[] ? U extends object ? `${_NestedArraySelfType}` | `${_NestedArrayLiteral}${_NestedKeySplitter}${NestedKeyOf_InclArr<U>}` : `${_NestedArraySelfType}` : never : {

        [key in keyof ObjectType & (string | number)]: ObjectType[key] extends object ? 
                        `${key}` | `${key}${_NestedKeySplitter}${NestedKeyOf_InclArr<ObjectType[key]>}` /**TODO */ :
                        key
    }[keyof ObjectType & (string | number)];

    type _NestedArrayLiteral = `array`;

    type _NestedKeySplitter = `.`;

    type _ScopeModelRoot = "MODEL_ROOT";

    type _NestedArraySelfType = "selfType"

    type Leaves<T> = T extends object ? { [K in keyof T]:
        `${Exclude<K, symbol>}${Leaves<T[K]> extends never ? "" : `.${Leaves<T[K]>}`}`
      }[keyof T] : never;

    //Made this work. Excluding arrays
    //Orig - https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object 
    /**
     * Alt
     * 
     * type Paths<T, D extends number = 10> = [D] extends [never] ? never : T extends object ?
            { [K in keyof T]-?: K extends string | number ?
                `${K}` | Join<K, Paths<T[K], Prev[D]>>
                : never
            }[keyof T] : ""

        type Leaves<T, D extends number = 10> = [D] extends [never] ? never : T extends object ?
            { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T] : "";
     */
    //Get a case where you can check and index more objects in array. Yea
    type Paths<T> = T extends any[] ? never : T extends object ? { [K in keyof T]:
    `${Exclude<K, symbol>}${"" | `.${Paths<T[K]>}`}`
    }[keyof T] : never;

    //Beautiful Ian. Just beautiful. Chef's kiss!!!
    type tryMeObj = {
        name: 'pfigueiredo',
        age: 30,
        dog: {
            owner: {
                name: 'pfigueiredo',
                addr: {
                    street: "45th St. Kansas",
                    houseNo: "2SQ1",
                }
            }
        },
        5: {
            five: 6
        },
        "test": [1, 2, 3],
        arrayOfObj: [{ me: "baby", us: [{against: "the world"}], anotherArr: [1,2,3] }]
    }
    type tryME = NestedKeyOf<tryMeObj>
    type tryMeArr = NestedKeyOf_InclArr<tryMeObj>

    //Split this path and get the type of the value in the object in that nest depth
    // type ValueOfNested<Obj extends object, Path extends NestedKeyOf<Obj>> = Obj[`${Path}`]

    // We can create a type to extract the components of that string.
    // We'll split across one '.' characters.
    // Source: https://www.typescriptlang.org/play?ts=4.1.0-dev.20201028#code/PTAEBUFMFsAcBsCGAXSp4EtUCdHwM6gDGiAdqAEZoCu+kAJqMgPaiQAeyuRyoZj0MhljUkqUPi4ZSAc3RZIueEwCesSPgB0AKBAQAFhrSTs0uZhx5V6-ABpQ0ptWyl7JclVC0GfQrGzM6tjIGBr2-MRkoPQaRKZUumCwzPj4GBTwaFxk+ABmzNiCIcykhLkB0HwSUrJMrFHMFABWkDwO5FEAggAKAJI6iaAAxEOgAMo1cmMIWCG14Kyd5ADyza3I2oNQcGJoFop4hO5edKCwKDilvqAARPgzyAC0ydLI+Dd17bmKTIaD+NQKCYzIRHFRkAB3SCQUiaUAAMQKbHYiB2kE0GM2enA+gwhGQajQeKqwNq+yUoAhuKI+mIJXyhXx9XGMAAaopHpgANbGSY6AnqCBjdnYNIlUAAXluABZNABGTQAJhuWLAAHU0Mc4pAUGhENYsqwONk2shDHS4CUYW9QMxcr8UNVTLIdHoNQByeDKe4WPhxFL4iGsd2ad3EfSIbg4LTaAVoACinCjYxgADdFAAeFPQdPYCbOuTGmH0QikmQAPkl2lANZZOcU+bMyNQpBLoAABgASADe0m+2FAAFlEE0CgBfTQ9vs-QfSceT3ukfugbooGlj9ugAD81dr3dAglH2AAXEORwV7NA5yeh9f7OdkDTT6vH7Sx6BT-vFAEbzcAMJkKQzC8OcorGGmPxlh8Y6qqAAAy0hoHKEj6MwoiMJ4uSohgmCRg49oqGh7rpugzDMDyjCOmaaD+K0DBNhwqIIBox6DIxaLHq8ASPCwPEwAguqcgoSiEGA7HMcegiwOo9A8YS+CPBCWD6HxOyCeShywQhpBoIqDiEPqRAlPQWAYCUVhxvY4CEmMcTCLwqZ4Bg9C6viEa8NRXw-A+lwHmuhj4IMiAyIg0iSHWuaNrUoGopAOADHo2loAAzPpvxoNgGiiLwdrpXSrameZ8D2Bg9pcNQWSGOQ-jMKmzl6uQjQtDwgxKWaeUAkCkx+IgqQ+K8rAmbk-bWmcKSFVcjgNGsPBwr0ZXmmWgz0MwGigEBvBFDS9jUeQmXIM45CeXGlLKXw5Dfki+ARuoAwneAYySqAiYmsg2a5hmD0imKpDlrBOLEkGpDurwEatpkdYiqAcoAAwwwApPYVAkN4Di8MSUTiZkrEnQAQog9DvYouPUMgywANJRXIUovcmEHYBmNyyjDmiIs4mjSpz0o3H9gwABLMFCub2LTiA8ETA5KV6oBYThtrkGWhBUhgNLRCUIMy1geUMkUcIA0cvWQK1OHKCU8AqH5r6UlVJKTKAEZuWgOuOjcAAamgAJqaAAWjc9jK6rnk6Zw8g6Wra0bTjhIRYo8bYD+T2i+L9OM2zA4vKQvDe4orAZ7w8IYOmPOwSMoAAEqtM4aQkVT4wPHMMj-eatF1WhhBY2gUum6Q5uUgUXLWzCoCEdQ9uICRmMom0ZafFt+i2IMDIHgUaCkNQZBED4JB0IQI+UmQvBBtgA9tbSnnWeotmmLAvDMzLOoHZlp4d8ejmmATKs8dQzExlsrA+lrfUM8BqgEyo8WgiAMiamYJaHSmc7AQG-pkAymUqgyDIowCEiALYsFADySAsBBgmgHrlTymUATwDeHCPmihIDugMhIB4BpWKxmjtMCwWZmzFlLJMewAARLhrYeEFkrBKXcNYZ5FiEeMbcTozAAG0AC6H5xEyKkW2d0YYtygCUSo2sajODcI7FOJcPxwBjh7Hwixi5lwAFUNyyPkeAewGJNDsKwBmWx-DyzKNPPIsYiiADcWlELQ2iK0JA5CmBBjOJGVECCoSemUKjNIsgIY0jiTwRQZQkQUEynVAkrowCPUyrROg8COp21wQA5A4RWygAEcSTyMRMBXlICgAoetcSBT0JgMOMIARROohbSMaAKDAVpIrBKYAkqgD0jSVoXJQT2mAQwjSxVKAWwWUQLkTZSpoJhAcb0kxBjHE8Oonw5QYF5WkCIXgZY5orOYPYfah1bYFj4PHbBcINSnLIBrI+J8zpAVIEJSwxyCzTOepoGQcIzTEm3pAKOgoxjISlO45AGYyz2BuJoYugxZmpW2Us-ClSPnEn4gSEqTzQFxTeZjOABInDMVYSivS6KHiMz9rcPFvNEqhOlGPBhaQryRPDIsz4aEBxJzevTR5ZKmxzw0IMds8juiZVyBgdg1xwCKPkXwyArTpAdOwHqsY1BhpauuLYxRm5drNijHlWimrtUAApwAAEp2i4OoovDAooQJxOgHFH4uV9QHWYjtG2YDsDUHIBi+WHULUutAK62xXrcEDOcEbPQZpHTQBXg6RqYc56RA8E7NCrYimDHmgq2oK0I7AXaEQeA1AYh5RaRgNpJqo1D1eS4KoEaIa5WQoMTIsh2oB1pEZTOoUrieRnucPqjApoGQ6NgGQ1Bg2Z1TWMD1UKxhduYpEOgrK0BjFShyjhNwFTKhxby2CaoTa0qIFXNAJRN6fBkHFPg0tPKhlLPXBgZ7xiCqvR4m9SpNDJW5bi-FbozrwsIFyICEJMj0G-fYPe100LwAwnqKBnxMoE3OowONMQA0RAAI7UAUHwRekAIS2gWtA6A0A41YAth3QgpD+K7HkOChBS8X6JEGI8UASxkRlMIAEUmaBjRRlyRbPhURWT8EUFyVEgx9DIGQLAfAx4QCQlmIoTQRloDABcqQVM9AuTAEkCgWgwA5TJRhnKAA7DDTzioABsABWLzcoACcAAOaUPnpSib0OJzo4TNWkAmjLJEK1X3buQJoGjigVApkyDwJTt4eTlxUGQbTun9OGeAMZ3TpnzPACvDybAxXWyQFTPZ5Ajn8DOdc2F9zipFTuaC25uGio-PSnc+5qLYBuiQECBDCME8CBGnYEELt1ofCn1ADRuj5mZgkFQIwRdkY6CilAIMWgTZUBqXEDPdZCTqS0lGTLONoBxMUFJutJtmVzPbpiIwBkgwar0GoDwMy5AjIxAoIbGMIBSt6YMyAGQylARmZgcAGQqFRCYEUMARAUJ8AwMgKpASqAwVHLkjYQYgxlgDmI4wTygFK2bzS5QeAzA5DJEkKxPQOm4cVZiKmDIbOtBXn9Pj3I6XatxnwHZG+OPSBATjUQMw5PYjXyeNKR4cpHjgkQMAIYl3ieE-WSr-AQA 
    type ExtractValueTypeofNested<Obj extends object, NestedKey extends NestedKeyOf<Obj> | NestedKeyOf_InclArr<Obj>> =

        NestedKey extends `${_ScopeModelRoot}` ? Obj :

        //For ones with dots
        NestedKey extends `${infer Parent}${_NestedKeySplitter}${infer Children}` ?

        //Deal with array (Pass and infer its type)
        Parent extends `${_NestedArrayLiteral}` ?
        //Object an array actually. So, infer internal array type
        //object check unnecessary. However, help detect bugs in getting nested keys in case of [below - first never - {never: "extend"}] type definition changes
        Obj extends (infer U)[] ? U extends object ? ExtractValueTypeofNested<U, Children> : never : never /*An impossible state*/ :

        //Object not an array
        //Check below unnecessary. But adding to detect bugs i.e provided parent in a dot format not referencing an object (from which arrays also extend as observed)
        Obj[Parent] extends object ? ExtractValueTypeofNested<Obj[Parent], Children> : never /**An impossible state. MUST infer type since key was recorded and stored  */ :

        //Parent only. Last iteration. Cannot have "array" here as that's only included if another object inside array 
        //Last check allows us to have never as a value instead of unknown. Easier to work with
        NestedKey extends `${infer SoleParent}` ? 
            SoleParent extends `${_NestedArraySelfType}` ? Obj extends (infer U)[] ? U : never :
            NestedKeyOf<Obj> extends `${infer finalParent}${_NestedKeySplitter}${infer unreachableChildren}` ? SoleParent extends finalParent ? Obj[SoleParent] : 
            never : NestedKeyOf<Obj> extends `${infer lastParent}` ? lastParent extends SoleParent ? Obj[SoleParent] : never : never :
        //Complete fail
        never;

    type ExtractedValueOfTryMe = ExtractValueTypeofNested<tryMeObj, "arrayOfObj.array.us.selfType">;

    //THE BASIS FOR VALID SCOPES FOR LIST (Include model root)
    type isArray = ExtractValueTypeofNested<tryMeObj, "arrayOfObj"> extends (infer U)[] ? true : false;

    /**
     * Get nested keys for arrays only
     */
    type ArrayOnlyNestedKeys_OLD<ObjectType, ORIG> = ObjectType extends any[] ? 
        
        ObjectType extends (infer U)[] ? U extends object ? '' | `${_NestedKeySplitter}${_NestedArrayLiteral}${ArrayOnlyNestedKeys<U, ORIG>}` : '' : never : {

        //Not using this - & (string | number)
        [key in keyof ObjectType]: ObjectType[key] extends object ?
                //Case of objectType and original (ORIG are the same)
                ORIG extends ObjectType ? `${_ScopeModelRoot}` | `${key}${ArrayOnlyNestedKeys<ObjectType[key], ORIG>}` : `${_NestedKeySplitter}${key}${ArrayOnlyNestedKeys<ObjectType[key], ORIG>}` :
                never
    }[keyof ObjectType];

    /**
     * Get nested keys for arrays only
     */
    type ArrayOnlyNestedKeys<ObjectType, ORIG> = 
        ObjectType extends any[] ? 
        
            ObjectType extends (infer U)[] ? 
                U extends object ? 
                    '' | `${_NestedKeySplitter}${_NestedArrayLiteral}${ArrayOnlyNestedKeys<U, ORIG>}` 
                : '' 
            : never 
        : {

        //Not using this - & (string | number)
        [key in keyof ObjectType]: ObjectType[key] extends object ?
                //Case of objectType and original (ORIG are the same)
                ORIG extends ObjectType ? `${_ScopeModelRoot}` | `${key}${ArrayOnlyNestedKeys<ObjectType[key], ORIG>}` : `${_NestedKeySplitter}${key}${ArrayOnlyNestedKeys<ObjectType[key], ORIG>}` :
                //Case of objectType and original (ORIG are the same), but key points to literal
                ObjectType extends ORIG ? `${_ScopeModelRoot}` : never
    }[keyof ObjectType];

    type tryArrOnly = ArrayOnlyNestedKeys<tryMeObj, tryMeObj>;
    type t2 = ArrayOnlyNestedKeys<{ me: "you" }, { me: "you" }> 
    //extends Means left HAS what is in right (so, left more expansive)
    type t3 = { me: "you", us: "them", we: "are" } extends { me: "you", us: "them"} ? true : false;

    type ArrayOnlySelfType<ObjectType, ORIG> = ObjectType extends any[] ? 
        
        ObjectType extends (infer U)[] ? U extends object ? `${_NestedKeySplitter}${_NestedArraySelfType}` | `${_NestedKeySplitter}${_NestedArrayLiteral}${ArrayOnlySelfType<U, ORIG>}` : `${_NestedKeySplitter}${_NestedArraySelfType}` : never : {

        //Not using this - & (string | number)
        [key in keyof ObjectType]: ObjectType[key] extends object ?
                ORIG extends ObjectType ? `${_ScopeModelRoot}` | `${key}${ArrayOnlySelfType<ObjectType[key], ORIG>}` : `${_NestedKeySplitter}${key}${ArrayOnlySelfType<ObjectType[key], ORIG>}` :
                never
    }[keyof ObjectType];

    type tryArraySelfType = ArrayOnlySelfType<tryMeObj, tryMeObj>;

    type ArraySelfTypeValidityTest<Obj, selfType extends ArrayOnlySelfType<Obj, Obj>> = ExtractValueTypeofNested<Obj, selfType>;
    type selfTypeValidation = ArraySelfTypeValidityTest<tryMeObj, "arrayOfObj.selfType">;

    //Get the value from an array only type
    type ExtractValueTypeOfArrayOnly<M, ArrKey extends ArrayOnlyNestedKeys<M, M>> = ArrKey extends `${_ScopeModelRoot}` ? ExtractValueTypeofNested<M, ArrKey> : ExtractValueTypeofNested<M, `${ArrKey}${_NestedKeySplitter}${_NestedArraySelfType}`>;
    type extractArrTypeTest = ExtractValueTypeOfArrayOnly<tryMeObj, "arrayOfObj">

    //Gets you the valid nested child keys of an array. Limits depth to 1 due to visibility into index of second one
    //Can't change specifics of nest deep since no ordered array index. Each value doesn't represent another unique viewNode
    type NestedChildKeyOfArray<ObjectType extends object, baseScope extends NestedKeyOf<ObjectType>> = ObjectType extends any[] ? 
    
        //Work better with arrays
        ObjectType extends (infer U)[] ? U extends object ? 
            baseScope extends `${infer arrayParent}${_NestedKeySplitter}${infer arrayChildren}` ?
                `${_NestedArrayLiteral}${_NestedKeySplitter}${NestedChildKeyOfArray<U, arrayChildren>}` : never : never : never : {

        [key in keyof ObjectType & (string | number)]: 
        //Check parent, with dot or sole. If match to key, process else no.
        //BE SENSITIVE OF KEY BEING A NUMBER OF STRING 
            baseScope extends `${infer Parent}${_NestedKeySplitter}${infer Children}` ? `${key}` extends Parent ?    
            ObjectType[key] extends  ExtractPartialTypeofNested<ObjectType, baseScope>[key] ? 
                        `${key}${_NestedKeySplitter}${NestedChildKeyOfArray<ObjectType[key], Children>}` /**TODO */ :
                        never : never : 
            //For sole. Deal with it smart. Cascading sole to the rest, with correct depth
            baseScope extends `${infer SoleParent}` ? `${key}` extends SoleParent ?
            ObjectType[key] extends  ExtractPartialTypeofNested<ObjectType, baseScope>[key] ? 
                        //Depth limiting here, because this is where we actually get the keys
                        ExtractValueTypeofNested<ObjectType, key> extends object ?
                        `${key}${_NestedKeySplitter}${ArrDepthLimitedNestedKeyOf<ObjectType[key], '0'>}` /**TODO */ : never :
                        never : never : never
    }[keyof ObjectType & (string | number)];

    type nestedChildKeyArrTest = NestedChildKeyOfArray<tryMeObj, "arrayOfObj">

    //Gets you the valid nested child keys of an array. Limits depth to 1 due to visibility into index of second one
    //Can't change specifics of nest deep since no ordered array index. Each value doesn't represent another unique viewNode
    type NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, ObjectType, ScopedModel, CurrDepth> = 
    
        ObjectType extends any[] ? 
                
            ObjectType extends (infer U)[] ? 
                U extends object ?
                    CurrDepth extends '0' ?
                        //Only valid if value of scope is array. If not, rest pass depth at 1 to avoid hitting arrays
                        // `${_NestedKeySplitter}${_NestedArrayLiteral}${NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, U, ScopedModel, '1'>}`
                        `${_NestedArrayLiteral}${NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, U, ScopedModel, '1'>}`
                    //When here, stopped at depth of first array checked and done. So, let's switch up to the next possible one at the start
                    : ''
                : '' //Leave it like this so we can also get arrays with non-objects (loops cause of key in keyof) 
            : never
        : {

            //Not using this - & (string | number)
            [key in keyof ObjectType]: 
                ObjectType[key] extends object ?
                    //Case of objectType and original (ORIG are the same)
                    ScopedModel extends ObjectType ? 
                        `${key}${NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, ObjectType[key], ScopedModel, '1'>}` 
                    // : `${_NestedKeySplitter}${key}${NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, ObjectType[key], ScopedModel, '1'>}` 
                    : `${_NestedKeySplitter}${key}${NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, ObjectType[key], ScopedModel, '1'>}` 
                        //Case of objectType and original (ORIG are the same), but key points to literal
                : never
        }[keyof ObjectType];

    // type NestedChildKeysOfArray_ArrayOnly_Base<MODEL, BaseScope extends ArrayOnlyNestedKeys<MODEL, MODEL>> = NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, ExtractPartialTypeofNested<MODEL, BaseScope>, ExtractPartialTypeofNested<MODEL, BaseScope>, BaseScope extends _ScopeModelRoot ? '1' : '0'>
    //With below, currDepth inits at zero. Allows to get into array if its the first dip (thus scope of req)
    //and then have rest confidently treat depth as 1 because that's the next array we'll hit in keys
    type NestedChildKeysOfArray_ArrayOnly_Base<MODEL, BaseScope extends ArrayOnlyNestedKeys<MODEL, MODEL>> = BaseScope extends _ScopeModelRoot ? NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, ExtractPartialTypeofNested<MODEL, BaseScope>, ExtractPartialTypeofNested<MODEL, BaseScope>, BaseScope extends _ScopeModelRoot ? '1' : '0'>
                                                                                                                                                : `${BaseScope}${_NestedKeySplitter}${NestedChildKeyOfArray_ArrayOnly_DL<BaseScope, ValueTypeOfNested<MODEL, BaseScope>, ValueTypeOfNested<MODEL, BaseScope>, '0'>}`

    type nestedChildKeyArrTest_NoTest = NestedChildKeysOfArray_ArrayOnly_Base<tryMeObj, "MODEL_ROOT">
    type nestedChildKeyArrTest_NoTest = NestedChildKeysOfArray_ArrayOnly_Base<tryMeObj, "arrayOfObj">
    // type nestedChildKeyArrTest_NoTest = NestedChildKeysOfArray_ArrayOnly_Base<BlogArticleFinalModel, "mainBlogData">


    /**
     * Now use above to restrict scope of list view managers to array only, and data type to selftype or array only
     */

    /**
     * This type infers the partial of a model created using the nested keys
     * Creates a model based on the keys (scope/path) provided
     * 
     * Now, using this to correctly get nested child keys
     * 
     * Need to send never for failures - Working towards relative children
     */
    type ExtractPartialTypeofNested<Obj extends object, NestedKey extends NestedKeyOf<Obj> | _ScopeModelRoot> =

        NestedKey extends `${_ScopeModelRoot}` ? Partial<Obj> :

        //Works partly. Using array breaks it
        ExtractValueTypeofNested<Obj, NestedKey> extends never ? never :

        //For ones with dots
        NestedKey extends `${infer Parent}${_NestedKeySplitter}${infer Children}` ?

        //Deal with array (Pass and infer its type)
        Parent extends `${_NestedArrayLiteral}` ?
        //Object an array actually. So, infer internal array type
        //object check unnecessary. However, help detect bugs in getting nested keys in case of [below - first never - {never: "extend"}] type definition changes
        Obj extends (infer U)[] ? U extends object ? [ExtractPartialTypeofNested<U, Children>] : never : never /*An impossible state*/ :

        //Object not an array
        //Check below unnecessary. But adding to detect bugs i.e provided parent in a dot format not referencing an object (from which arrays also extend as observed)
        Obj[Parent] extends object ? {

            [x in Parent]: ExtractPartialTypeofNested<Obj[Parent], Children>
        } : never /**An impossible state. MUST infer type since key was recorded and stored  */ :

        //Parent only. Last iteration. Cannot have "array" here as that's only included if another object inside array 
        NestedKey extends `${infer SoleParent}` ? 
            SoleParent extends `${_NestedArraySelfType}` ? Obj extends (infer T)[] ? [T] : never : {
            
            [x in SoleParent]: Obj[SoleParent]
        } : 
        never;

    type ExtractedPartialOfTryMe = ExtractPartialTypeofNested<tryMeObj, "arrayOfObj.array.us.array.against">;

    /**
     * POWERFUL
     * 
     * Infer scope of an object from the main object or model
     * First, we create an object with keys matching level 1 keys of main object or model
     * and values a concatenation of the scope leading to this object from that top level
     * 
     * _FindNestedKeyOfObjIn uses _FindNestedFlatKeysIn for proper flattenning. If a level is searched and no match is found in type, returns never.
     * ONLY the matching level will have a string value, denoting the scope
     * 
     * Then, InferNestFromIn flattens this object, extracts the value of the scope, and the one that matches (SHOULD BE ONE ONLYYY)
     * denotes the correct scope
     * 
     * NOTE: Should only have ONE level 1 key that resolves to the path, others never. Multiple is an error probably
     * 
     * CAN USE THIS to dynamically infer the scope of a model at any level using, say
     * dataManager.addToModel(newModelPartial).onDataMutation(inferredScope, worker);
     * Therefore, stored to correct scope.
     * NOICE
     */
    //ORIGINAL
    type NestedKeyOfObjIn<Obj, MainObj> = InferNestFromIn<Obj, MainObj, _FindNestedKeyOfObjIn<Obj, MainObj>>
    // type NestedKeyOfObjIn<Obj, MainObj> = _FindNestedKeyOfObjIn<Obj, MainObj>

    type _FindNestedKeyOfObjIn<Obj, MainObj> = 

            {

                [key in keyof MainObj]: 
                            MainObj[key] extends Obj 
                            ?
                                `${key}` 
                            :
                            MainObj[key] extends object ?

                                `${key}${_NestedKeySplitter}${_FindNestedFlatKeysIn<Obj, MainObj[key]>}` /**TODO */ :
                            never;
            }

    type _FindNestedFlatKeysIn<Obj, MainObj> = 
    
        MainObj extends any[] 
        ? 
        
            MainObj extends (infer U)[] 
            ? 
                U extends Obj ? `${_NestedArraySelfType}` :
                U extends object 
                ? 
                    `${_NestedArrayLiteral}${_NestedKeySplitter}${_FindNestedFlatKeysIn<Obj, U>}` 
                : 
                    never 
            : 
                never 
        :

            {

                [key in keyof MainObj & (string | number)]: 
                            MainObj[key] extends Obj ?
                                `${key}` :
                            MainObj[key] extends object ?

                                `${key}${_NestedKeySplitter}${_FindNestedFlatKeysIn<Obj, MainObj[key]>}` /**TODO */ :
                            never;
            }[keyof MainObj & (string | number)]

    type InferNestFromIn<Obj, MainObj, NestedKeyAsObj> = {

        [key in keyof NestedKeyAsObj]: ExtractValueTypeofNested<MainObj, NestedKeyAsObj[key]> extends Obj ? NestedKeyAsObj[key] : never;
    }[keyof NestedKeyAsObj];

    type inferredFromObj = NestedKeyOfObjIn<{against: "the world"}, tryMeObj>;

    //Gets you the valid nested child keys of a given base scope
    type NestedChildKeyOf<ObjectType extends object, baseScope extends _ScopeModelRoot | NestedKeyOf<ObjectType>> = baseScope extends _ScopeModelRoot ? NestedKeyOf<ObjectType> : ObjectType extends any[] ? 
    
        //Work better with arrays
        ObjectType extends (infer U)[] ? U extends object ? 
            baseScope extends `${infer arrayParent}${_NestedKeySplitter}${infer arrayChildren}` ?
                `${_NestedArrayLiteral}${_NestedKeySplitter}${NestedChildKeyOf<U, arrayChildren>}` : never : never : never : {

        [key in keyof ObjectType & (string | number)]: 
        //Check parent, with dot or sole. If match to key, process else no.
        //BE SENSITIVE OF KEY BEING A NUMBER OF STRING 
            baseScope extends `${infer Parent}${_NestedKeySplitter}${infer Children}` ? `${key}` extends Parent ?    
            ObjectType[key] extends  ExtractPartialTypeofNested<ObjectType, baseScope>[key] ? 
                        `${key}${_NestedKeySplitter}${NestedChildKeyOf<ObjectType[key], Children>}` /**TODO */ :
                        never : never : 
            //For sole, okay listing all. But not for children
            baseScope extends `${infer SoleParent}` ? `${key}` extends SoleParent ?
            ObjectType[key] extends  ExtractPartialTypeofNested<ObjectType, baseScope>[key] ? 
                        //This line below makes a simple check to deal with issues of string objects being extracted into keys
                        //If the extracted value type of the given key in the object extends an object, 
                        //we can get the nested keys
                        //Else, have this particular value as never, to avoid getting the keys of the string object
                        //USE THIS LOGIC, but I think for partials, to deal with functions and classes?
                        ExtractValueTypeofNested<ObjectType, key> extends object ?
                        `${key}${_NestedKeySplitter}${NestedKeyOf<ObjectType[key]>}` /**TODO */ : never :
                        never : never : never
    }[keyof ObjectType & (string | number)];


    type nestedChildKeysTest = NestedChildKeyOf<tryMeObj, "arrayOfObj.array.us">;
    type m = tryMeObj['dog']['owner']['name'] extends ExtractPartialTypeofNested<tryMeObj['dog']['owner'], "name">['name'] ? true : false;
    type xx = ExtractPartialTypeofNested<tryMeObj['dog']['owner'], "name">
    type mmTEST = ExtractValueTypeofNested<tryMeObj['dog']['owner'], "name"> extends object ? true : false;
    type ns = NestedKeyOf<tryMeObj['dog']>;
    type ns2 = NestedKeyOf<ExtractValueTypeofNested<tryMeObj, "dog.owner">>

    /**
     * This type infers the partial of a model created using the nested keys
     * Creates a model based on the keys (scope/path) provided
     * 
     * Now, using this to correctly get nested child keys
     * 
     * Need to send never for failures - Working towards relative children
     */
    type Extract_ToDepth_PartialTypeofNested<Obj extends object, NestedKey extends NestedKeyOf<Obj>> =

        NestedKey extends `${_ScopeModelRoot}` ? Partial<Obj> :

        //Works partly. Using array breaks it
        ExtractValueTypeofNested<Obj, NestedKey> extends never ? never :

        //For ones with dots
        NestedKey extends `${infer Parent}${_NestedKeySplitter}${infer Children}` ?

        //Deal with array (Pass and infer its type)
        Parent extends `${_NestedArrayLiteral}` ?
        //Object an array actually. So, infer internal array type
        //object check unnecessary. However, help detect bugs in getting nested keys in case of [below - first never - {never: "extend"}] type definition changes
        Obj extends (infer U)[] ? U extends object ? [Extract_ToDepth_PartialTypeofNested<U, Children>] : never : never /*An impossible state*/ :

        //Object not an array
        //Check below unnecessary. But adding to detect bugs i.e provided parent in a dot format not referencing an object (from which arrays also extend as observed)
        Obj[Parent] extends object ? {

            [x in Parent]: Extract_ToDepth_PartialTypeofNested<Obj[Parent], Children>
        } : never /**An impossible state. MUST infer type since key was recorded and stored  */ :

        //Parent only. Last iteration. Cannot have "array" here as that's only included if another object inside array 
        NestedKey extends `${infer SoleParent}` ? 
            SoleParent extends `${_NestedArraySelfType}` ? Obj extends (infer T)[] ? [T] : never : {
            
            [x in SoleParent]: null
        } : 
        //Complete fail - was { error: "Nested Key invalid" }
        never;
    type NestedParentKeysOf<M, ReqScope extends NestedKeyOf<M>> = ReqScope extends _ScopeModelRoot ? _ScopeModelRoot : _ScopeModelRoot | NestedKeyOf<Extract_ToDepth_PartialTypeofNested<M, ReqScope>>
    type nestedParentTest = NestedParentKeysOf<tryMeObj, "5.five">
    type what = Extract_ToDepth_PartialTypeofNested<tryMeObj, "5">

    //Gets you the valid nested child keys of a given base scope
    type NestedRelativeChildKeyOf<ObjectType extends object, baseScope extends _ScopeModelRoot | NestedKeyOf<ObjectType>> = 
    
        baseScope extends `${_ScopeModelRoot}` ? 
            NestedKeyOf<ObjectType> :
        baseScope extends `${infer Parent}${_NestedKeySplitter}${infer Children}` ?
            Parent extends `${_NestedArrayLiteral}` ? 
                ObjectType extends (infer U)[] ? 
                    U extends object ? 
                        NestedRelativeChildKeyOf<U, Children> :
                    never :
                never :
            NestedRelativeChildKeyOf<ObjectType[Parent], Children> :
        baseScope extends `${infer SoleParent}` ? 
            //Remove string primitive mapping to keys
            ExtractValueTypeofNested<ObjectType, SoleParent> extends object ?
                `${NestedKeyOf<ObjectType[SoleParent]>}` : 
            never :
        never;
        
    // ObjectType extends ExtractPartialTypeofNested<ObjectType, baseScope> ? ObjectType extends any[] ? 
    
    //     ObjectType extends (infer U)[] ? U extends object ? `${_NestedArrayLiteral}${_NestedKeySplitter}${NestedKeyOf<U>}` : never : never : 
    //     `${NestedChildKeyOf<ObjectType, baseScope> }` : never;

    type nestedRelativeChildKeysTest = NestedRelativeChildKeyOf<tryMeObj, "arrayOfObj.array.us">;
}