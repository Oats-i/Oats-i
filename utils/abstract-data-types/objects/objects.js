class ObjectsUtils{

    constructor(){}

    static copy(){

        return {

            json: (obj) => {

                return obj ? JSON.parse(JSON.stringify(obj)) : {};
            }
        }
    }
}

export default ObjectsUtils;