declare module "TransitionsBaseWorker"{

    declare interface TransitionsBaseWorkerInstance{

        //Members
        interpolator: BaseTransitionInterpolator;
        currentAnimationHandle: number;
        targetNode: Element;

        runViewTransition(transitionData: TransitionsData<{}>, progressCb: transitionsWorkerProgressCb): void;
        cancelViewTransition(): void; //Have in transitionsManager as well. Keeps list of running transitions unless complete. No timestamps here as all need to be synced to same build
    }

    declare interface TransitionsBaseWorkerConstructor{

        new(args: TransitionsBaseWorkerConstructorArgs): TransitionsBaseWorkerInstance;
        DataCollectionsModel: {}
        GetTargetViewCurrentProperties<T, P>(node: HTMLElement, attributes?: T): P
    }

    type TransitionsBaseWorkerConstructorArgs = {

        interpolator?: BaseTransitionInterpolator,
        node: Element
    }

    type BaseTransitionInterpolator = import("../../../../../../scripts/global/utils/animators/animation-framer/utils/interpolators/base_interpolator").default;

    type transitionsWorkerProgressCb = genericParamFunction<number>

    type ViewTransitionData = { //I think should be ViewTransitionData<T>: T with unique implementation per worker

        worker: TransitionsBaseWorkerInstance
        startValue: number; //The value the animation should start from
        endValue: number; //The value the animation should end
        animTime: number //The length of time this animation should run
        framesCallback: animFramesCallback; 
        animationEndCallback: genericFunction;
        stopCurrent: boolean; //Stop the currently running animation
    }

    type ViewAnimationProperties<T> = T;

    type onTransitionProgression = genericParamFunction<number>; //Use this to trigger queues at given percentage
}