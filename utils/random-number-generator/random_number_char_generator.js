class RandomNumberCharGenUtils{

    /**
     * 
     * @param {number} size 
     * @returns {string}
     */
    static generateRandomNumChar(size){

        let id = "";
        const char_list = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < size; i++) {
            
            id += char_list.charAt(Math.floor(Math.random() * char_list.length));
        }
        
        return id;
    }

    /**
     * 
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    static generateRandomInteger(min, max){

        return Math.floor(Math.random() * (max - min)) + min;
    }
}

export default RandomNumberCharGenUtils;