class ListReverser {

    /**
     * @template M
     * @param {M[]} list 
     * 
     * @returns {M[]}
     */
    static reverseList(list){

        let reversedList = [];
        for(let i = list.length - 1; i >= 0; i--){

            reversedList.push(list[i]);
        }

        return reversedList;
    }
}

export default ListReverser;