declare module "RouteParams" {

    type RouteParams = {

        params: {

            [x: string]: string
        },
        queries: {

            [x: string]: string
        },
        target: string,
        filteredUrl: FilteredURL
    }

    type FilteredURL = {

        baseUrl: string,
        query: string,
        target: string,
        fullUrl: string
    }
}