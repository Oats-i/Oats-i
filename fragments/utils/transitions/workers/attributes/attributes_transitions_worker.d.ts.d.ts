declare module "AttributesTransitionsWorker"{

    declare interface AttributesTransitionsWorkerInstance extends TransitionsBaseWorkerInstance{

        
    }

    //See what extends will affect. Noted I can access the statics on the other end
    declare interface AttributesTransitionsWorkerConstructor implements TransitionsBaseWorkerConstructor{

        new(args: AttributesTransitionsWorkerConstructorArgs): AttributesTransitionsWorkerInstance;
        get ToggleAttribute(): "transition_attr_toggle";
    }

    type AttributesTransitionsWorkerConstructorArgs = TransitionsBaseWorkerConstructorArgs & {

        //Nodes in this list will animate together, and callback called once, with assumption all started at the same time
        //Also, all animate in css using same attribute
        overrideNodesList?: Element[];
        customTargetAttribute?: string;
    }

    type AttributesTransitionWorkerDataModel<T> = "0" | "1" | T;
}