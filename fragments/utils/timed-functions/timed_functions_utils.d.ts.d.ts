declare module "TimedFunctionUtils" {

    export declare interface TimedFunctionUtilsInstance{

        setTimedFunction(delayMs: number, callback: genericFunction, overrideId?: string): string;
        clearTimedFunction(id: string);
    }

    export declare interface TimedFunctionUtilsContructor{

        new(args: TimedFunctionUtilsContructorArgs): TimedFunctionUtilsInstance;
    }

    type TimedFunctionUtilsContructorArgs = {

        fragmentLifecycleInstance: FragmentLifeCycleInstance
    }
}