/**
 * With scope figured out, I don't think this is needed anymore
 */

declare module "DataModel" {

    declare interface DataModelInstance{

        //Declare your data points here
        //Have setters for each defined as set("property_literal", fn(type_of_literal) => void);

        set<DMI>(property_name: `${DMI[]}`)
    }

    export declare interface DataModelConstructor{

        new(dataManager: DataManagerInstance): DataModelInstance
    }
}