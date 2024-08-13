declare module "AppChildFragment" {

    export declare interface AppChildFragmentInstance extends AppMainFragmentInstance {

        mainRouter: MainRouter;
    }

    export declare interface AppChildFragmentConstructor extends AppMainFragmentConstructor {

        new(args: AppChildFragmentConstructorArgs): AppChildFragmentInstance
    }

    type AppChildFragmentConstructorArgs = AppMainFragmentConstructorArgs & {
        
        childFragmentID: string
    }
}