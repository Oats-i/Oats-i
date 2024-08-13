declare module "Oats~i_Router_Types" {

    //Main navigational info for the app. Used by the app's root to handle navigation and state management by the app's state manager
    export type MainNavigationInfo = {

        selector: string //The selector of the navigational button or link, used to identify it
        baseActiveRoute: string  //The base route for which the nav btn should be active. / can catch-all, but overriden by explicitly defined extensions eg /blog
        defaultRoute: string //The route that should be opened when the nav btn is clicked (by default)
    }
}