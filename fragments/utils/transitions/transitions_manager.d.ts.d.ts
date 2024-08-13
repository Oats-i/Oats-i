declare module "TransitionsManager"{

    declare interface TransitionsManagerInstance{

        //members

        runTransitions(args: TransitionsManagerRunArgs<{}>, completeCb: genericFunction): void;
        cancelTransitions(): void;
    }

    declare interface TransitionsManagerConstructor{

        new(): TransitionsManagerInstance;
    }

    type TransitionsDataCollection<M> = {

        [x: string]: TransitionsData<M>
    }

    type TransitionsData<M> = {

        before?: M,
        after?: M,
        animDuration?: number
    }

    type TransitionWorkersQueue = QueueInstance<TransitionsBaseWorkerInstance>

    type TransitionsManagerRunArgs<M> = {

        queue: QueueInstance<TransitionsManagerQueueData<M>>,
        completeQueueDelay?: number,
        preStartDelay_ms?: number //a delay before all transitions begin
    }

    type TransitionsManagerQueueData<M> = {

        worker: TransitionsBaseWorkerInstance,
        data: TransitionsData<M>,
        nextPercentTrigger?: number, //Defaults to 1, which is 100%. What percentage we should move on to the next item in queue
    }
}