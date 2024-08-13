declare module "FragmentLifeCycleInstance"{

    declare interface FragmentLifeCycleInstance{

        registerLifeCycleListeners(listenerGroup: LifeCycleListenerGroup): void;
        deregisterLifeCycleListeners(listenerGroup: LifeCycleListenerGroup): void;
    }

    type LifeCycleListenerGroup = {

        onFragmentRunning: genericFunction,
        onFragmentDestroyed: genericFunction,
        onFragmentCancelled: genericFunction,
        onViewReady?: genericFunction
    }
}

declare module "FragmentLifeCycleManager"{

    declare interface FragmentLifeCycleManagerConstructor{

        new(): FragmentLifeCycleManagerInstance;
        get _LIFECYCLE_STAGES(): FragmentLifeCycleStages;
    }
    
    declare interface FragmentLifeCycleManagerInstance{
    
        //Members
        currentLifeCycleStage: number;
        registeredLifeCycleListeners: LifeCycleListenerGroup[];
    
        //Methods
        transitionLifeCycle(newStage: number): void;
        onLifeCycleDestroy(): void;
        onLifeCycleRunning(): void;
        registerLifeCycleListeners(listenerGroup: LifeCycleListenerGroup): void;
        deregisterLifeCycleListeners(listenerGroup: LifeCycleListenerGroup): void;
        isFragmentLifeCycleRunning(): boolean;
    }
    
    type FragmentLifeCycleStages = {
    
        running: number,
        destroyed: number,
        cancelled: number
    }
}