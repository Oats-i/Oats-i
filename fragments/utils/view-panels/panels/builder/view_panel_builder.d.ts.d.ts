declare module "ViewPanelBuilder" {

    declare interface ViewPanelBuilderInstance<T extends BaseViewPanelConstructorArgs, LD, HPD>{

        buildViewPanel(extConstructorArgs: ViewPanelConstructorArgs): ViewPanelInstance<LD, HPD>
    }

    declare interface ViewPanelBuilderConstructor<T extends BaseViewPanelConstructorArgs, LD, HPD>{

        new(viewPanel: ViewPanelConstructor<LD, HPD>, baseConstructorArgs: T): ViewPanelBuilderInstance<T, LD, HPD>
    }
}