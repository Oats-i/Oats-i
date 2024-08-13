declare module "AppFragmentBuilder" {

    //You're just a pipe to the main thing
    export declare interface AppShellAsyncChildFragmentInstance extends AppChildFragmentInstance{

        localPipelineWorker: AsyncShellLocalPipelineWorker;
    }

    export declare interface AppShellAsyncChildFragmentConstructor extends AppChildFragmentConstructor{

        new(args: AppShellAsyncFragmentConstructorArgs): AppShellAsyncChildFragmentInstance;
    }

    export declare interface AppShellAsyncMainFragmentInstance extends AppMainFragmentInstance{

        localPipelineWorker: AsyncShellLocalPipelineWorker;
    }

    export declare interface AppShellAsyncMainFragmentConstructor extends AppMainFragmentConstructor{

        new(args: AppShellAsyncFragmentConstructorArgs): AppShellAsyncMainFragmentInstance;
    }

    export declare interface AsyncShellLocalPipelineWorker extends LocalPipelineWorker {


    }

    export declare interface AsyncAppFragmentBuilderInstance extends AppFragmentBuilderInstance {

        fragment: AppShellAsyncMainFragmentConstructor | AppShellAsyncChildFragmentConstructor;
        getLoadedFragmentClass(fragment: AppMainFragmentConstructor | AppChildFragmentConstructor): void
    }

    export declare interface AsyncAppFragmentBuilderConstructor extends AppFragmentBuilderConstructor {

        new<F>(constructorArgs: AppShellAsyncFragmentConstructorArgs<F>): AsyncAppFragmentBuilderInstance;
    }

    export declare interface AppFragmentBuilderInstance{

        buildFragment(mainRouterInstance: MainRouter): AppMainFragmentInstance;
    }

    export declare interface AppFragmentBuilderConstructor{

        new(fragment: import("AppMainFragment").AppMainFragmentConstructor, constructorArgs: AppFragmentGlobalConstructorArgs): AppFragmentBuilderInstance;
    }

    type AppShellAsyncFragmentConstructorArgs<F extends ForFragment> = F extends "main" ? AppMainFragmentConstructorArgs & AppAsyncFragmentBuildOptions<F> : AppChildFragmentConstructorArgs & AppAsyncFragmentBuildOptions<F>;
    
    type AppAsyncFragmentBuildOptions<F extends ForFragment> = { 

        asyncOptions: {

            importCb: () => Promise<* | {default: AppMainFragmentConstructor}>,
            asyncLoadingUI: string,
            asyncErrorUI: string,
            forFragment: F //Mandatory. Help override correct shell
        }
    };

    type ForFragment = "main" | "child";
}