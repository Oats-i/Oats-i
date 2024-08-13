const { default: Stack } = require("../stack/stack_adt");

/**
 * This ADT works like a stack, using LIFO order. However, an item can only exist once in the stack.
 * Therefore, pushing an existing item in the stack only moves it to the tos. 
 * New entries add to the stack and still go to tos
 */

/**
 * @extends Stack<i>
 * @template i
 */
class ExclusiveStack extends Stack{

    constructor(){

        super();
    }

    /**
     * 
     * @param {i} i 
     */
    push(i){

        //Find if such a record exists in the stack. If so, delete, put passed as tos
        //Using a linear search. Possible to update later for better time complexity for large stacks?
        for(let ref in this.myStack){

            if(this.myStack[ref] === i){

                delete this.myStack[ref];
                break;
            }
        }

        super.push(i);
    }
}

export default ExclusiveStack;