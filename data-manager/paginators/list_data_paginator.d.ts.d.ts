import { DataManagerScopedAPIOptions, DataOperationMsg, DataOperationsNetworkInterface } from "DataManager";
import { RootViewRegistrationOptions } from "StandardViewManager";

export declare interface ListDataPaginatorInstance<MODEL, VIEW_MANAGER_SCOPE extends ArrayOnlyNestedKeys<MODEL>>{

    initOverrideNetworkInterface(): DataOperationsNetworkInterface<ValueTypeOfNested<MODEL, VIEW_MANAGER_SCOPE>, VIEW_MANAGER_SCOPE, MODEL>;
    setUpPaginationIntersector(): void;
    updatePaginationIntersectorOnDelete(deletedNode: Element): void;
    setSoleModelId(soleModelId: string): void;
    doPagination(): void;

    refreshList(overrideLoadAddr?: string): void;
    setPaginationComplete(completed: boolean): void;
}

export declare interface ListDataPaginatorConstructor<MODEL, VIEW_MANAGER_SCOPE extends ArrayOnlyNestedKeys<MODEL>>{

    new(args: ListDataPaginatorOptions<MODEL, VIEW_MANAGER_SCOPE>): ListDataPaginatorInstance<MODEL, VIEW_MANAGER_SCOPE>;
}

type BaseListDataPaginatorOptions<MODEL, VMS extends ArrayOnlyNestedKeys<MODEL>> = {

    enabled: boolean,
    serverSidePaginationEnd: boolean,
    networkInterface: DataOperationsNetworkInterface<ValueTypeOfNested<MODEL, VMS>, VMS, MODEL>,
    finalCallInterface: {

        onCompleteSuccess: (finalResult: DataOperationMsg<DataManagerPermittedBulkType<MODEL, VMS>, DataManagerPermittedBulkType<MODEL, VMS>, VMS>) => void,
        onCompleteFail: (err: *) => void
    },
    loadDataOptions: Pick<SendDataOptions, "autoCancelOnError">,
    triggerPos_ToLast?: number, //Default 6, not zero
    observerViewPort?: Element //Default is the parent view node of the list view manager
}

type ListDataPaginatorOptions<MODEL, VMS extends ArrayOnlyNestedKeys<MODEL>> = BaseListDataPaginatorOptions<MODEL, VMS> & {

    //These are passed directly by list or recycle view managers
    viewOptions: RootViewRegistrationOptions,
    dataManagerInstance: DataManagerInstance<MODEL>,
    listViewManagerInstance: ListViewManagerInstance<MODEL, VMS>,
    scope: VMS,
    soleModelId: string, //The modelId the list view manager is populating for
}