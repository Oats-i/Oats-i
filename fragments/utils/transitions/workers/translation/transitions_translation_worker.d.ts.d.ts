declare module "TransitionsTranslationWorker" {

    declare interface TransitionsTranslationWorkerInstance extends TransitionsBaseWorkerInstance{


    }

    declare interface TransitionsTranslationWorkerConstructor implements TransitionsBaseWorkerConstructor{

        get TRANSLATE_Y_PROPERTY(): string;
        get TRANSLATE_X_PROPERTY(): string;
    }

    type TransitionTranslationAnimationProperties = ViewAnimationProperties<{

        translateX: string,
        translateY: string
    }>
}