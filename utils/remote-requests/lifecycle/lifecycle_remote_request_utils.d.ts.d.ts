// Type definitions for StandardRemoteRequestUtils
// Project: Oats~i
// Definitions by: Ian Omondi <https://github.com/Ian-Cornelius>
// Definitions: null

declare module "LifecycleRemoteRequestUtils" {

    interface LifecycleRemoteRequestUtilsInstance extends StandardRemoteRequestUtils {


    }

    export interface LifecycleRemoteRequestUtilsConstructor implements StandardRemoteRequestUtilsConstructor{

        new(lifecycleObject: FragmentLifeCycleInstance): LifecycleRemoteRequestUtilsInstance;
    }
}